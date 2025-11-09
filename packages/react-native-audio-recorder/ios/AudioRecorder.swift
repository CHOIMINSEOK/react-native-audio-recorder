import Foundation
import AVFoundation
import React

enum RecorderState: String {
  case idle
  case preparing
  case recording
  case paused
  case stopping
  case stopped
  case error
}

@objc(AudioRecorder)
class AudioRecorder: RCTEventEmitter {

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
      reject("INVALID_STATE", "\(currentState.rawValue)", nil)
      return
    }

    setState(.preparing)

    // TODO: Phase 2 - Implement actual recording
    // For now, just acknowledge the request
    setState(.recording)
    resolve(nil)
  }

  @objc
  func pauseRecording(_ resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard currentState == .recording else {
      reject("INVALID_STATE", "Not recording", nil)
      return
    }

    // TODO: Phase 2 - Implement pause
    setState(.paused)
    resolve(nil)
  }

  @objc
  func resumeRecording(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard currentState == .paused else {
      reject("INVALID_STATE", "Not paused", nil)
      return
    }

    // TODO: Phase 2 - Implement resume
    setState(.recording)
    resolve(nil)
  }

  @objc
  func stopRecording(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard currentState == .recording || currentState == .paused else {
      reject("INVALID_STATE", "Not recording", nil)
      return
    }

    setState(.stopping)

    // TODO: Phase 2 - Implement stop and file saving
    // For now, return a mock result
    setState(.stopped)
    resolve([
      "filePath": "/tmp/mock_recording.wav",
      "durationMs": 0,
      "fileSizeBytes": 0,
      "sampleRate": 16000,
      "channels": 1
    ])
  }

  @objc
  func cancelRecording(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    // TODO: Phase 2 - Implement cancel
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
    // TODO: Phase 2 - Return actual duration
    resolve(0)
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
