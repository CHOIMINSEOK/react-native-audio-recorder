package com.choiminseok.audiorecorder

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.annotation.RequiresPermission
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.facebook.react.module.annotations.ReactModule
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

@ReactModule(name = AudioRecorderModule.NAME)
class AudioRecorderModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "AudioRecorder"
        private const val PERMISSION_REQUEST_CODE = 1001
    }

    private var pcmRecorder: PCMRecorder? = null
    private var currentState = RecorderState.IDLE
    private var permissionPromise: Promise? = null
    private var mediaPlayer: MediaPlayer? = null

    override fun getName(): String = NAME

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
        val activity = reactApplicationContext.currentActivity

        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity")
            return
        }

        // Check if already granted
        if (ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            promise.resolve("granted")
            return
        }

        // Store promise for callback
        permissionPromise = promise

        // Request permission
        if (activity is PermissionAwareActivity) {
            activity.requestPermissions(
                arrayOf(Manifest.permission.RECORD_AUDIO),
                PERMISSION_REQUEST_CODE,
                PermissionListener { requestCode, permissions, grantResults ->
                    if (requestCode == PERMISSION_REQUEST_CODE) {
                        val granted = grantResults.isNotEmpty() &&
                                grantResults[0] == PackageManager.PERMISSION_GRANTED
                        permissionPromise?.resolve(if (granted) "granted" else "denied")
                        permissionPromise = null
                        return@PermissionListener true
                    }
                    false
                }
            )
        } else {
            promise.reject("PERMISSION_ERROR", "Activity doesn't support permission requests")
        }
    }

    // MARK: - Recording Methods

    @RequiresPermission(Manifest.permission.RECORD_AUDIO)
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
            setState(RecorderState.PREPARING)

            // Parse config
            val sampleRate = if (config.hasKey("sampleRate")) config.getInt("sampleRate") else 16000
            val channels = if (config.hasKey("channels")) config.getInt("channels") else 1
            val chunkSize = if (config.hasKey("chunkSize")) config.getInt("chunkSize") else 1024
            val outputPath = if (config.hasKey("outputPath")) config.getString("outputPath") else null
            val audioSource = if (config.hasKey("audioSource")) config.getString("audioSource") else "voiceRecognition"

            val recorderConfig = RecorderConfig(
                sampleRate = sampleRate,
                channels = channels,
                chunkSize = chunkSize,
                audioSource = parseAudioSource(audioSource ?: "voiceRecognition"),
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
            setState(RecorderState.ERROR)
            promise.reject("START_FAILED", "Failed to start recording: ${e.message}", e)
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        if (currentState != RecorderState.RECORDING) {
            promise.reject("INVALID_STATE", "Not recording")
            return
        }

        setState(RecorderState.STOPPING)

        try {
            val result = pcmRecorder?.stop()
            setState(RecorderState.STOPPED)

            if (result != null) {
                val resultMap = Arguments.createMap().apply {
                    putString("tmpFileUri", "file://${result.filePath}")
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
    fun getRecorderState(promise: Promise) {
        promise.resolve(currentState.value)
    }

    @ReactMethod
    fun getDuration(promise: Promise) {
        val duration = pcmRecorder?.currentDuration ?: 0
        promise.resolve(duration)
    }

    @ReactMethod
    fun playAudioFile(uri: String?, promise: Promise) {
        if (uri.isNullOrBlank()) {
            promise.reject("INVALID_URI", "Audio file URI is required")
            return
        }

        val parsedUri = Uri.parse(uri)
        val scheme = parsedUri.scheme?.lowercase()

        when (scheme) {
            "file" -> playFromUri(parsedUri, promise)
            "http", "https" -> downloadAndPlay(parsedUri, promise)
            else -> promise.reject("UNSUPPORTED_SCHEME", "Only file://, http://, or https:// URIs are supported")
        }
    }

    // MARK: - Private Helpers

    private fun downloadAndPlay(remoteUri: Uri, promise: Promise) {
        Thread {
            val tempFile = File.createTempFile("rn_audio_", ".tmp", reactApplicationContext.cacheDir)
            var connection: HttpURLConnection? = null
            try {
                val url = URL(remoteUri.toString())
                connection = (url.openConnection() as? HttpURLConnection)
                    ?: throw IllegalStateException("Invalid connection")

                connection.connectTimeout = 5000
                connection.readTimeout = 5000

                connection.inputStream.use { input ->
                    tempFile.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }
                connection.disconnect()

                Handler(Looper.getMainLooper()).post {
                    playFromUri(Uri.fromFile(tempFile), promise)
                }
            } catch (e: Exception) {
                tempFile.delete()
                promise.reject("DOWNLOAD_FAILED", "Failed to download audio file: ${e.message}", e)
            } finally {
                connection?.disconnect()
            }
        }.start()
    }

    private fun playFromUri(uri: Uri, promise: Promise) {
        val path = uri.path
        if (path.isNullOrEmpty()) {
            promise.reject("INVALID_URI", "Invalid file URI")
            return
        }

        val file = File(path)
        if (!file.exists()) {
            promise.reject("FILE_NOT_FOUND", "Audio file not found at path: $path")
            return
        }

        try {
            mediaPlayer?.release()
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                setDataSource(reactApplicationContext, uri)
                setOnPreparedListener { player ->
                    player.start()
                    val result = Arguments.createMap().apply {
                        putInt("durationMs", player.duration)
                    }
                    promise.resolve(result)
                }
                setOnErrorListener { mp, what, extra ->
                    promise.reject("PLAYBACK_ERROR", "Failed to play audio (what=$what, extra=$extra)")
                    mp.reset()
                    mp.release()
                    if (mediaPlayer === mp) {
                        mediaPlayer = null
                    }
                    true
                }
                setOnCompletionListener { player ->
                    player.release()
                    if (mediaPlayer === player) {
                        mediaPlayer = null
                    }
                }
                prepareAsync()
            }
        } catch (e: Exception) {
            mediaPlayer?.release()
            mediaPlayer = null
            promise.reject("PLAYBACK_ERROR", "Failed to play audio: ${e.message}", e)
        }
    }

    private fun setState(newState: RecorderState) {
        val oldState = currentState
        currentState = newState

        sendEvent("stateChange", Arguments.createMap().apply {
            putString("oldState", oldState.value)
            putString("newState", newState.value)
        })
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(eventName, params)
    }

    private fun handleAudioChunk(chunk: AudioChunk) {
        val chunkMap = Arguments.createMap().apply {
            putArray("data", Arguments.fromArray(chunk.data.toIntArray()))
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

    private fun parseAudioSource(source: String): Int {
        return when (source) {
            "default" -> android.media.MediaRecorder.AudioSource.DEFAULT
            "mic" -> android.media.MediaRecorder.AudioSource.MIC
            "voiceRecognition" -> android.media.MediaRecorder.AudioSource.VOICE_RECOGNITION
            "voiceCommunication" -> android.media.MediaRecorder.AudioSource.VOICE_COMMUNICATION
            else -> android.media.MediaRecorder.AudioSource.VOICE_RECOGNITION
        }
    }
}

// RN WritableArray doesn't supprot ShortArray, so we have to convert ShortArray to IntArray
private fun ShortArray.toIntArray(): IntArray {
    val out = IntArray(size)
    for (i in indices) out[i] = this[i].toInt()
    return out
}
