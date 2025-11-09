# React Native Audio Recorder

Real-time PCM audio recorder for React Native with streaming and file persistence.

## 📦 Monorepo Structure

```
react-native-audio-recorder/
├── packages/
│   └── react-native-audio-recorder/    # Library package
│       ├── src/                         # TypeScript source
│       ├── ios/                         # iOS native code (Swift)
│       ├── android/                     # Android native code (Kotlin)
│       └── AudioRecorder.podspec
├── apps/
│   └── example/                         # Example/demo app
└── package.json                         # Root workspace config
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- Yarn 4.10.3 (managed by Corepack)
- Xcode 14+ (for iOS)
- Android Studio (for Android)

### Installation

```bash
# Enable Corepack (if not already enabled)
corepack enable

# Install dependencies
yarn install

# Install iOS pods
cd apps/example/ios && pod install && cd ../../..
```

## 🧪 Development

### Running the Example App

**iOS:**
```bash
yarn example:ios
```

**Android:**
```bash
yarn example:android
```

### Building the Library

```bash
yarn build
```

### Type Checking

```bash
yarn typecheck
```

### Linting

```bash
yarn lint
```

## 📋 Project Status

### ✅ Phase 1: Project Setup - **COMPLETED**

- [x] Monorepo structure with workspaces
- [x] Library package with dummy `printAudio()` function
- [x] Demo app with React Native 0.81.5
- [x] Local package linking (workspace)
- [x] iOS native module setup (Swift)
- [x] Android native module setup (Kotlin)
- [x] Auto-linking configuration
- [x] TurboModule/Codegen support

### 🔄 Next: Phase 2 - iOS & Android Native Setup

- [ ] Create iOS module structure
- [ ] Implement iOS permission methods
- [ ] Basic AVAudioEngine setup
- [ ] Create Android module structure
- [ ] Implement Android permission methods
- [ ] Basic AudioRecord setup
- [ ] Define complete TypeScript API

## 🏗️ Architecture

- **Dual Architecture Support**: Both old (Bridge) and new (TurboModules) React Native architectures
- **Native Languages**: Swift (iOS) and Kotlin (Android)
- **Build System**: React Native Builder Bob for library packaging
- **Package Manager**: Yarn 4 with node-modules linker for React Native compatibility

## 📖 Documentation

- [Audio Recorder Plan](./Audio-Recorder-Plan.md) - Comprehensive implementation plan
- [Todo List](./ToDo.md) - Phase-by-phase task breakdown
- [Library README](./packages/react-native-audio-recorder/README.md) - Package documentation

## 🧑‍💻 Testing the Setup

The example app includes a simple test button that calls the native `printAudio()` function to verify the native bridge is working correctly.

**Expected output:**
- iOS: "Native iOS received: Hello from React Native!"
- Android: "Native Android received: Hello from React Native!"

## 📝 License

MIT

---

**Phase 1 Completed:** ✅ Local package linking verified, native modules auto-linked successfully
