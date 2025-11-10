export enum RecorderState {
  IDLE = 'idle',
  PREPARING = 'preparing',
  RECORDING = 'recording',
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
  data: number[];

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

// Subscription type
export interface EmitterSubscription {
  remove(): void;
}
