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
  const [chunksReceived, setChunksReceived] = useState<number>(0);
  const [lastChunkTimestamp, setLastChunkTimestamp] = useState<number>(0);
  const [lastRecordedFileUri, setLastRecordedFileUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    checkPermission();

    // Subscribe to state changes
    const stateSubscription = AudioRecorder.addListener('stateChange', (event) => {
      addLog(`State changed: ${event.oldState} → ${event.newState}`);
      setRecorderState(event.newState as RecorderState);

      // Reset chunk counter when starting a new recording
      if (event.newState === RecorderState.RECORDING) {
        setChunksReceived(0);
        setLastChunkTimestamp(0);
      }
    });

    // Subscribe to audio data chunks
    const audioSubscription = AudioRecorder.addListener('audioData', (event) => {
      setChunksReceived(prev => prev + 1);
      setLastChunkTimestamp(event.chunk.timestampMs);

      // Log every 10th chunk to avoid spam
      if (event.chunk.sequenceNumber % 10 === 0) {
        addLog(`Chunk #${event.chunk.sequenceNumber}: ${event.chunk.data.length} samples @ ${event.chunk.timestampMs}ms`);
      }
    });


    return () => {
      stateSubscription.remove();
      audioSubscription.remove();
    };
  }, 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

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

  const stopRecording = async () => {
    try {
      addLog('Stopping recording...');
      const result = await AudioRecorder.stopRecording();
      addLog(`Recording stopped! File: ${result.tmpFileUri}`);
      addLog(`Duration: ${result.durationMs}ms, Size: ${result.fileSizeBytes} bytes`);
      setLastRecordedFileUri(result.tmpFileUri);
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

  const playRecordingWithNativePlayer = async () => {
    if (!lastRecordedFileUri) {
      addLog('No recording to play');
      return;
    }

    try {
      addLog(`Playing with native player: ${lastRecordedFileUri}`);
      setIsPlaying(true);

      // Kotlin에서 reject된 promise는 여기서 catch됩니다
      const result = await AudioRecorder.playAudioFile(lastRecordedFileUri);
      addLog(`Playback started! Duration: ${result.durationMs}ms`);
      
    } catch (error: any) {
      // React Native는 Native Module의 promise.reject()를 Error 객체로 변환합니다
      // error.code: reject의 첫 번째 인자 (예: "PLAYBACK_ERROR")
      // error.message: reject의 두 번째 인자 (예: "Failed to play audio (what=$what, extra=$extra)")
      
      setIsPlaying(false);
      
      // 에러 코드별 처리
      if (error.code === 'PLAYBACK_ERROR') {
        addLog(`Playback error: ${error.message}`);
      } else if (error.code === 'FILE_NOT_FOUND') {
        addLog(`File not found: ${error.message}`);
      } else if (error.code === 'INVALID_URI') {
        addLog(`Invalid URI: ${error.message}`);
      } else if (error.code === 'INVALID_STATE') {
        addLog(`Invalid state: ${error.message}`);
      } else if (error.code === 'UNSUPPORTED_SCHEME') {
        addLog(`Unsupported scheme: ${error.message}`);
      } else {
        addLog(`Unknown error: ${error.code} - ${error.message}`);
      }
      
      console.error('Playback error details:', {
        code: error.code,
        message: error.message,
        nativeError: error.nativeError, // 세 번째 인자 (Exception 객체)가 있다면
      });
    }
  };

  const stopPlayback = () => {
    addLog('Playback stopped');
    setIsPlaying(false);
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
        <Text style={styles.subtitle}>Phase 2: Core Recording & Streaming</Text>

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

        {/* Audio Data Stats */}
        {recorderState === RecorderState.RECORDING && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Chunks Received</Text>
              <Text style={styles.statValue}>{chunksReceived}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{(lastChunkTimestamp / 1000).toFixed(1)}s</Text>
            </View>
          </View>
        )}

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
              style={[styles.smallButton, styles.dangerButton]}
              onPress={stopRecording}
              disabled={recorderState !== RecorderState.RECORDING}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={cancelRecording}
            disabled={recorderState !== RecorderState.RECORDING}
          >
            <Text style={styles.buttonText}>Cancel Recording</Text>
          </TouchableOpacity>
        </View>

        {/* Playback Controls */}
        {lastRecordedFileUri && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Playback</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.smallButton, styles.primaryButton]}
                onPress={playRecordingWithNativePlayer}
              >
                <Text style={styles.buttonText}>Play (Local)</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={stopPlayback}
              disabled={!isPlaying}
            >
              <Text style={styles.buttonText}>Stop Playback</Text>
            </TouchableOpacity>
          </View>
        )}

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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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

