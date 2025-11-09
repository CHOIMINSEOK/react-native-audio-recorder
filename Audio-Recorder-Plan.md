# Audio Recorder Library Plan

## 1. Project Overview

Build a production-ready React Native audio recorder library that provides:

- **Real-time PCM streaming**: Emit audio chunks during recording for live transcription
- **File persistence**: Save complete recording as WAV file to disk
- **Low latency**: Optimized for real-time speech-to-text use cases
- **Cross-platform**: Native implementations for iOS (Swift) and Android (Kotlin)
- **Dual architecture**: Supports both React Native old architecture (Bridge) and new architecture (TurboModules/Fabric)

### Package Name

`@choiminseok/react-native-audio-recorder`

### Repository Structure

**Monorepo** with library and example app for integrated testing:

```
react-native-audio-recorder/              # Root
├── packages/
│   └── react-native-audio-recorder/     # Library package
└── apps/
    └── example/                          # Example/test app
```

---

## 2. Requirements & Goals

### Functional Requirements

- ✅ Capture microphone audio in PCM format (Int16)
- ✅ Stream audio chunks in real-time via events
- ✅ Save complete recording to WAV file on disk
- ✅ Configurable sample rate (8000, 16000, 44100, 48000 Hz)
- ✅ Configurable channels (mono/stereo)
- ✅ Low-latency operation (<100ms chunk delivery)
- ✅ Proper permission handling (microphone access)
- ✅ Pause/resume capability
- ✅ Clean resource management (no memory leaks)

### Non-Functional Requirements

- ✅ TypeScript-first API design
- ✅ Minimal dependencies (native only)
- ✅ Well-documented code and usage examples
- ✅ Comprehensive error handling
- ✅ iOS 13.0+ and Android API 21+ support
- ✅ React Native 0.81.5+
- ✅ Backward compatible with Bridge. Don't use TurboModules.

### Out of Scope (Future)

- Audio playback (use react-native-sound or similar)
- Audio format conversion (MP3, AAC, etc.) - WAV only for v1
- Audio effects (noise reduction, echo cancellation)
- Background recording (requires additional permissions)

---

## 3. API Design (TypeScript)

### Core Module Interface

````typescript
// src/index.ts

export enum RecorderState {
  IDLE = 'idle',
  PREPARING = 'preparing',
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error',
}

export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  UNDETERMINED = 'undetermined',
  RESTRICTED = 'restricted', // iOS only
}

export interface RecorderConfig {
  /**
   * Sample rate in Hz
   * @default 16000
   * @supported 8000, 16000, 44100, 48000
   */
  sampleRate?: number;

  /**
   * Number of audio channels
   * @default 1 (mono)
   * @supported 1 (mono), 2 (stereo)
   */
  channels?: 1 | 2;

  /**
   * Chunk size in samples (affects latency)
   * @default 1024
   * @note Lower = lower latency, higher CPU usage
   */
  chunkSize?: number;

  /**
   * Audio source (Android only)
   * @default 'voiceRecognition'
   * @platform android
   */
  audioSource?: 'default' | 'mic' | 'voiceRecognition' | 'voiceCommunication';

  /**
   * Output file path (optional)
   * If not provided, generates temp file in cache directory
   */
  outputPath?: string;
}

export interface AudioChunk {
  /**
   * PCM audio data as Int16Array
   */
  data: Int16Array;

  /**
   * Timestamp in milliseconds since recording started
   */
  timestampMs: number;

  /**
   * Chunk sequence number (starts at 0)
   */
  sequenceNumber: number;
}

export interface RecordingResult {
  /**
   * Absolute path to saved WAV file
   */
  filePath: string;

  /**
   * Recording duration in milliseconds
   */
  durationMs: number;

  /**
   * File size in bytes
   */
  fileSizeBytes: number;

  /**
   * Sample rate used
   */
  sampleRate: number;

  /**
   * Number of channels
   */
  channels: number;
}

export interface RecorderError {
  code: string;
  message: string;
  nativeError?: any;
}

// Event types
export type AudioDataEvent = {
  chunk: AudioChunk;
};

export type StateChangeEvent = {
  oldState: RecorderState;
  newState: RecorderState;
};

export type ErrorEvent = {
  error: RecorderError;
};

/**
 * Custom Audio Recorder for React Native
 *
 * Provides real-time PCM audio streaming and file persistence.
 *
 * @example
 * ```typescript
 * import AudioRecorder from '@choiminseok/react-native-audio-recorder';
 *
 * // Check permissions
 * const status = await AudioRecorder.checkPermission();
 * if (status !== 'granted') {
 *   await AudioRecorder.requestPermission();
 * }
 *
 * // Subscribe to audio chunks
 * const subscription = AudioRecorder.addListener('audioData', (event) => {
 *   console.log('Received chunk:', event.chunk.data.length, 'samples');
 * });
 *
 * // Start recording
 * await AudioRecorder.startRecording({
 *   sampleRate: 16000,
 *   channels: 1,
 *   chunkSize: 1024,
 * });
 *
 * // Stop and get file
 * const result = await AudioRecorder.stopRecording();
 * console.log('Saved to:', result.filePath);
 *
 * // Cleanup
 * subscription.remove();
 * ```
 */
export default class AudioRecorder {
  /**
   * Check current microphone permission status
   */
  static checkPermission(): Promise<PermissionStatus>;

  /**
   * Request microphone permission from user
   */
  static requestPermission(): Promise<PermissionStatus>;

  /**
   * Start audio recording with given configuration
   *
   * @throws {Error} If permission not granted
   * @throws {Error} If already recording
   */
  static startRecording(config?: RecorderConfig): Promise<void>;

  /**
   * Pause recording (can be resumed)
   */
  static pauseRecording(): Promise<void>;

  /**
   * Resume paused recording
   */
  static resumeRecording(): Promise<void>;

  /**
   * Stop recording and save file
   *
   * @returns Recording result with file path and metadata
   */
  static stopRecording(): Promise<RecordingResult>;

  /**
   * Cancel recording without saving file
   */
  static cancelRecording(): Promise<void>;

  /**
   * Get current recorder state
   */
  static getState(): Promise<RecorderState>;

  /**
   * Get current recording duration in milliseconds
   * Returns 0 if not recording
   */
  static getDuration(): Promise<number>;

  /**
   * Add event listener
   *
   * @param event Event name
   * @param listener Callback function
   * @returns Subscription object with remove() method
   */
  static addListener(
    event: 'audioData',
    listener: (event: AudioDataEvent) => void,
  ): EmitterSubscription;

  static addListener(
    event: 'stateChange',
    listener: (event: StateChangeEvent) => void,
  ): EmitterSubscription;

  static addListener(
    event: 'error',
    listener: (event: ErrorEvent) => void,
  ): EmitterSubscription;

  /**
   * Remove specific listener
   */
  static removeListener(
    event: string,
    listener: (...args: any[]) => void,
  ): void;

  /**
   * Remove all listeners for an event
   */
  static removeAllListeners(event?: string): void;
}

// Helper types
export interface EmitterSubscription {
  remove(): void;
}
````


## 4. iOS Native Implementation (Swift)

### File Structure

```
ios/
├── AudioRecorder.swift              # Main module
├── AudioRecorder.m                  # Objective-C bridge
├── PCMRecorder.swift               # Core recording logic
├── WAVFileWriter.swift             # WAV file writing
└── AudioRecorder-Bridging-Header.h  # Bridging header
```

### Implementation Details

#### 4.1 Main Module (`AudioRecorder.swift`)

```swift
import AVFoundation
import React

@objc(AudioRecorder)
class AudioRecorder: RCTEventEmitter {

  private var pcmRecorder: PCMRecorder?
  private var recordingConfig: RecorderConfig?
  private var currentState: RecorderState = .idle

  // MARK: - RCTEventEmitter

  override func supportedEvents() -> [String]! {
    return ["audioData", "stateChange", "error"]
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
      reject("START_FAILED", "Failed to start recording: \(error.localizedDescription)", error)
    }
  }

  @objc
  func pauseRecording(_ resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard currentState == .recording else {
      reject("INVALID_STATE", "Not recording", nil)
      return
    }

    pcmRecorder?.pause()
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

    pcmRecorder?.resume()
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

    sendEvent(withName: "stateChange", body: [
      "oldState": oldState.rawValue,
      "newState": newState.rawValue
    ])
  }
}

// MARK: - PCMRecorderDelegate

extension AudioRecorder: PCMRecorderDelegate {
  func recorder(_ recorder: PCMRecorder, didReceiveChunk chunk: AudioChunk) {
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

    sendEvent(withName: "error", body: [
      "error": [
        "code": "RECORDING_ERROR",
        "message": error.localizedDescription
      ]
    ])
  }
}
```

#### 4.2 Core Recorder (`PCMRecorder.swift`)

```swift
import AVFoundation

protocol PCMRecorderDelegate: AnyObject {
  func recorder(_ recorder: PCMRecorder, didReceiveChunk chunk: AudioChunk)
  func recorder(_ recorder: PCMRecorder, didEncounterError error: Error)
}

class PCMRecorder {

  weak var delegate: PCMRecorderDelegate?

  private let config: RecorderConfig
  private var audioEngine: AVAudioEngine?
  private var inputNode: AVAudioInputNode?
  private var fileWriter: WAVFileWriter?

  private var startTime: Date?
  private var sequenceNumber: Int = 0
  private var isPaused: Bool = false

  var currentDuration: Int {
    guard let startTime = startTime else { return 0 }
    return Int(Date().timeIntervalSince(startTime) * 1000)
  }

  init(config: RecorderConfig) {
    self.config = config
  }

  func start() throws {
    // Initialize audio engine
    audioEngine = AVAudioEngine()
    inputNode = audioEngine!.inputNode

    // Configure format
    let format = AVAudioFormat(
      commonFormat: .pcmFormatInt16,
      sampleRate: config.sampleRate,
      channels: AVAudioChannelCount(config.channels),
      interleaved: true
    )!

    // Initialize file writer
    let outputPath = config.outputPath ?? generateTempFilePath()
    fileWriter = try WAVFileWriter(
      filePath: outputPath,
      sampleRate: config.sampleRate,
      channels: config.channels
    )

    // Install tap for real-time streaming
    inputNode!.installTap(
      onBus: 0,
      bufferSize: AVAudioFrameCount(config.chunkSize),
      format: format
    ) { [weak self] buffer, time in
      self?.processAudioBuffer(buffer, time: time)
    }

    // Start engine
    try audioEngine!.start()

    startTime = Date()
    sequenceNumber = 0
    isPaused = false
  }

  func pause() {
    isPaused = true
  }

  func resume() {
    isPaused = false
  }

  func stop(completion: @escaping (Result<RecordingResult, Error>) -> Void) {
    audioEngine?.stop()
    inputNode?.removeTap(onBus: 0)

    do {
      let result = try fileWriter?.finalize()
      completion(.success(result!))
    } catch {
      completion(.failure(error))
    }

    cleanup()
  }

  func cancel() {
    audioEngine?.stop()
    inputNode?.removeTap(onBus: 0)
    fileWriter?.cancel()
    cleanup()
  }

  private func processAudioBuffer(_ buffer: AVAudioPCMBuffer, time: AVAudioTime) {
    guard !isPaused else { return }

    // Convert to Int16
    let frameLength = Int(buffer.frameLength)
    let channels = Int(buffer.format.channelCount)

    guard let int16Data = buffer.int16ChannelData else { return }
    let samples = int16Data[0]

    // Write to file
    fileWriter?.write(samples: samples, count: frameLength * channels)

    // Emit chunk to JS
    let chunk = AudioChunk(
      data: samples,
      dataLength: frameLength * channels,
      timestampMs: currentDuration,
      sequenceNumber: sequenceNumber
    )

    delegate?.recorder(self, didReceiveChunk: chunk)
    sequenceNumber += 1
  }

  private func cleanup() {
    audioEngine = nil
    inputNode = nil
    fileWriter = nil
    startTime = nil
  }

  private func generateTempFilePath() -> String {
    let timestamp = Int(Date().timeIntervalSince1970)
    let fileName = "recording_\(timestamp).wav"
    let tempDir = NSTemporaryDirectory()
    return (tempDir as NSString).appendingPathComponent(fileName)
  }
}

struct AudioChunk {
  let data: UnsafeMutablePointer<Int16>
  let dataLength: Int
  let timestampMs: Int
  let sequenceNumber: Int
}

struct RecorderConfig {
  let sampleRate: Double
  let channels: Int
  let chunkSize: Int
  let outputPath: String?
}

enum RecorderState: String {
  case idle
  case preparing
  case recording
  case paused
  case stopping
  case stopped
  case error
}

struct RecordingResult {
  let filePath: String
  let durationMs: Int
  let fileSizeBytes: Int
  let sampleRate: Double
  let channels: Int
}
```

#### 4.3 WAV File Writer (`WAVFileWriter.swift`)

```swift
import Foundation

class WAVFileWriter {

  private let filePath: String
  private let sampleRate: Double
  private let channels: Int

  private var fileHandle: FileHandle?
  private var totalSamplesWritten: Int = 0

  init(filePath: String, sampleRate: Double, channels: Int) throws {
    self.filePath = filePath
    self.sampleRate = sampleRate
    self.channels = channels

    // Create file
    FileManager.default.createFile(atPath: filePath, contents: nil)

    // Open file handle
    fileHandle = try FileHandle(forWritingTo: URL(fileURLWithPath: filePath))

    // Write WAV header (placeholder, will update on finalize)
    try writeWAVHeader(dataSize: 0)
  }

  func write(samples: UnsafeMutablePointer<Int16>, count: Int) {
    guard let fileHandle = fileHandle else { return }

    let data = Data(bytes: samples, count: count * MemoryLayout<Int16>.size)
    fileHandle.write(data)

    totalSamplesWritten += count
  }

  func finalize() throws -> RecordingResult {
    guard let fileHandle = fileHandle else {
      throw NSError(domain: "WAVFileWriter", code: -1, userInfo: [
        NSLocalizedDescriptionKey: "File handle is nil"
      ])
    }

    // Update header with correct data size
    try fileHandle.seek(toOffset: 0)
    let dataSize = totalSamplesWritten * MemoryLayout<Int16>.size
    try writeWAVHeader(dataSize: dataSize)

    // Close file
    try fileHandle.close()
    self.fileHandle = nil

    // Get file size
    let attributes = try FileManager.default.attributesOfItem(atPath: filePath)
    let fileSize = attributes[.size] as! Int

    // Calculate duration
    let durationSeconds = Double(totalSamplesWritten) / (sampleRate * Double(channels))
    let durationMs = Int(durationSeconds * 1000)

    return RecordingResult(
      filePath: filePath,
      durationMs: durationMs,
      fileSizeBytes: fileSize,
      sampleRate: sampleRate,
      channels: channels
    )
  }

  func cancel() {
    try? fileHandle?.close()
    try? FileManager.default.removeItem(atPath: filePath)
  }

  private func writeWAVHeader(dataSize: Int) throws {
    var header = Data()

    // RIFF chunk
    header.append("RIFF".data(using: .ascii)!)
    header.append(UInt32(36 + dataSize).littleEndian.data)
    header.append("WAVE".data(using: .ascii)!)

    // fmt chunk
    header.append("fmt ".data(using: .ascii)!)
    header.append(UInt32(16).littleEndian.data) // Chunk size
    header.append(UInt16(1).littleEndian.data)  // Audio format (PCM)
    header.append(UInt16(channels).littleEndian.data)
    header.append(UInt32(sampleRate).littleEndian.data)

    let byteRate = Int(sampleRate) * channels * 2 // 16-bit = 2 bytes
    header.append(UInt32(byteRate).littleEndian.data)

    let blockAlign = channels * 2
    header.append(UInt16(blockAlign).littleEndian.data)
    header.append(UInt16(16).littleEndian.data) // Bits per sample

    // data chunk
    header.append("data".data(using: .ascii)!)
    header.append(UInt32(dataSize).littleEndian.data)

    fileHandle?.write(header)
  }
}

extension FixedWidthInteger {
  var data: Data {
    var value = self
    return Data(bytes: &value, count: MemoryLayout<Self>.size)
  }
}
```

---

## 5. Android Native Implementation (Kotlin)

### File Structure

```
android/src/main/java/com/choiminseok/audiorecorder/
├── AudioRecorderModule.kt       # Main module
├── AudioRecorderPackage.kt      # Package registration
├── PCMRecorder.kt              # Core recording logic
├── WAVFileWriter.kt            # WAV file writing
└── Models.kt                   # Data classes
```

### Implementation Details

#### 5.1 Main Module (`AudioRecorderModule.kt`)

```kotlin
package com.choiminseok.audiorecorder

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class AudioRecorderModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var pcmRecorder: PCMRecorder? = null
    private var currentState = RecorderState.IDLE

    override fun getName(): String = "AudioRecorder"

    // MARK: - Permission Methods

    @ReactMethod
    fun checkPermission(promise: Promise) {
        val status = when {
            ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED -> "granted"
            else -> "denied"
        }
        promise.resolve(status)
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        val currentActivity = currentActivity
        if (currentActivity == null) {
            promise.reject("NO_ACTIVITY", "No current activity")
            return
        }

        ActivityCompat.requestPermissions(
            currentActivity,
            arrayOf(Manifest.permission.RECORD_AUDIO),
            PERMISSION_REQUEST_CODE
        )

        // Store promise for callback
        permissionPromise = promise
    }

    // MARK: - Recording Methods

    @ReactMethod
    fun startRecording(config: ReadableMap, promise: Promise) {
        // Check permission
        if (ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.RECORD_AUDIO
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            promise.reject("PERMISSION_DENIED", "Microphone permission not granted")
            return
        }

        // Check state
        if (currentState != RecorderState.IDLE && currentState != RecorderState.STOPPED) {
            promise.reject("INVALID_STATE", "Already recording")
            return
        }

        try {
            // Parse config
            val sampleRate = config.getInt("sampleRate").takeIf { it > 0 } ?: 16000
            val channels = config.getInt("channels").takeIf { it > 0 } ?: 1
            val chunkSize = config.getInt("chunkSize").takeIf { it > 0 } ?: 1024
            val outputPath = config.getString("outputPath")
            val audioSource = config.getString("audioSource") ?: "voiceRecognition"

            val recorderConfig = RecorderConfig(
                sampleRate = sampleRate,
                channels = channels,
                chunkSize = chunkSize,
                audioSource = parseAudioSource(audioSource),
                outputPath = outputPath
            )

            // Create recorder
            pcmRecorder = PCMRecorder(
                context = reactApplicationContext,
                config = recorderConfig,
                onChunk = ::handleAudioChunk,
                onError = ::handleError
            )

            // Start recording
            pcmRecorder?.start()

            setState(RecorderState.RECORDING)
            promise.resolve(null)

        } catch (e: Exception) {
            promise.reject("START_FAILED", "Failed to start recording: ${e.message}", e)
        }
    }

    @ReactMethod
    fun pauseRecording(promise: Promise) {
        if (currentState != RecorderState.RECORDING) {
            promise.reject("INVALID_STATE", "Not recording")
            return
        }

        pcmRecorder?.pause()
        setState(RecorderState.PAUSED)
        promise.resolve(null)
    }

    @ReactMethod
    fun resumeRecording(promise: Promise) {
        if (currentState != RecorderState.PAUSED) {
            promise.reject("INVALID_STATE", "Not paused")
            return
        }

        pcmRecorder?.resume()
        setState(RecorderState.RECORDING)
        promise.resolve(null)
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        if (currentState != RecorderState.RECORDING && currentState != RecorderState.PAUSED) {
            promise.reject("INVALID_STATE", "Not recording")
            return
        }

        setState(RecorderState.STOPPING)

        try {
            val result = pcmRecorder?.stop()
            setState(RecorderState.STOPPED)

            if (result != null) {
                val resultMap = Arguments.createMap().apply {
                    putString("filePath", result.filePath)
                    putInt("durationMs", result.durationMs)
                    putInt("fileSizeBytes", result.fileSizeBytes)
                    putInt("sampleRate", result.sampleRate)
                    putInt("channels", result.channels)
                }
                promise.resolve(resultMap)
            } else {
                promise.reject("STOP_FAILED", "Failed to stop recording")
            }

        } catch (e: Exception) {
            setState(RecorderState.ERROR)
            promise.reject("STOP_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun cancelRecording(promise: Promise) {
        pcmRecorder?.cancel()
        setState(RecorderState.STOPPED)
        promise.resolve(null)
    }

    @ReactMethod
    fun getState(promise: Promise) {
        promise.resolve(currentState.value)
    }

    @ReactMethod
    fun getDuration(promise: Promise) {
        val duration = pcmRecorder?.currentDuration ?: 0
        promise.resolve(duration)
    }

    // MARK: - Private Helpers

    private fun setState(newState: RecorderState) {
        val oldState = currentState
        currentState = newState

        sendEvent("stateChange", Arguments.createMap().apply {
            putString("oldState", oldState.value)
            putString("newState", newState.value)
        })
    }

    private fun handleAudioChunk(chunk: AudioChunk) {
        val chunkMap = Arguments.createMap().apply {
            putArray("data", Arguments.fromArray(chunk.data.toTypedArray()))
            putInt("timestampMs", chunk.timestampMs)
            putInt("sequenceNumber", chunk.sequenceNumber)
        }

        sendEvent("audioData", Arguments.createMap().apply {
            putMap("chunk", chunkMap)
        })
    }

    private fun handleError(error: Exception) {
        setState(RecorderState.ERROR)

        sendEvent("error", Arguments.createMap().apply {
            putMap("error", Arguments.createMap().apply {
                putString("code", "RECORDING_ERROR")
                putString("message", error.message ?: "Unknown error")
            })
        })
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun parseAudioSource(source: String): Int {
        return when (source) {
            "default" -> android.media.MediaRecorder.AudioSource.DEFAULT
            "mic" -> android.media.MediaRecorder.AudioSource.MIC
            "voiceRecognition" -> android.media.MediaRecorder.AudioSource.VOICE_RECOGNITION
            "voiceCommunication" -> android.media.MediaRecorder.AudioSource.VOICE_COMMUNICATION
            else -> android.media.MediaRecorder.AudioSource.VOICE_RECOGNITION
        }
    }

    companion object {
        private const val PERMISSION_REQUEST_CODE = 1001
        private var permissionPromise: Promise? = null
    }
}
```

#### 5.2 Core Recorder (`PCMRecorder.kt`)

```kotlin
package com.choiminseok.audiorecorder

import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

class PCMRecorder(
    private val context: Context,
    private val config: RecorderConfig,
    private val onChunk: (AudioChunk) -> Unit,
    private val onError: (Exception) -> Unit
) {

    private var audioRecord: AudioRecord? = null
    private var recordingThread: Thread? = null
    private var fileWriter: WAVFileWriter? = null

    private val isRecording = AtomicBoolean(false)
    private val isPaused = AtomicBoolean(false)

    private var startTimeMs: Long = 0
    private var sequenceNumber: Int = 0

    val currentDuration: Int
        get() = if (startTimeMs > 0) {
            (System.currentTimeMillis() - startTimeMs).toInt()
        } else {
            0
        }

    fun start() {
        if (isRecording.get()) {
            throw IllegalStateException("Already recording")
        }

        // Calculate buffer size
        val channelConfig = if (config.channels == 1) {
            AudioFormat.CHANNEL_IN_MONO
        } else {
            AudioFormat.CHANNEL_IN_STEREO
        }

        val audioFormat = AudioFormat.ENCODING_PCM_16BIT

        val minBufferSize = AudioRecord.getMinBufferSize(
            config.sampleRate,
            channelConfig,
            audioFormat
        )

        val bufferSize = maxOf(minBufferSize, config.chunkSize * 2)

        // Create AudioRecord
        audioRecord = AudioRecord(
            config.audioSource,
            config.sampleRate,
            channelConfig,
            audioFormat,
            bufferSize
        )

        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            throw IllegalStateException("Failed to initialize AudioRecord")
        }

        // Initialize file writer
        val outputPath = config.outputPath ?: generateTempFilePath()
        fileWriter = WAVFileWriter(
            filePath = outputPath,
            sampleRate = config.sampleRate,
            channels = config.channels
        )

        // Start recording
        audioRecord?.startRecording()
        isRecording.set(true)
        isPaused.set(false)
        startTimeMs = System.currentTimeMillis()
        sequenceNumber = 0

        // Start recording thread
        recordingThread = Thread {
            recordingLoop()
        }.apply {
            priority = Thread.MAX_PRIORITY
            start()
        }
    }

    fun pause() {
        isPaused.set(true)
    }

    fun resume() {
        isPaused.set(false)
    }

    fun stop(): RecordingResult? {
        isRecording.set(false)

        // Wait for recording thread to finish
        recordingThread?.join(1000)
        recordingThread = null

        // Stop AudioRecord
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null

        // Finalize file
        return fileWriter?.finalize()
    }

    fun cancel() {
        isRecording.set(false)

        recordingThread?.join(1000)
        recordingThread = null

        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null

        fileWriter?.cancel()
    }

    private fun recordingLoop() {
        val buffer = ShortArray(config.chunkSize)

        while (isRecording.get()) {
            try {
                val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0

                if (read > 0 && !isPaused.get()) {
                    // Write to file
                    fileWriter?.write(buffer, read)

                    // Emit chunk
                    val chunk = AudioChunk(
                        data = buffer.copyOf(read),
                        timestampMs = currentDuration,
                        sequenceNumber = sequenceNumber
                    )

                    onChunk(chunk)
                    sequenceNumber++
                }

            } catch (e: Exception) {
                onError(e)
                break
            }
        }
    }

    private fun generateTempFilePath(): String {
        val timestamp = System.currentTimeMillis()
        val fileName = "recording_$timestamp.wav"
        val cacheDir = context.cacheDir
        return File(cacheDir, fileName).absolutePath
    }
}
```

#### 5.3 Models (`Models.kt`)

```kotlin
package com.choiminseok.audiorecorder

data class RecorderConfig(
    val sampleRate: Int,
    val channels: Int,
    val chunkSize: Int,
    val audioSource: Int,
    val outputPath: String?
)

data class AudioChunk(
    val data: ShortArray,
    val timestampMs: Int,
    val sequenceNumber: Int
)

data class RecordingResult(
    val filePath: String,
    val durationMs: Int,
    val fileSizeBytes: Int,
    val sampleRate: Int,
    val channels: Int
)

enum class RecorderState(val value: String) {
    IDLE("idle"),
    PREPARING("preparing"),
    RECORDING("recording"),
    PAUSED("paused"),
    STOPPING("stopping"),
    STOPPED("stopped"),
    ERROR("error")
}
```

---

## 6. Error Handling Strategy

### Error Codes

```typescript
export enum ErrorCode {
  // Permission errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PERMISSION_RESTRICTED = 'PERMISSION_RESTRICTED',

  // State errors
  INVALID_STATE = 'INVALID_STATE',
  ALREADY_RECORDING = 'ALREADY_RECORDING',

  // Hardware errors
  AUDIO_HARDWARE_UNAVAILABLE = 'AUDIO_HARDWARE_UNAVAILABLE',
  AUDIO_SESSION_FAILED = 'AUDIO_SESSION_FAILED',

  // File errors
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  FILE_PATH_INVALID = 'FILE_PATH_INVALID',
  DISK_FULL = 'DISK_FULL',

  // Recording errors
  START_FAILED = 'START_FAILED',
  STOP_FAILED = 'STOP_FAILED',
  RECORDING_ERROR = 'RECORDING_ERROR',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

### Error Handling Guidelines

1. **Always validate state** before operations
2. **Provide descriptive error messages** with context
3. **Clean up resources** on error (stop recording, close files)
4. **Emit error events** for async errors during recording
5. **Log native errors** for debugging

---

## 7. Testing Strategy

### Unit Tests

- ✅ Config validation
- ✅ Permission checking logic
- ✅ State transitions
- ✅ WAV file header generation

### Integration Tests

- ✅ iOS: AVAudioEngine setup and teardown
- ✅ Android: AudioRecord lifecycle
- ✅ File writing and finalization
- ✅ Real-time chunk emission

### E2E Tests (React Native)

- ✅ Start recording → receive chunks → stop → verify file
- ✅ Pause/resume functionality
- ✅ Cancel without file creation
- ✅ Permission request flow
- ✅ Multiple record sessions
- ✅ Memory leak detection

### Manual Testing Checklist

- [ ] Test on iOS 13, 14, 15, 16, 17
- [ ] Test on Android API 21, 23, 26, 29, 33, 34
- [ ] Test different sample rates (8000, 16000, 44100, 48000)
- [ ] Test mono and stereo
- [ ] Test with different chunk sizes (512, 1024, 2048)
- [ ] Test background/foreground transitions
- [ ] Test with phone calls (interruption handling)
- [ ] Test with Bluetooth headphones
- [ ] Test with wired headphones
- [ ] Test low disk space scenarios
- [ ] Test permission denial recovery

---

## 8. Monorepo Structure

### Root Configuration

```
react-native-audio-recorder/                    # Root monorepo
├── packages/
│   └── react-native-audio-recorder/           # Library package
│       ├── android/
│       │   ├── build.gradle
│       │   └── src/main/java/com/choiminseok/audiorecorder/
│       │       ├── AudioRecorderModule.kt
│       │       ├── AudioRecorderPackage.kt
│       │       ├── PCMRecorder.kt
│       │       ├── WAVFileWriter.kt
│       │       └── Models.kt
│       ├── ios/
│       │   ├── AudioRecorder.swift
│       │   ├── AudioRecorder.mm           # Obj-C++ bridge (new arch)
│       │   ├── AudioRecorder.xcodeproj
│       │   ├── PCMRecorder.swift
│       │   ├── WAVFileWriter.swift
│       │   └── AudioRecorder-Bridging-Header.h
│       ├── src/
│       │   ├── index.ts                   # Main exports
│       │   ├── NativeAudioRecorder.ts     # TurboModule spec
│       │   ├── AudioRecorder.ts           # TypeScript wrapper
│       │   ├── types.ts                   # Type definitions
│       │   └── utils.ts                   # Helpers
│       ├── __tests__/
│       │   ├── AudioRecorder.test.ts
│       │   └── integration/
│       ├── docs/
│       │   ├── API.md
│       │   ├── TROUBLESHOOTING.md
│       │   └── EXAMPLES.md
│       ├── AudioRecorder.podspec     # iOS CocoaPods spec
│       ├── package.json               # Library package.json
│       ├── tsconfig.json
│       └── README.md
│
├── apps/
│   └── example/                      # Example React Native app
│       ├── android/
│       │   ├── app/
│       │   │   ├── build.gradle
│       │   │   └── src/main/
│       │   ├── build.gradle
│       │   └── settings.gradle
│       ├── ios/
│       │   ├── ExampleApp/
│       │   ├── ExampleApp.xcodeproj
│       │   ├── ExampleApp.xcworkspace
│       │   └── Podfile
│       ├── src/
│       │   ├── App.tsx
│       │   └── screens/
│       │       ├── RecorderExample.tsx
│       │       ├── PermissionExample.tsx
│       │       └── PlaybackExample.tsx
│       ├── package.json              # Example app package.json
│       ├── metro.config.js
│       ├── babel.config.js
│       └── tsconfig.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # CI/CD pipeline
│       └── publish.yml               # NPM publish workflow
│
├── package.json                      # Root package.json (workspaces)
├── yarn.lock                         # Or package-lock.json
├── tsconfig.base.json                # Shared TypeScript config
├── .eslintrc.js                      # Shared ESLint config
├── .prettierrc                       # Shared Prettier config
├── .gitignore
├── LICENSE
└── README.md                         # Repository README
```

### Root `package.json` (Workspaces)

```json
{
  "name": "@choiminseok/react-native-audio-recorder-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "build": "yarn workspace @choiminseok/react-native-audio-recorder build",
    "test": "yarn workspace @choiminseok/react-native-audio-recorder test",
    "lint": "eslint \"packages/**/*.{ts,tsx}\" \"apps/**/*.{ts,tsx}\"",
    "typecheck": "yarn workspaces run typecheck",
    "example:ios": "yarn workspace example ios",
    "example:android": "yarn workspace example android",
    "pod-install": "cd apps/example/ios && pod install",
    "prepare": "husky install"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "eslint-config-prettier": "^9.0.0",
    "prettier": "^3.0.0",
    "husky": "^8.0.0",
    "lint-staged": "^14.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "yarn": ">=3.0.0"
  }
}
```

### Library `package.json`

```json
{
  "name": "@choiminseok/react-native-audio-recorder",
  "version": "1.0.0",
  "description": "Real-time PCM audio recorder for React Native with streaming and file persistence",
  "main": "lib/commonjs/index",
  "module": "lib/module/index",
  "types": "lib/typescript/index.d.ts",
  "react-native": "src/index",
  "source": "src/index",
  "files": [
    "src",
    "lib",
    "android",
    "ios",
    "cpp",
    "*.podspec",
    "!lib/typescript/example",
    "!ios/build",
    "!android/build",
    "!android/gradle",
    "!android/gradlew",
    "!android/gradlew.bat",
    "!**/__tests__",
    "!**/__fixtures__",
    "!**/__mocks__"
  ],
  "scripts": {
    "test": "jest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint \"**/*.{js,ts,tsx}\"",
    "prepare": "bob build",
    "release": "release-it"
  },
  "keywords": [
    "react-native",
    "ios",
    "android",
    "audio",
    "recorder",
    "pcm",
    "wav",
    "streaming",
    "real-time",
    "speech-to-text",
    "microphone"
  ],
  "repository": "https://github.com/@choiminseok/react-native-audio-recorder",
  "author": "CHOIMINSEOK <your-email@example.com>",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/@choiminseok/react-native-audio-recorder/issues"
  },
  "homepage": "https://github.com/@choiminseok/react-native-audio-recorder#readme",
  "publishConfig": {
    "registry": "https://registry.npmjs.org/"
  },
  "devDependencies": {
    "@react-native/eslint-config": "^0.81.5",
    "@types/jest": "^29.5.0",
    "@types/react": "^19.1.0",
    "jest": "^29.5.0",
    "react": "18.3.1",
    "react-native": "0.81.5",
    "react-native-builder-bob": "^0.30.0",
    "typescript": "^5.8.3"
  },
  "peerDependencies": {
    "react": ">=19.1.0",
    "react-native": ">=0.81.5"
  },
  "codegenConfig": {
    "name": "AudioRecorderSpec",
    "type": "modules",
    "jsSrcsDir": "src",
    "android": {
      "javaPackageName": "com.choiminseok.audiorecorder"
    }
  },
  "react-native-builder-bob": {
    "source": "src",
    "output": "lib",
    "targets": [
      "commonjs",
      "module",
      [
        "typescript",
        {
          "project": "tsconfig.build.json"
        }
      ]
    ]
  }
}
```

### Example App `package.json`

```json
{
  "name": "example",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "start": "react-native start",
    "test": "jest",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "18.3.1",
    "react-native": "0.81.5",
    "@choiminseok/react-native-audio-recorder": "*"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@babel/preset-env": "^7.25.3",
    "@babel/runtime": "^7.25.0",
    "@react-native/babel-preset": "^0.81.5",
    "@react-native/eslint-config": "^0.81.5",
    "@react-native/metro-config": "^0.81.5",
    "@react-native/typescript-config": "^0.81.5",
    "@types/react": "^19.1.0",
    "@types/react-test-renderer": "^19.1.0",
    "babel-jest": "^29.7.0",
    "jest": "^29.7.0",
    "prettier": "^3.0.0",
    "react-test-renderer": "18.3.1",
    "typescript": "^5.8.3"
  }
}
```

### Metro Configuration (`apps/example/metro.config.js`)

Configure Metro to resolve the library from the monorepo:

```javascript
const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');

const monorepoRoot = path.resolve(__dirname, '../..');
const config = getDefaultConfig(__dirname);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];
// 2. Let Metro know where to resolve packages and in what order
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
  ],
  unstable_enableSymlinks: true,
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    routerTransformEnabled: false,
  },
});

module.exports = config;
```

---

## 9. Future Enhancements (Post v1.0)

### Audio Processing

- [ ] Voice Activity Detection (VAD)
- [ ] Noise reduction/suppression
- [ ] Echo cancellation
- [ ] Automatic gain control

### Formats & Compression

- [ ] MP3 encoding (via LAME)
- [ ] AAC encoding
- [ ] OPUS encoding
- [ ] Configurable bit rate

### Advanced Features

- [ ] Background recording (iOS)
- [ ] Bluetooth device support
- [ ] External microphone selection
- [ ] Real-time audio visualization data (waveform, spectrum)

### Performance

- [ ] Optimize memory usage for long recordings
- [ ] Battery optimization
- [ ] Chunk buffering strategies

---

## 10. Dependencies

### iOS

- AVFoundation (system framework)
- React-Native core

### Android

- android.media.AudioRecord (system)
- React-Native core

### Development

```json
{
  "devDependencies": {
    "@types/react-native": "^0.81.5",
    "typescript": "^5.8.3"
  }
}
```

**Total external dependencies: 0** (native modules only)

---

## 11. Success Criteria

### Functional

- ✅ Records audio and saves WAV file
- ✅ Emits real-time PCM chunks with <100ms latency
- ✅ Handles permissions correctly
- ✅ Works on iOS 13+ and Android API 21+
- ✅ Supports pause/resume/cancel

### Quality

- ✅ No memory leaks
- ✅ Stable across devices
- ✅ Clear error messages
- ✅ Well-documented API

### Integration

- ✅ Works seamlessly with SonioxClient
- ✅ Compatible with React Native 0.70+ (optimized for 0.81.5)
- ✅ Supports both old architecture (Bridge) and new architecture (TurboModules)
- ✅ Easy to integrate (< 30 min setup)
- ✅ No code changes needed when migrating architectures

---


**Next Steps:**

1. Review and approve this plan
2. Set up project repository structure
3. Begin Phase 1 implementation (iOS/Android setup)
4. Schedule weekly check-ins to track progress

**Key Success Factor:** Keep the initial scope tight (real-time streaming + file saving) and deliver a stable v1.0 before adding advanced features.
