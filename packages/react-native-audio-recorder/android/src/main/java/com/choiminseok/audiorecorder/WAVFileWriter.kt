package com.choiminseok.audiorecorder

import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder

class WAVFileWriter(
    private val filePath: String,
    private val sampleRate: Int,
    private val channels: Int
) {
    private var fileOutputStream: FileOutputStream? = null
    private var totalSamplesWritten: Int = 0
    private val file: File = File(filePath)

    init {
        // Create file
        file.createNewFile()

        // Open file output stream
        fileOutputStream = FileOutputStream(file)

        // Write WAV header (placeholder, will update on finalize)
        writeWAVHeader(0)
    }

    fun write(samples: ShortArray, count: Int) {
        val outputStream = fileOutputStream ?: return

        // Convert shorts to bytes
        val byteBuffer = ByteBuffer.allocate(count * 2)
        byteBuffer.order(ByteOrder.LITTLE_ENDIAN)

        for (i in 0 until count) {
            byteBuffer.putShort(samples[i])
        }

        outputStream.write(byteBuffer.array())
        totalSamplesWritten += count
    }

    fun finalize(): RecordingResult {
        val outputStream = fileOutputStream ?: throw IllegalStateException("File output stream is null")

        // Close output stream
        outputStream.close()
        fileOutputStream = null

        // Update header with correct data size
        val dataSize = totalSamplesWritten * 2 // 2 bytes per sample (16-bit)
        updateWAVHeader(dataSize)

        // Get file size
        val fileSize = file.length().toInt()

        // Calculate duration
        val durationSeconds = totalSamplesWritten.toDouble() / (sampleRate * channels)
        val durationMs = (durationSeconds * 1000).toInt()

        return RecordingResult(
            filePath = filePath,
            durationMs = durationMs,
            fileSizeBytes = fileSize,
            sampleRate = sampleRate,
            channels = channels
        )
    }

    fun cancel() {
        fileOutputStream?.close()
        fileOutputStream = null
        file.delete()
    }

    private fun writeWAVHeader(dataSize: Int) {
        val outputStream = fileOutputStream ?: return

        val header = ByteBuffer.allocate(44)
        header.order(ByteOrder.LITTLE_ENDIAN)

        // RIFF chunk
        header.put("RIFF".toByteArray())
        header.putInt(36 + dataSize)
        header.put("WAVE".toByteArray())

        // fmt chunk
        header.put("fmt ".toByteArray())
        header.putInt(16) // Chunk size
        header.putShort(1) // Audio format (PCM)
        header.putShort(channels.toShort())
        header.putInt(sampleRate)

        val byteRate = sampleRate * channels * 2 // 16-bit = 2 bytes
        header.putInt(byteRate)

        val blockAlign = (channels * 2).toShort()
        header.putShort(blockAlign)
        header.putShort(16) // Bits per sample

        // data chunk
        header.put("data".toByteArray())
        header.putInt(dataSize)

        outputStream.write(header.array())
    }

    private fun updateWAVHeader(dataSize: Int) {
        RandomAccessFile(file, "rw").use { raf ->
            // Update file size (RIFF chunk size)
            raf.seek(4)
            raf.write(intToByteArray(36 + dataSize))

            // Update data chunk size
            raf.seek(40)
            raf.write(intToByteArray(dataSize))
        }
    }

    private fun intToByteArray(value: Int): ByteArray {
        return byteArrayOf(
            (value and 0xFF).toByte(),
            ((value shr 8) and 0xFF).toByte(),
            ((value shr 16) and 0xFF).toByte(),
            ((value shr 24) and 0xFF).toByte()
        )
    }
}
