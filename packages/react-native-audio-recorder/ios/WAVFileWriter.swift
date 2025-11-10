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

struct RecordingResult {
  let filePath: String
  let durationMs: Int
  let fileSizeBytes: Int
  let sampleRate: Double
  let channels: Int
}

extension FixedWidthInteger {
  var data: Data {
    var value = self
    return Data(bytes: &value, count: MemoryLayout<Self>.size)
  }
}
