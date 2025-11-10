package com.choiminseok.audiorecorder

import android.Manifest
import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioRecord.RECORDSTATE_RECORDING
import android.util.Log
import androidx.annotation.RequiresPermission
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

    private var startTimeMs: Long = 0
    private var sequenceNumber: Int = 0

    val currentDuration: Int
        get() = if (startTimeMs > 0) {
            (System.currentTimeMillis() - startTimeMs).toInt()
        } else {
            0
        }

    @RequiresPermission(Manifest.permission.RECORD_AUDIO)
    fun start() {
        if (audioRecord != null && audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            Log.d("AudioRecorder", "already initialized")
            return
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

        val bufferSize = maxOf(minBufferSize, config.chunkSize * 3)

        // Create AudioRecord
        audioRecord = AudioRecord(
            config.audioSource,
            config.sampleRate,
            channelConfig,
            audioFormat,
            bufferSize
        )



        // Initialize file writer
        val outputPath = config.outputPath ?: generateTempFilePath()
        fileWriter = WAVFileWriter(
            filePath = outputPath,
            sampleRate = config.sampleRate,
            channels = config.channels
        )

        // Start recording
        audioRecord?.startRecording()
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

    fun stop(): RecordingResult? {

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
        recordingThread?.join(1000)
        recordingThread = null

        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null

        fileWriter?.cancel()
    }

    private fun recordingLoop() {
        val buffer = ShortArray(config.chunkSize)

        while (audioRecord?.recordingState == RECORDSTATE_RECORDING) {
            try {
                val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0

                if (read > 0) {
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
                e.printStackTrace()
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
