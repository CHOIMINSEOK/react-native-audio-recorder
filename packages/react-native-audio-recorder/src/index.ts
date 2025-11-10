import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type {
  RecorderState,
  PermissionStatus,
  RecorderConfig,
  RecordingResult,
  AudioDataEvent,
  StateChangeEvent,
  ErrorEvent,
  EmitterSubscription,
} from './types';

// Re-export types
export * from './types';

const LINKING_ERROR =
  `The package 'choiminseok/react-native-audio-recorder' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- Run 'pod install' in the ios/ directory\n", default: '' }) +
  '- Rebuild the app after installing the package\n' 

const AudioRecorderModule = NativeModules.AudioRecorder
  ? NativeModules.AudioRecorder
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

const eventEmitter = new NativeEventEmitter(AudioRecorderModule);

/**
 * Check current microphone permission status
 */
function checkPermission(): Promise<PermissionStatus> {
  return AudioRecorderModule.checkPermission();
}

/**
 * Request microphone permission from user
 */
function requestPermission(): Promise<PermissionStatus> {
  return AudioRecorderModule.requestPermission();
}

/**
 * Start audio recording with given configuration
 *
 * @throws {Error} If permission not granted
 * @throws {Error} If already recording
 */
function startRecording(config?: RecorderConfig): Promise<void> {
  return AudioRecorderModule.startRecording(config || {});
}

/**
 * Stop recording and save file
 *
 * @returns Recording result with file path and metadata
 */
function stopRecording(): Promise<RecordingResult> {
  return AudioRecorderModule.stopRecording();
}

/**
 * Cancel recording without saving file
 */
function cancelRecording(): Promise<void> {
  return AudioRecorderModule.cancelRecording();
}

/**
 * Get current recorder state
 */
function getState(): Promise<RecorderState> {
  return AudioRecorderModule.getState();
}

/**
 * Get current recording duration in milliseconds
 * Returns 0 if not recording
 */
function getDuration(): Promise<number> {
  return AudioRecorderModule.getDuration();
}

/**
 * Add event listener
 *
 * @param event Event name
 * @param listener Callback function
 * @returns Subscription object with remove() method
 */
function addListener(
  event: 'audioData',
  listener: (event: AudioDataEvent) => void,
): EmitterSubscription;

function addListener(
  event: 'stateChange',
  listener: (event: StateChangeEvent) => void,
): EmitterSubscription;

function addListener(
  event: 'error',
  listener: (event: ErrorEvent) => void,
): EmitterSubscription;

function addListener(event: string, listener: (event: any) => void): EmitterSubscription {
  return eventEmitter.addListener(event, listener);
}

/**
 * Remove specific listener
 */
function removeListener(event: string): void {
  eventEmitter.removeAllListeners(event);
}

/**
 * Remove all listeners for an event
 */
function removeAllListeners(event: string): void {
  eventEmitter.removeAllListeners(event);
}


/**
 * Audio Recorder for React Native
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
const AudioRecorder = {
  checkPermission,
  requestPermission,
  startRecording,
  stopRecording,
  cancelRecording,
  getState,
  getDuration,
  addListener,
  removeListener,
  removeAllListeners,
} as const;

export default AudioRecorder;
