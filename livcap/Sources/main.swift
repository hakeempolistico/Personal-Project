import Foundation
import AVFoundation
import Speech
import ScreenCaptureKit

// MARK: - Transcript Message Types

struct TranscriptMessage: Codable {
    let type: MessageType
    let transcript: String
    let isFinal: Bool
    let timestamp: String
    
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
    private var stream: SCStream?
    
    private var lastFinalTranscript: String = ""
    private var partialBuffer: String = ""
    private var silenceTimer: Timer?
    private let silenceThreshold: TimeInterval = 2.0
    
    init() {
        self.speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        speechRecognizer?.supportsOnDeviceRecognition = true
    }
    
    func requestPermissions(completion: @escaping (Bool, Bool) -> Void) {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            SFSpeechRecognizer.requestAuthorization { authStatus in
                DispatchQueue.main.async {
                    completion(authStatus == .authorized, true)
                }
            }
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .audio) { granted in
                if granted {
                    SFSpeechRecognizer.requestAuthorization { authStatus in
                        DispatchQueue.main.async {
                            completion(authStatus == .authorized, true)
                        }
                    }
                } else {
                    DispatchQueue.main.async { completion(false, false) }
                }
            }
        default:
            completion(false, false)
        }
    }
    
    func start() throws {
        recognitionTask?.cancel()
        recognitionTask = nil
        
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            throw NSError(domain: "Livcap", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unable to create recognition request"])
        }
        
        if #available(macOS 13.0, *) {
            recognitionRequest.requiresOnDeviceRecognition = true
        }
        recognitionRequest.shouldReportPartialResults = true
        
        // Start system audio capture
        if #available(macOS 13.0, *) {
            startSystemAudioCapture(recognitionRequest: recognitionRequest)
        } else {
            startMicrophoneCapture(recognitionRequest: recognitionRequest)
        }
        
        // Start recognition task
        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            self?.handleRecognitionResult(result: result, error: error)
        }
        
        print("[Livcap] Transcription started (capturing system audio)", terminator: "\n")
        fflush(stdout)
        emitMessage(type: .start, transcript: "Listening to system audio...", isFinal: false)
    }
    
    @available(macOS 13.0, *)
    private func startSystemAudioCapture(recognitionRequest: SFSpeechAudioBufferRecognitionRequest) {
        Task {
            do {
                let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
                
                guard let display = content.displays.first else {
                    print("[Livcap] No display found, using microphone", terminator: "\n")
                    fflush(stdout)
                    await MainActor.run {
                        self.startMicrophoneCapture(recognitionRequest: recognitionRequest)
                    }
                    return
                }
                
                let config = SCStreamConfiguration()
                config.capturesAudio = true
                config.excludesCurrentProcessAudio = false
                config.sampleRate = 44100
                config.channelCount = 1
                
                let filter = SCContentFilter(display: display, excludingWindows: [])
                self.stream = SCStream(filter: filter, configuration: config, delegate: nil)
                
                guard let stream = self.stream else { return }
                
                let audioHandler = AudioStreamOutputHandler(recognitionRequest: recognitionRequest)
                try stream.addStreamOutput(audioHandler, type: .audio, sampleHandlerQueue: DispatchQueue(label: "audio"))
                
                try await stream.startCapture()
                print("[Livcap] System audio capture started", terminator: "\n")
                fflush(stdout)
                
            } catch {
                print("[Livcap] System audio error: \(error.localizedDescription), using microphone", terminator: "\n")
                fflush(stdout)
                await MainActor.run {
                    self.startMicrophoneCapture(recognitionRequest: recognitionRequest)
                }
            }
        }
    }
    
    private func startMicrophoneCapture(recognitionRequest: SFSpeechAudioBufferRecognitionRequest) {
        do {
            let inputNode = audioEngine.inputNode
            let recordingFormat = inputNode.outputFormat(forBus: 0)
            
            inputNode.installTap(onBus: 0, bufferSize: 4096, format: recordingFormat) { [weak self] buffer, _ in
                self?.recognitionRequest?.append(buffer)
            }
            
            audioEngine.prepare()
            try audioEngine.start()
            print("[Livcap] Using microphone input", terminator: "\n")
            fflush(stdout)
        } catch {
            print("[Livcap] Microphone capture failed: \(error.localizedDescription)", terminator: "\n")
            fflush(stdout)
        }
    }
    
    func stop() {
        Task {
            if #available(macOS 13.0, *) {
                try? await stream?.stopCapture()
            }
        }
        
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionRequest = nil
        recognitionTask = nil
        silenceTimer?.invalidate()
        
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
            let finalText = result.bestTranscription.segments.map { $0.substring }.joined(separator: " ")
            emitMessage(type: .final, transcript: finalText, isFinal: true)
            lastFinalTranscript = finalText
            partialBuffer = ""
            print("[Livcap] FINAL: \(finalText)", terminator: "\n")
            fflush(stdout)
        } else if !transcription.isEmpty {
            partialBuffer = transcription
            emitMessage(type: .partial, transcript: transcription, isFinal: false)
            checkForSilence(transcription: transcription)
        }
    }
    
    private func checkForSilence(transcription: String) {
        silenceTimer?.invalidate()
        
        if !transcription.isEmpty && transcription != lastFinalTranscript {
            silenceTimer = Timer.scheduledTimer(withTimeInterval: silenceThreshold, repeats: false) { [weak self] _ in
                guard let self = self else { return }
                if self.partialBuffer != self.lastFinalTranscript && !self.partialBuffer.isEmpty {
                    self.emitMessage(type: .final, transcript: self.partialBuffer, isFinal: true)
                    self.lastFinalTranscript = self.partialBuffer
                }
            }
        }
    }
    
    private func emitMessage(type: TranscriptMessage.MessageType, transcript: String, isFinal: Bool) {
        let message = TranscriptMessage(
            type: type,
            transcript: transcript,
            isFinal: isFinal,
            timestamp: ISO8601DateFormatter().string(from: Date())
        )
        
        guard let jsonData = try? JSONEncoder().encode(message),
              let jsonString = String(data: jsonData, encoding: .utf8) else { return }
        
        print("LIVCAP:\(jsonString)", terminator: "\n")
        fflush(stdout)
    }
}

// MARK: - SCStream Output Handler

@available(macOS 13.0, *)
class AudioStreamOutputHandler: NSObject, SCStreamOutput {
    private weak var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    
    init(recognitionRequest: SFSpeechAudioBufferRecognitionRequest) {
        self.recognitionRequest = recognitionRequest
        super.init()
    }
    
    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .audio else { return }
        guard let request = recognitionRequest else { return }
        
        let frameCount = CMSampleBufferGetNumSamples(sampleBuffer)
        guard frameCount > 0 else { return }
        
        var targetFormat = AudioStreamBasicDescription(
            mSampleRate: 16000,
            mFormatID: kAudioFormatLinearPCM,
            mFormatFlags: kAudioFormatFlagIsFloat | kAudioFormatFlagIsPacked,
            mBytesPerPacket: 4,
            mFramesPerPacket: 1,
            mBytesPerFrame: 4,
            mChannelsPerFrame: 1,
            mBitsPerChannel: 32,
            mReserved: 0
        )
        
        guard let format = AVAudioFormat(streamDescription: &targetFormat) else { return }
        guard let pcmBuffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(frameCount)) else { return }
        pcmBuffer.frameLength = AVAudioFrameCount(frameCount)
        
        guard let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else { return }
        
        var length = 0
        var dataPointer: UnsafeMutablePointer<Int8>?
        CMBlockBufferGetDataPointer(blockBuffer, atOffset: 0, lengthAtOffsetOut: nil, totalLengthOut: &length, dataPointerOut: &dataPointer)
        
        guard let data = dataPointer, let floatData = pcmBuffer.floatChannelData?[0] else { return }
        memcpy(floatData, data, min(length, frameCount * 4))
        
        request.append(pcmBuffer)
    }
}

// MARK: - Signal Handling

private var gTranscriber: LivcapTranscriber?

private func handleSignal(_ signal: Int32) {
    print("\n[Livcap] Shutting down...", terminator: "\n")
    fflush(stdout)
    gTranscriber?.stop()
    exit(0)
}

// MARK: - CLI Entry Point

func main() {
    print("[Livcap] Starting...", terminator: "\n")
    fflush(stdout)
    
    let transcriber = LivcapTranscriber()
    gTranscriber = transcriber
    
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
                print("[Livcap] ERROR: \(error.localizedDescription)", terminator: "\n")
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
    
    transcriber.requestPermissions { speechAuth, micAuth in
        if !speechAuth {
            print("[Livcap] ERROR: Speech recognition not authorized", terminator: "\n")
            print("[Livcap] Enable in System Settings > Privacy & Security > Speech Recognition", terminator: "\n")
            fflush(stdout)
            exit(1)
        }
        
        if !micAuth {
            print("[Livcap] ERROR: Microphone not authorized", terminator: "\n")
            print("[Livcap] Enable in System Settings > Privacy & Security > Microphone", terminator: "\n")
            fflush(stdout)
            exit(1)
        }
        
        print("[Livcap] Permissions granted", terminator: "\n")
        fflush(stdout)
        
        do {
            try transcriber.start()
        } catch {
            print("[Livcap] ERROR: \(error.localizedDescription)", terminator: "\n")
            fflush(stdout)
            exit(1)
        }
        
        RunLoop.main.run()
    }
    
    signal(SIGINT, handleSignal)
    signal(SIGTERM, handleSignal)
    
    dispatchMain()
}
