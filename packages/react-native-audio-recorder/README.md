# @choiminseok/react-native-audio-recorder

Real-time PCM audio recorder for React Native with streaming and file persistence.

## Installation

```bash
yarn add @choiminseok/react-native-audio-recorder
```

### iOS

```bash
cd ios && pod install
```

### Android

No additional steps required - autolinking handles it!

## Usage

```typescript
import { printAudio } from '@choiminseok/react-native-audio-recorder';

// Test the native module
const result = await printAudio('Hello from React Native!');
console.log(result); // "Native iOS/Android received: Hello from React Native!"
```

## Status

🚧 **Phase 1: Project Setup** - In Progress

This is a work in progress. Full audio recording functionality coming soon!

## License

MIT
