import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package '@choiminseok/react-native-audio-recorder' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- Run 'pod install' in the ios/ directory\n", default: '' }) +
  '- Rebuild the app after installing the package\n';

const AudioRecorder = NativeModules.AudioRecorder
  ? NativeModules.AudioRecorder
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/**
 * Dummy function to test native module linking
 * Prints a message from the native module
 */
export function printAudio(message: string): Promise<string> {
  return AudioRecorder.printAudio(message);
}

export default {
  printAudio,
};
