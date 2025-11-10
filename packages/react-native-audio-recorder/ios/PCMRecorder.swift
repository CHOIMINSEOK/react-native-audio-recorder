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

    // Get the input node's output format (hardware format)
    // Note: We must use outputFormat, not inputFormat, for the tap
    let inputFormat = inputNode!.outputFormat(forBus: 0)
    
    // Configure desired output format
    let outputFormat = AVAudioFormat(
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

    // Install tap using the input node's output format (hardware format)
    // We'll convert the format in processAudioBuffer if needed
    inputNode!.installTap(
      onBus: 0,
      bufferSize: AVAudioFrameCount(config.chunkSize),
      format: inputFormat  // Use hardware format to avoid format mismatch
    ) { [weak self] buffer, time in
      self?.processAudioBuffer(buffer, time: time, inputFormat: inputFormat, outputFormat: outputFormat)
    }

    // Start engine
    try audioEngine!.start()

    startTime = Date()
    sequenceNumber = 0
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

  private func processAudioBuffer(_ buffer: AVAudioPCMBuffer, time: AVAudioTime, inputFormat: AVAudioFormat, outputFormat: AVAudioFormat) {
    // Convert buffer format if needed
    let convertedBuffer: AVAudioPCMBuffer
    
    if buffer.format.isEqual(outputFormat) {
      // No conversion needed
      convertedBuffer = buffer
    } else {
      // Convert to desired format
      guard let converter = AVAudioConverter(from: buffer.format, to: outputFormat) else {
        delegate?.recorder(self, didEncounterError: NSError(domain: "AudioRecorder", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to create audio converter"]))
        return
      }
      
      // Calculate output buffer size
      let inputFrameCount = Int(buffer.frameLength)
      let ratio = outputFormat.sampleRate / buffer.format.sampleRate
      let outputFrameCount = AVAudioFrameCount(Double(inputFrameCount) * ratio)
      
      guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: outputFrameCount) else {
        delegate?.recorder(self, didEncounterError: NSError(domain: "AudioRecorder", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to create output buffer"]))
        return
      }
      
      // Perform conversion
      var error: NSError?
      let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
        outStatus.pointee = .haveData
        return buffer
      }
      
      converter.convert(to: outputBuffer, error: &error, withInputFrom: inputBlock)
      
      if let error = error {
        delegate?.recorder(self, didEncounterError: error)
        return
      }
      
      convertedBuffer = outputBuffer
    }
    
    // Extract Int16 samples
    let frameLength = Int(convertedBuffer.frameLength)
    let channels = Int(convertedBuffer.format.channelCount)

    guard let int16Data = convertedBuffer.int16ChannelData else { return }
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
