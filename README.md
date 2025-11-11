# React Native Audio Recorder

`@choiminseok/react-native-audio-recorder` is a React Native module that records microphone input, emits real-time PCM chunks, and persists the final WAV file to cache local storage. It targets low-latency speech-to-text and streaming scenarios while remaining simple to integrate in any app.

## Basic Functionality

### Audio recording
- Call `AudioRecorder.startRecording(config?)` to capture microphone input using the desired sample rate, channels, chunk size, and Android audio source.
- Pause/resume logic is managed natively to keep latency under 100 ms per chunk while `getState()` exposes the current `RecorderState`.
- `getDuration()` returns the running duration in milliseconds while a session is active.

### Real-time audio listener
- Subscribe to `audioData` via `AudioRecorder.addListener('audioData', handler)` to receive PCM chunks as Int16 arrays alongside a timestamp and sequence.
- Use these callbacks to feed ASR models, sockets, or visualizers; remove the listener (or call `subscription.remove()`) when you no longer need streaming data.
- Additional events include `stateChange` (lifecycle transitions) and `error` (surface native failures with descriptive codes).

### Saving the temporary audio file
- `AudioRecorder.stopRecording()` flushes all buffered audio, writes a WAV file into the platform cache directory, and resolves with a `RecordingResult`.
- The result exposes `tmpFileUri`, `durationMs`, `fileSizeBytes`, `sampleRate`, and `channels`. You can upload the file immediately or move it to permanent storage.
- Call `AudioRecorder.cancelRecording()` if you want to discard the session without persisting audio.

## Installation

```bash
yarn add @choiminseok/react-native-audio-recorder
# or
npm install @choiminseok/react-native-audio-recorder
```

### iOS
```bash
cd ios && pod install && cd ..
```

## How to Use

1. **Check/request microphone permission** using the provided helpers.
2. **Attach listeners** for `audioData`, `stateChange`, or `error`.
3. **Start recording** with the desired configuration (or rely on defaults: 16 kHz, mono, 1024-sample chunks).
4. **Stop or cancel** depending on whether you need the WAV output.
5. **Clean up** by removing listeners when the component unmounts.

```tsx
import { useEffect, useState } from 'react';
import AudioRecorder, {
  AudioDataEvent,
  PermissionStatus,
  RecorderState,
} from '@choiminseok/react-native-audio-recorder';

export function UseRecorderExample() {
  const [state, setState] = useState<RecorderState>('idle');
  const [lastChunkTs, setLastChunkTs] = useState<number | null>(null);
  const [tmpFileUri, setTmpFileUri] = useState<string | null>(null);

  useEffect(() => {
    const dataSub = AudioRecorder.addListener('audioData', (event: AudioDataEvent) => {
      setLastChunkTs(event.chunk.timestampMs);
      // sendInt16ToServer(event.chunk.data);
    });
    const stateSub = AudioRecorder.addListener('stateChange', (event) => {
      setState(event.newState);
    });
    return () => {
      dataSub.remove();
      stateSub.remove();
    };
  }, []);

  const ensurePermission = async () => {
    const status = await AudioRecorder.checkPermission();
    if (status !== PermissionStatus.GRANTED) {
      const next = await AudioRecorder.requestPermission();
      if (next !== PermissionStatus.GRANTED) {
        throw new Error('Microphone permission is required');
      }
    }
  };

  const start = async () => {
    await ensurePermission();
    await AudioRecorder.startRecording({
      sampleRate: 16000,
      channels: 1,
      chunkSize: 1024,
    });
  };

  const stop = async () => {
    const result = await AudioRecorder.stopRecording();
    setTmpFileUri(result.tmpFileUri);
  };

  return null;
}
```

## API Surface

| Method | Description |
| --- | --- |
| `checkPermission(): Promise<PermissionStatus>` | Returns current microphone authorization state. |
| `requestPermission(): Promise<PermissionStatus>` | Prompts the user if permission is not granted. |
| `startRecording(config?: RecorderConfig): Promise<void>` | Begins recording using the provided configuration. |
| `stopRecording(): Promise<RecordingResult>` | Stops recording, writes WAV, and resolves with file metadata. |
| `cancelRecording(): Promise<void>` | Stops recording without writing a file. |
| `getState(): Promise<RecorderState>` | Returns native recorder state (`idle`, `recording`, etc.). |
| `getDuration(): Promise<number>` | Current session duration in milliseconds. |
| `addListener(event, handler)` / `removeListener(event)` / `removeAllListeners(event)` | Manage `audioData`, `stateChange`, `error` subscriptions. |

### RecorderConfig
- `sampleRate` (`8000 | 16000 | 44100 | 48000`, default `16000`)
- `channels` (`1` mono or `2` stereo, default `1`)
- `chunkSize` (samples per emitted chunk, default `1024`)
- `audioSource` (Android: `default | mic | voiceRecognition | voiceCommunication`, default `voiceRecognition`)
- `outputPath` (optional absolute destination; otherwise a temp file is created)

### Events
- `audioData`: `{ chunk: { data: number[]; timestampMs; sequenceNumber } }`
- `stateChange`: `{ oldState, newState }`
- `error`: `{ error: { code, message, nativeError? } }`

## Example App

Run the bundled example to validate native integrations or test changes:

```bash
yarn
yarn example:ios   # or yarn example:android
```

The example already demonstrates streaming chunks, live duration, and file saving flows.

## Repository Structure

```
react-native-audio-recorder/
├── packages/react-native-audio-recorder   # Library source + native code
└── apps/example                           # Expo-style test bed (RN 0.81.5)
```

## License

MIT © CHOIMINSEOK
