package com.choiminseok.audiorecorder

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.facebook.react.module.annotations.ReactModule

enum class RecorderState(val value: String) {
    IDLE("idle"),
    PREPARING("preparing"),
    RECORDING("recording"),
    PAUSED("paused"),
    STOPPING("stopping"),
    STOPPED("stopped"),
    ERROR("error")
}

@ReactModule(name = AudioRecorderModule.NAME)
class AudioRecorderModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "AudioRecorder"
        private const val PERMISSION_REQUEST_CODE = 1001
    }

    private var currentState = RecorderState.IDLE
    private var permissionPromise: Promise? = null

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

            // TODO: Phase 2 - Implement actual recording
            // For now, just acknowledge the request
            setState(RecorderState.RECORDING)
            promise.resolve(null)

        } catch (e: Exception) {
            setState(RecorderState.ERROR)
            promise.reject("START_FAILED", "Failed to start recording: ${e.message}", e)
        }
    }

    @ReactMethod
    fun pauseRecording(promise: Promise) {
        if (currentState != RecorderState.RECORDING) {
            promise.reject("INVALID_STATE", "Not recording")
            return
        }

        // TODO: Phase 2 - Implement pause
        setState(RecorderState.PAUSED)
        promise.resolve(null)
    }

    @ReactMethod
    fun resumeRecording(promise: Promise) {
        if (currentState != RecorderState.PAUSED) {
            promise.reject("INVALID_STATE", "Not paused")
            return
        }

        // TODO: Phase 2 - Implement resume
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
            // TODO: Phase 2 - Implement stop and file saving
            // For now, return a mock result
            setState(RecorderState.STOPPED)

            val resultMap = Arguments.createMap().apply {
                putString("filePath", "/tmp/mock_recording.wav")
                putInt("durationMs", 0)
                putInt("fileSizeBytes", 0)
                putInt("sampleRate", 16000)
                putInt("channels", 1)
            }
            promise.resolve(resultMap)

        } catch (e: Exception) {
            setState(RecorderState.ERROR)
            promise.reject("STOP_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun cancelRecording(promise: Promise) {
        // TODO: Phase 2 - Implement cancel
        setState(RecorderState.STOPPED)
        promise.resolve(null)
    }

    @ReactMethod
    fun getState(promise: Promise) {
        promise.resolve(currentState.value)
    }

    @ReactMethod
    fun getDuration(promise: Promise) {
        // TODO: Phase 2 - Return actual duration
        promise.resolve(0)
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

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(eventName, params)
    }
}
