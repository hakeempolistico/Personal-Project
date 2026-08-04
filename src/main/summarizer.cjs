const log = require('electron-log')
const { spawn } = require('child_process')

class Summarizer {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434'
    this.model = 'llama3.2'
    this.isAvailable = null
    this.checkingPromise = null
  }

  async checkOllamaAvailable() {
    if (this.checkingPromise) {
      return this.checkingPromise
    }

    this.checkingPromise = (async () => {
      try {
        const response = await fetch(`${this.ollamaUrl}/api/tags`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })

        if (response.ok) {
          const data = await response.json()
          const hasModel = data.models?.some(m => m.name.startsWith(this.model))
          
          if (hasModel) {
            log.info('Ollama is available with', this.model)
            this.isAvailable = true
          } else {
            log.warn('Ollama available but model not found:', this.model)
            this.isAvailable = false
          }
        } else {
          log.warn('Ollama responded with status:', response.status)
          this.isAvailable = false
        }
      } catch (error) {
        log.warn('Ollama not available:', error.message)
        this.isAvailable = false
      }
      
      this.checkingPromise = null
      return this.isAvailable
    })()

    return this.checkingPromise
  }

  async summarize(transcript, speakerName = 'Speaker') {
    const available = await this.checkOllamaAvailable()
    
    if (!available) {
      log.warn('Ollama not available, skipping summary')
      return null
    }

    if (!transcript || transcript.trim().length < 20) {
      return null
    }

    log.info(`Generating summary for ${speakerName}...`)

    const prompt = `You are a meeting assistant. Summarize the following speech transcript into key bullet points.

Speaker: ${speakerName}
Transcript: "${transcript}"

Provide a concise summary with:
- Main topics discussed
- Key decisions or conclusions
- Any action items mentioned

Keep it to 3-5 bullet points. Be concise and capture the essence.`

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 256
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama responded with ${response.status}`)
      }

      const data = await response.json()
      const summary = data.response?.trim()
      
      log.info(`Summary generated for ${speakerName}`)
      return summary
    } catch (error) {
      log.error('Failed to generate summary:', error)
      return null
    }
  }

  async generateMeetingSummary(allTranscripts) {
    const available = await this.checkOllamaAvailable()
    
    if (!available) {
      return null
    }

    if (!allTranscripts || allTranscripts.length === 0) {
      return null
    }

    log.info('Generating full meeting summary...')

    const formattedTranscript = allTranscripts.map(t => 
      `[${t.speaker}]: ${t.text}`
    ).join('\n')

    const prompt = `You are a meeting assistant. Create a comprehensive summary of this meeting transcript.

Transcript:
${formattedTranscript}

Provide:
1. Meeting Overview (2-3 sentences)
2. Key Discussion Points
3. Decisions Made
4. Action Items (if any)
5. Next Steps

Be thorough but concise.`

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 512
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama responded with ${response.status}`)
      }

      const data = await response.json()
      const summary = data.response?.trim()
      
      log.info('Meeting summary generated')
      return summary
    } catch (error) {
      log.error('Failed to generate meeting summary:', error)
      return null
    }
  }
}

module.exports = { Summarizer }
