/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  useColorScheme,
} from 'react-native';
import AudioRecorder, { PermissionStatus, RecorderState } from '@choiminseok/react-native-audio-recorder';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.IDLE);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    checkPermission();

    // Subscribe to state changes
    const subscription = AudioRecorder.addListener('stateChange', (event) => {
      addLog(`State changed: ${event.oldState} → ${event.newState}`);
      setRecorderState(event.newState as RecorderState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const addLog = (message: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev].slice(0, 20));
  };

  const checkPermission = async () => {
    try {
      const status = await AudioRecorder.checkPermission();
      setPermissionStatus(status);
      addLog(`Permission status: ${status}`);
    } catch (error) {
      addLog(`Error checking permission: ${error}`);
    }
  };

  const requestPermission = async () => {
    try {
      addLog('Requesting permission...');
      const status = await AudioRecorder.requestPermission();
      setPermissionStatus(status);
      addLog(`Permission ${status === 'granted' ? 'granted!' : 'denied'}`);
    } catch (error) {
      addLog(`Error requesting permission: ${error}`);
    }
  };

  const startRecording = async () => {
    try {
      addLog('Starting recording...');
      await AudioRecorder.startRecording({
        sampleRate: 16000,
        channels: 1,
        chunkSize: 1024,
      });
      addLog('Recording started!');
      const state = await AudioRecorder.getState();
      setRecorderState(state);
    } catch (error) {
      addLog(`Error starting recording: ${error}`);
    }
  };

  const pauseRecording = async () => {
    try {
      addLog('Pausing recording...');
      await AudioRecorder.pauseRecording();
      addLog('Recording paused');
      const state = await AudioRecorder.getState();
      setRecorderState(state);
    } catch (error) {
      addLog(`Error pausing: ${error}`);
    }
  };

  const resumeRecording = async () => {
    try {
      addLog('Resuming recording...');
      await AudioRecorder.resumeRecording();
      addLog('Recording resumed');
      const state = await AudioRecorder.getState();
      setRecorderState(state);
    } catch (error) {
      addLog(`Error resuming: ${error}`);
    }
  };

  const stopRecording = async () => {
    try {
      addLog('Stopping recording...');
      const result = await AudioRecorder.stopRecording();
      addLog(`Recording stopped! File: ${result.filePath}`);
      addLog(`Duration: ${result.durationMs}ms, Size: ${result.fileSizeBytes} bytes`);
      const state = await AudioRecorder.getState();
      setRecorderState(state);
    } catch (error) {
      addLog(`Error stopping: ${error}`);
    }
  };

  const cancelRecording = async () => {
    try {
      addLog('Cancelling recording...');
      await AudioRecorder.cancelRecording();
      addLog('Recording cancelled');
      const state = await AudioRecorder.getState();
      setRecorderState(state);
    } catch (error) {
      addLog(`Error cancelling: ${error}`);
    }
  };

  const getStatusColor = () => {
    if (!permissionStatus) return '#999';
    switch (permissionStatus) {
      case 'granted':
        return '#4CAF50';
      case 'denied':
        return '#F44336';
      default:
        return '#FF9800';
    }
  };

  const getStateColor = () => {
    switch (recorderState) {
      case RecorderState.RECORDING:
        return '#F44336';
      case RecorderState.PAUSED:
        return '#FF9800';
      case RecorderState.IDLE:
      case RecorderState.STOPPED:
        return '#4CAF50';
      default:
        return '#999';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Audio Recorder Test</Text>
        <Text style={styles.subtitle}>Phase 1: iOS & Android Setup</Text>

        {/* Permission Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Permission:</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{permissionStatus || 'Unknown'}</Text>
          </View>
        </View>

        {/* Recorder State */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>State:</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStateColor() }]}>
            <Text style={styles.statusText}>{recorderState}</Text>
          </View>
        </View>

        {/* Permission Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.smallButton} onPress={checkPermission}>
              <Text style={styles.buttonText}>Check</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallButton, styles.primaryButton]} onPress={requestPermission}>
              <Text style={styles.buttonText}>Request</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recording Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recording Controls</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.smallButton, styles.successButton]}
              onPress={startRecording}
              disabled={permissionStatus !== 'granted' || recorderState === RecorderState.RECORDING}
            >
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallButton, styles.warningButton]}
              onPress={pauseRecording}
              disabled={recorderState !== RecorderState.RECORDING}
            >
              <Text style={styles.buttonText}>Pause</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.smallButton, styles.successButton]}
              onPress={resumeRecording}
              disabled={recorderState !== RecorderState.PAUSED}
            >
              <Text style={styles.buttonText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallButton, styles.dangerButton]}
              onPress={stopRecording}
              disabled={recorderState !== RecorderState.RECORDING && recorderState !== RecorderState.PAUSED}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={cancelRecording}
            disabled={recorderState !== RecorderState.RECORDING && recorderState !== RecorderState.PAUSED}
          >
            <Text style={styles.buttonText}>Cancel Recording</Text>
          </TouchableOpacity>
        </View>

        {/* Log */}
        <View style={styles.logContainer}>
          <Text style={styles.logTitle}>Activity Log</Text>
          {log.map((entry, index) => (
            <Text key={index} style={styles.logEntry}>
              {entry}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  smallButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  warningButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logContainer: {
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    maxHeight: 300,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  logEntry: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'Courier',
  },
});

export default App;
