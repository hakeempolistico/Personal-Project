import Foundation
import AVFoundation
import Speech

// MARK: - Transcript Message Types

struct TranscriptMessage: Codable {
    let type: MessageType
    let transcript: String
    let isFinal: Bool
    let timestamp: String
    let confidence: Float?
    
    enum MessageType: String, Codable {
        case partial
        case final
        case start
        case stop
        case error
    }
}

// MARK: - Main Transcription Engine

class LivcapTranscriber {
    private let speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    
    private var lastFinalTranscript: String = ""
    private var partialBuffer: String = ""
    private var silenceTimer: Timer?
    private let silenceThreshold: TimeInterval = 2.0 // seconds of silence before finalizing
    
    init() {
        // Use en-US locale, supports on-device recognition
        self.speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        
        // Configure for on-device recognition when available
        speechRecognizer?.supportsOnDeviceRecognition = true
    }
    
    func requestPermissions(completion: @escaping (Bool, Bool) -> Void) {
        SFSpeechRecognizer.requestAuthorization { authStatus in
            DispatchQueue.main.async {
                switch authStatus {
                case .authorized:
                    AVAudioSession.sharedInstance().requestRecordPermission { granted in
                        DispatchQueue.main.async {
                            completion(true, granted)
                        }
                    }
                default:
                    completion(false, false)
                }
            }
        }
    }
    
    func start() throws {
        // Cancel any existing task
        recognitionTask?.cancel()
        recognitionTask = nil
        
        // Configure audio session
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        
        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        
        guard let recognitionRequest = recognitionRequest else {
            throw NSError(domain: "Livcap", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unable to create recognition request"])
        }
        
        // Configure for on-device recognition
        if #available(macOS 13.0, *) {
            recognitionRequest.requiresOnDeviceRecognition = true
        }
        recognitionRequest.shouldReportPartialResults = true
        
        // Configure audio input
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        
        // Install tap on audio engine
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }
        
        // Start recognition task
        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            self?.handleRecognitionResult(result: result, error: error)
        }
        
        // Start audio engine
        audioEngine.prepare()
        try audioEngine.start()
        
        // Broadcast start event
        emitMessage(type: .start, transcript: "Listening...", isFinal: false)
        
        print("[Livcap] Transcription started", terminator: "\n")
        fflush(stdout)
    }
    
    func stop() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionRequest = nil
        recognitionTask = nil
        silenceTimer?.invalidate()
        
        // Broadcast stop event
        emitMessage(type: .stop, transcript: "Stopped listening", isFinal: false)
        
        print("[Livcap] Transcription stopped", terminator: "\n")
        fflush(stdout)
    }
    
    private func handleRecognitionResult(result: SFSpeechRecognitionResult?, error: Error?) {
        if let error = error {
            print("[Livcap] Recognition error: \(error.localizedDescription)", terminator: "\n")
            fflush(stdout)
            emitMessage(type: .error, transcript: error.localizedDescription, isFinal: false)
            return
        }
        
        guard let result = result else { return }
        
        let transcription = result.bestTranscription.formattedString
        let isFinal = result.isFinal
        
        if isFinal {
            // Final transcript - broadcast immediately
            let finalText = result.bestTranscription.segments
                .map { $0.substring }
                .joined(separator: " ")
            
            emitMessage(type: .final, transcript: finalText, isFinal: true, confidence: result.bestTranscription.confidence)
            lastFinalTranscript = finalText
            partialBuffer = ""
            
            print("[Livcap] FINAL: \(finalText)", terminator: "\n")
            fflush(stdout)
        } else if !transcription.isEmpty {
            // Partial result - check for silence to determine if we should finalize early
            partialBuffer = transcription
            emitMessage(type: .partial, transcript: transcription, isFinal: false)
            
            // Check if there's enough silence to consider this finalized
            checkForSilence(transcription: transcription)
        }
    }
    
    private func checkForSilence(transcription: String) {
        // Reset silence timer
        silenceTimer?.invalidate()
        
        // If we have new content, wait for silence before finalizing
        if !transcription.isEmpty && transcription != lastFinalTranscript {
            silenceTimer = Timer.scheduledTimer(withTimeInterval: silenceThreshold, repeats: false) { [weak self] _ in
                guard let self = self else { return }
                
                // Force finalize if we've been silent for threshold
                // Only finalize if we have meaningful new content
                if self.partialBuffer != self.lastFinalTranscript && !self.partialBuffer.isEmpty {
                    self.emitMessage(type: .final, transcript: self.partialBuffer, isFinal: true)
                    self.lastFinalTranscript = self.partialBuffer
                    print("[Livcap] Force finalized due to silence: \(self.partialBuffer)", terminator: "\n")
                    fflush(stdout)
                }
            }
        }
    }
    
    private func emitMessage(type: TranscriptMessage.MessageType, transcript: String, isFinal: Bool, confidence: Float? = nil) {
        let message = TranscriptMessage(
            type: type,
            transcript: transcript,
            isFinal: isFinal,
            timestamp: ISO8601DateFormatter().string(from: Date()),
            confidence: confidence
        )
        
        guard let jsonData = try? JSONEncoder().encode(message),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            return
        }
        
        // Output JSON to stdout with a delimiter for easy parsing
        print("LIVCAP:\(jsonString)", terminator: "\n")
        fflush(stdout)
    }
}

// MARK: - CLI Entry Point

var transcriber: LivcapTranscriber?

func main() {
    print("[Livcap] Starting...", terminator: "\n")
    fflush(stdout)
    
    transcriber = LivcapTranscriber()
    
    guard let transcriber = transcriber else {
        print("[Livcap] ERROR: Failed to create transcriber", terminator: "\n")
        fflush(stdout)
        exit(1)
    }
    
    // Handle commands from stdin (from Node.js parent process)
    let inputHandle = FileHandle.standardInput
    inputHandle.readabilityHandler = { handle in
        let data = handle.availableData
        guard !data.isEmpty,
              let command = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) else {
            return
        }
        
        switch command {
        case "START":
            do {
                try transcriber.start()
            } catch {
                print("[Livcap] ERROR: Failed to start: \(error.localizedDescription)", terminator: "\n")
                fflush(stdout)
                exit(1)
            }
        case "STOP":
            transcriber.stop()
        case "EXIT":
            transcriber.stop()
            exit(0)
        default:
            print("[Livcap] Unknown command: \(command)", terminator: "\n")
            fflush(stdout)
        }
    }
    
    // Request permissions
    transcriber.requestPermissions { speechAuth, micAuth in
        if !speechAuth {
            print("[Livcap] ERROR: Speech recognition not authorized", terminator: "\n")
            print("[Livcap] Please enable in System Preferences > Privacy & Security > Speech Recognition", terminator: "\n")
            fflush(stdout)
            exit(1)
        }
        
        if !micAuth {
            print("[Livcap] ERROR: Microphone access not authorized", terminator: "\n")
            print("[Livcap] Please enable in System Preferences > Privacy & Security > Microphone", terminator: "\n")
            fflush(stdout)
            exit(1)
        }
        
        print("[Livcap] Permissions granted", terminator: "\n")
        fflush(stdout)
        
        // Auto-start transcription
        do {
            try transcriber.start()
        } catch {
            print("[Livcap] ERROR: Failed to start: \(error.localizedDescription)", terminator: "\n")
            fflush(stdout)
            exit(1)
        }
        
        // Run loop
        RunLoop.main.run()
    }
    
    // Handle termination signals
    signal(SIGINT) { _ in
        print("\n[Livcap] Shutting down...", terminator: "\n")
        fflush(stdout)
        transcriber?.stop()
        exit(0)
    }
    
    signal(SIGTERM) { _ in
        print("\n[Livcap] Received SIGTERM, shutting down...", terminator: "\n")
        fflush(stdout)
        transcriber?.stop()
        exit(0)
    }
    
    // Block forever
    dispatchMain()
}
