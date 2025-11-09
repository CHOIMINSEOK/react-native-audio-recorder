package com.choiminseok.audiorecorder

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = AudioRecorderModule.NAME)
class AudioRecorderModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "AudioRecorder"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun printAudio(message: String, promise: Promise) {
        try {
            val response = "Native Android received: $message"
            println(response)
            promise.resolve(response)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to print audio: ${e.message}", e)
        }
    }
}
