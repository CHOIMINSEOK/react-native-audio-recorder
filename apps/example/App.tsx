/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { Button, StatusBar, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { printAudio } from '@choiminseok/react-native-audio-recorder';
import {
  SafeAreaProvider, 
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View style={[styles.container, {
      paddingTop: safeAreaInsets.top
    }]}>
      <Text>Hello World</Text>
      <Button title="Press me" onPress={async () => {
        console.log('Press me');
        const result = await printAudio('Hello from React Native!');
        console.log(result);
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
