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
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        if (other !is AudioChunk) return false

        if (!data.contentEquals(other.data)) return false
        if (timestampMs != other.timestampMs) return false
        if (sequenceNumber != other.sequenceNumber) return false

        return true
    }

    override fun hashCode(): Int {
        var result = data.contentHashCode()
        result = 31 * result + timestampMs
        result = 31 * result + sequenceNumber
        return result
    }
}

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
    STOPPING("stopping"),
    STOPPED("stopped"),
    ERROR("error")
}

enum class AudioState(val value: String) {
    PLAYING("playing"),
    IDLE("idle")
}
