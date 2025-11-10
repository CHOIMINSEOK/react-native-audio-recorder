import Foundation
import AVFoundation
import React

@objc(AudioRecorder)
class AudioRecorder: RCTEventEmitter {

  private var pcmRecorder: PCMRecorder?
  private var currentState: RecorderState = .idle
  private var hasListeners = false

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
      try audioSession.setCategory(.record, mode: .measurement)
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
          "filePath": recordingResult.filePath,
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
  func getState(_ resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(currentState.rawValue)
  }

  @objc
  func getDuration(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    let duration = pcmRecorder?.currentDuration ?? 0
    resolve(duration)
  }

  // MARK: - Private Helpers

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

enum RecorderState: String {
  case idle
  case preparing
  case recording
  case stopping
  case stopped
  case error
}
