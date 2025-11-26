import Foundation
import AVFoundation
import React

@objc(AudioRecorder)
class AudioRecorder: RCTEventEmitter, AVAudioPlayerDelegate {

  private var pcmRecorder: PCMRecorder?
  private var currentState: RecorderState = .idle
  private var hasListeners = false
  private var audioPlayer: AVAudioPlayer?
  private var audioState: AudioState = .idle

  // MARK: - RCTEventEmitter

  override func supportedEvents() -> [String]! {
    return ["audioData", "stateChange", "error"]
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // MARK: - Permission Methods

  @objc
  func checkPermission(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    let status = AVAudioSession.sharedInstance().recordPermission

    let permissionStatus: String
    switch status {
    case .granted:
      permissionStatus = "granted"
    case .denied:
      permissionStatus = "denied"
    case .undetermined:
      permissionStatus = "undetermined"
    @unknown default:
      permissionStatus = "undetermined"
    }

    resolve(permissionStatus)
  }

  @objc
  func requestPermission(_ resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    AVAudioSession.sharedInstance().requestRecordPermission { granted in
      resolve(granted ? "granted" : "denied")
    }
  }

  // MARK: - Recording Methods

  @objc
  func startRecording(_ config: NSDictionary,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Validate permission
    guard AVAudioSession.sharedInstance().recordPermission == .granted else {
      reject("PERMISSION_DENIED", "Microphone permission not granted", nil)
      return
    }

    // Validate state
    guard currentState == .idle || currentState == .stopped else {
      reject("INVALID_STATE", "Already recording", nil)
      return
    }

    // Parse config
    let sampleRate = config["sampleRate"] as? Double ?? 16000.0
    let channels = config["channels"] as? Int ?? 1
    let chunkSize = config["chunkSize"] as? Int ?? 1024
    let outputPath = config["outputPath"] as? String

    do {
      setState(.preparing)

      // Configure audio session
      let audioSession = AVAudioSession.sharedInstance()
      try audioSession.setCategory(.playAndRecord, mode: .measurement)
      try audioSession.setActive(true)

      // Create recorder config
      let recorderConfig = RecorderConfig(
        sampleRate: sampleRate,
        channels: channels,
        chunkSize: chunkSize,
        outputPath: outputPath
      )

      // Initialize recorder
      pcmRecorder = PCMRecorder(config: recorderConfig)
      pcmRecorder?.delegate = self

      // Start recording
      try pcmRecorder?.start()

      setState(.recording)
      resolve(nil)

    } catch {
      setState(.error)
      reject("START_FAILED", "Failed to start recording: \(error.localizedDescription)", error)
    }
  }

  @objc
  func stopRecording(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard currentState == .recording else {
      reject("INVALID_STATE", "Not recording", nil)
      return
    }

    setState(.stopping)

    pcmRecorder?.stop { [weak self] result in
      guard let self = self else { return }

      switch result {
      case .success(let recordingResult):
        self.setState(.stopped)
        resolve([
          "tmpFileUri": "file://\(recordingResult.filePath)",
          "durationMs": recordingResult.durationMs,
          "fileSizeBytes": recordingResult.fileSizeBytes,
          "sampleRate": recordingResult.sampleRate,
          "channels": recordingResult.channels
        ])

      case .failure(let error):
        self.setState(.error)
        reject("STOP_FAILED", error.localizedDescription, error)
      }
    }
  }

  @objc
  func cancelRecording(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    pcmRecorder?.cancel()
    setState(.stopped)
    resolve(nil)
  }

  @objc
  func getRecorderState(_ resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(currentState.rawValue)
  }

  @objc
  func getDuration(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    let duration = pcmRecorder?.currentDuration ?? 0
    resolve(duration)
  }

  @objc
  func getAudioState(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(audioState.rawValue)
  }

  @objc
  func stopAudioFile(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if let player = self.audioPlayer {
        if player.isPlaying {
          player.stop()
        }
        self.audioPlayer = nil
      }
      self.setAudioState(.idle)
      resolve(nil)
    }
  }

  @objc
  func playAudioFile(_ uri: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard !uri.isEmpty, let url = URL(string: uri) else {
      reject("INVALID_URI", "Audio file URI is required", nil)
      return
    }

    if url.isFileURL {
      playLocalFile(url, resolver: resolve, rejecter: reject)
    } else if let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" {
      downloadAndPlay(url, resolver: resolve, rejecter: reject)
    } else {
      reject("UNSUPPORTED_SCHEME", "Only file://, http://, or https:// URIs are supported", nil)
    }
  }

  // MARK: - Private Helpers

  private func playLocalFile(_ url: URL,
                             resolver resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
    let path = url.path
    guard FileManager.default.fileExists(atPath: path) else {
      reject("FILE_NOT_FOUND", "Audio file not found at path: \(path)", nil)
      return
    }

    do {
      try AVAudioSession.sharedInstance().setCategory(.playAndRecord, mode: .default)
      try AVAudioSession.sharedInstance().setActive(true)

      audioPlayer?.stop()
      setAudioState(.idle)

      audioPlayer = try AVAudioPlayer(contentsOf: url)
      audioPlayer?.delegate = self
      audioPlayer?.prepareToPlay()

      let durationMs = Int((audioPlayer?.duration ?? 0) * 1000)
      audioPlayer?.play()
      setAudioState(.playing)

      resolve(["durationMs": durationMs])
    } catch {
      setAudioState(.idle)
      reject("PLAYBACK_ERROR", "Failed to play audio: \(error.localizedDescription)", error)
    }
  }

  private func downloadAndPlay(_ remoteURL: URL,
                               resolver resolve: @escaping RCTPromiseResolveBlock,
                               rejecter reject: @escaping RCTPromiseRejectBlock) {
    let tempFile = FileManager.default.temporaryDirectory.appendingPathComponent("\(UUID().uuidString)_\(remoteURL.lastPathComponent)")

    let task = URLSession.shared.downloadTask(with: remoteURL) { [weak self] location, _, error in
      guard let self = self else { return }

      if let error = error {
        reject("DOWNLOAD_FAILED", "Failed to download audio file: \(error.localizedDescription)", error)
        return
      }

      guard let location = location else {
        reject("DOWNLOAD_FAILED", "Download location is unavailable", nil)
        return
      }

      do {
        if FileManager.default.fileExists(atPath: tempFile.path) {
          try FileManager.default.removeItem(at: tempFile)
        }
        try FileManager.default.moveItem(at: location, to: tempFile)
      } catch {
        reject("DOWNLOAD_FAILED", "Failed to save downloaded audio: \(error.localizedDescription)", error)
        return
      }

      DispatchQueue.main.async {
        self.playLocalFile(tempFile, resolver: resolve, rejecter: reject)
      }
    }

    task.resume()
  }

  private func setState(_ newState: RecorderState) {
    let oldState = currentState
    currentState = newState

    if hasListeners {
      sendEvent(withName: "stateChange", body: [
        "oldState": oldState.rawValue,
        "newState": newState.rawValue
      ])
    }
  }

  private func setAudioState(_ newState: AudioState) {
    audioState = newState
  }
}

// MARK: - PCMRecorderDelegate

extension AudioRecorder: PCMRecorderDelegate {
  func recorder(_ recorder: PCMRecorder, didReceiveChunk chunk: AudioChunk) {
    guard hasListeners else { return }

    // Convert Int16Array to JS-compatible format
    let dataArray = Array(UnsafeBufferPointer(start: chunk.data, count: chunk.dataLength))

    sendEvent(withName: "audioData", body: [
      "chunk": [
        "data": dataArray,
        "timestampMs": chunk.timestampMs,
        "sequenceNumber": chunk.sequenceNumber
      ]
    ])
  }

  func recorder(_ recorder: PCMRecorder, didEncounterError error: Error) {
    setState(.error)

    if hasListeners {
      sendEvent(withName: "error", body: [
        "error": [
          "code": "RECORDING_ERROR",
          "message": error.localizedDescription
        ]
      ])
    }
  }
}

// MARK: - AVAudioPlayerDelegate

extension AudioRecorder {
  func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
    if audioPlayer === player {
      setAudioState(.idle)
      audioPlayer = nil
    }
  }

  func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
    if audioPlayer === player {
      setAudioState(.idle)
      audioPlayer = nil
    }
  }
}

enum RecorderState: String {
  case idle
  case preparing
  case recording
  case stopping
  case stopped
  case error
}

enum AudioState: String {
  case playing
  case idle
}
