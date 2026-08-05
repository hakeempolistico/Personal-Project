const { spawn, ChildProcess } = require('child_process')
const path = require('path')
const fs = require('fs')
const { WebSocketServer, WebSocket } = require('ws')
const log = require('electron-log')

// MARK: - Types (for documentation)
/**
 * @typedef {Object} TranscriptMessage
 * @property {'partial'|'final'|'start'|'stop'|'error'} type
 * @property {string} transcript
 * @property {boolean} isFinal
 * @property {string} timestamp
 * @property {number|null} confidence
 */

/**
 * @typedef {Object} SummaryMessage
 * @property {'summary'|'action'|'decision'} type
 * @property {string} content
 * @property {string} speaker
 */

// MARK: - Livcap Server

class LivcapServer {
    constructor(options = {}) {
        this.port = options.port || 8766
        this.livcapPath = options.livcapPath || this.findLivcapBinary()
        this.ollamaUrl = options.ollamaUrl || 'http://localhost:11434'
        this.summaryModel = options.summaryModel || 'llama3.2:latest'
        
        this.livcapProcess = null
        this.wss = null
        this.clients = new Set()
        
        // Transcript state
        this.isListening = false
        this.transcriptBuffer = []
        this.partialTranscript = ''
        this.lastSummaryTime = 0
        this.summaryCooldown = 3000 // ms between summaries
        
        // Speaker tracking
        this.speakerCounter = 0
        this.lastSpeakerTime = Date.now()
        this.currentSpeaker = 'Speaker 1'
        this.silenceThreshold = 15000 // 15 seconds = new speaker
    }
    
    findLivcapBinary() {
        const possiblePaths = [
            path.join(__dirname, '../../../livcap/.build/release/livcap'),
            path.join(__dirname, '../../livcap/.build/release/livcap'),
            path.join(process.env.HOME, 'livcap/.build/release/livcap'),
            '/usr/local/bin/livcap'
        ]
        
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                log.info(`[LivcapServer] Found Livcap at: ${p}`)
                return p
            }
        }
        
        log.warn('[LivcapServer] Livcap binary not found, will use default path')
        return possiblePaths[0]
    }
    
    // MARK: - Server Control
    
    start() {
        return new Promise((resolve, reject) => {
            // Start WebSocket server
            this.wss = new WebSocketServer({ port: this.port })
            
            this.wss.on('connection', (ws) => {
                log.info('[LivcapServer] Client connected')
                this.clients.add(ws)
                
                // Send current state to new client
                if (this.transcriptBuffer.length > 0) {
                    ws.send(JSON.stringify({
                        type: 'sync',
                        transcripts: this.transcriptBuffer
                    }))
                }
                
                ws.on('message', (message) => {
                    this.handleClientMessage(message)
                })
                
                ws.on('close', () => {
                    log.info('[LivcapServer] Client disconnected')
                    this.clients.delete(ws)
                })
                
                ws.on('error', (error) => {
                    log.error('[LivcapServer] Client error:', error)
                    this.clients.delete(ws)
                })
            })
            
            this.wss.on('listening', () => {
                log.info(`[LivcapServer] WebSocket server started on port ${this.port}`)
                this.startLivcapProcess()
                resolve()
            })
            
            this.wss.on('error', (error) => {
                log.error('[LivcapServer] WebSocket server error:', error)
                reject(error)
            })
        })
    }
    
    stop() {
        return new Promise((resolve) => {
            log.info('[LivcapServer] Stopping...')
            
            // Stop Livcap process
            if (this.livcapProcess) {
                this.livcapProcess.stdin.write('EXIT\n')
                setTimeout(() => {
                    if (this.livcapProcess) {
                        this.livcapProcess.kill('SIGTERM')
                        this.livcapProcess = null
                    }
                }, 1000)
            }
            
            // Close WebSocket connections
            for (const client of this.clients) {
                client.close()
            }
            this.clients.clear()
            
            // Close server
            if (this.wss) {
                this.wss.close(() => {
                    log.info('[LivcapServer] Stopped')
                    resolve()
                })
            } else {
                resolve()
            }
        })
    }
    
    // MARK: - Livcap Process Management
    
    startLivcapProcess() {
        if (this.livcapProcess) {
            log.warn('[LivcapServer] Livcap process already running')
            return
        }
        
        if (!fs.existsSync(this.livcapPath)) {
            log.error(`[LivcapServer] Livcap binary not found at: ${this.livcapPath}`)
            this.broadcast({
                type: 'error',
                message: `Livcap binary not found. Please build it from livcap/Sources/main.swift`
            })
            return
        }
        
        log.info(`[LivcapServer] Starting Livcap process: ${this.livcapPath}`)
        
        this.livcapProcess = spawn(this.livcapPath, [], {
            stdio: ['pipe', 'pipe', 'pipe']
        })
        
        let buffer = ''
        
        this.livcapProcess.stdout.on('data', (data) => {
            buffer += data.toString()
            
            // Process complete lines
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            
            for (const line of lines) {
                if (line.startsWith('LIVCAP:')) {
                    const jsonStr = line.substring(7)
                    try {
                        const message = JSON.parse(jsonStr)
                        this.handleLivcapMessage(message)
                    } catch (e) {
                        log.error('[LivcapServer] Failed to parse Livcap message:', e)
                    }
                } else if (line.trim()) {
                    // Log non-JSON output (like [Livcap] status messages)
                    log.info(`[Livcap] ${line}`)
                }
            }
        })
        
        this.livcapProcess.stderr.on('data', (data) => {
            log.warn(`[Livcap stderr]: ${data.toString().trim()}`)
        })
        
        this.livcapProcess.on('close', (code) => {
            log.info(`[LivcapServer] Livcap process exited with code ${code}`)
            this.livcapProcess = null
            this.isListening = false
        })
        
        this.livcapProcess.on('error', (error) => {
            log.error('[LivcapServer] Livcap process error:', error)
            this.broadcast({
                type: 'error',
                message: `Livcap error: ${error.message}`
            })
        })
    }
    
    handleLivcapMessage(message) {
        log.info(`[LivcapServer] Received: ${message.type} - "${message.transcript}"`)
        
        switch (message.type) {
            case 'start':
                this.isListening = true
                this.broadcast({
                    type: 'status',
                    status: 'listening',
                    message: 'Listening for speech...'
                })
                break
                
            case 'stop':
                this.isListening = false
                this.broadcast({
                    type: 'status',
                    status: 'stopped',
                    message: 'Stopped listening'
                })
                break
                
            case 'partial':
                this.partialTranscript = message.transcript
                this.broadcast({
                    type: 'partial',
                    transcript: message.transcript
                })
                break
                
            case 'final':
                this.handleFinalTranscript(message)
                break
                
            case 'error':
                log.error(`[LivcapServer] Livcap error: ${message.transcript}`)
                this.broadcast({
                    type: 'error',
                    message: message.transcript
                })
                break
        }
    }
    
    handleFinalTranscript(message) {
        const transcript = message.transcript.trim()
        if (!transcript) return
        
        // Check for speaker change
        const now = Date.now()
        if (now - this.lastSpeakerTime > this.silenceThreshold) {
            this.speakerCounter++
            this.currentSpeaker = `Speaker ${this.speakerCounter + 1}`
            log.info(`[LivcapServer] Speaker changed to: ${this.currentSpeaker}`)
        }
        this.lastSpeakerTime = now
        
        // Add to transcript buffer
        const entry = {
            id: Date.now().toString(),
            speaker: this.currentSpeaker,
            text: transcript,
            timestamp: new Date().toISOString()
        }
        this.transcriptBuffer.push(entry)
        
        // Clear partial
        this.partialTranscript = ''
        
        // Broadcast final transcript
        this.broadcast({
            type: 'transcript',
            ...entry
        })
        
        // Trigger summary (with cooldown)
        if (now - this.lastSummaryTime >= this.summaryCooldown) {
            this.generateSummary()
            this.lastSummaryTime = now
        }
    }
    
    // MARK: - Ollama Integration
    
    async generateSummary() {
        if (this.transcriptBuffer.length === 0) return
        
        const recentTranscripts = this.transcriptBuffer
            .slice(-5) // Last 5 entries
            .map(t => `${t.speaker}: ${t.text}`)
            .join('\n')
        
        const prompt = `Based on this meeting transcript, provide a brief summary and any action items or decisions:\n\n${recentTranscripts}\n\nRespond in this format:\nSUMMARY: <brief summary>\nACTION_ITEMS: <any action items or decisions, or "None">`
        
        try {
            const response = await fetch(`${this.ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.summaryModel,
                    prompt: prompt,
                    stream: false
                })
            })
            
            if (!response.ok) {
                throw new Error(`Ollama returned ${response.status}`)
            }
            
            const data = await response.json()
            const responseText = data.response || ''
            
            // Parse response
            const summaryMatch = responseText.match(/SUMMARY:\s*(.+?)(?:\n|$)/i)
            const actionsMatch = responseText.match(/ACTION_ITEMS:\s*(.+?)(?:\n|$)/i)
            
            const summary = summaryMatch ? summaryMatch[1].trim() : responseText.trim()
            const actionItems = actionsMatch ? actionsMatch[1].trim() : null
            
            this.broadcast({
                type: 'summary',
                summary: summary,
                actionItems: actionItems,
                speaker: this.currentSpeaker,
                timestamp: new Date().toISOString()
            })
            
            log.info('[LivcapServer] Generated summary:', summary.substring(0, 100))
            
        } catch (error) {
            log.error('[LivcapServer] Failed to generate summary:', error)
            // Don't broadcast error to UI, just log it
        }
    }
    
    // MARK: - Client Communication
    
    handleClientMessage(message) {
        try {
            const data = JSON.parse(message)
            
            switch (data.type) {
                case 'command':
                    if (data.command === 'start' && this.livcapProcess) {
                        this.livcapProcess.stdin.write('START\n')
                    } else if (data.command === 'stop' && this.livcapProcess) {
                        this.livcapProcess.stdin.write('STOP\n')
                    }
                    break
                    
                case 'get-transcripts':
                    // Client requesting full transcript
                    this.broadcast({
                        type: 'sync',
                        transcripts: this.transcriptBuffer
                    })
                    break
            }
        } catch (e) {
            log.error('[LivcapServer] Failed to parse client message:', e)
        }
    }
    
    broadcast(message) {
        const json = JSON.stringify(message)
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(json)
            }
        }
    }
    
    // MARK: - State Getters
    
    getStatus() {
        return {
            listening: this.isListening,
            transcriptCount: this.transcriptBuffer.length,
            currentSpeaker: this.currentSpeaker
        }
    }
}

module.exports = { LivcapServer }
