import { Ionicons } from '@expo/vector-icons';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { requestLocationPermission } from '@/services/location';
import { uploadRecordedVideo } from '@/services/video-upload';

const MAX_RECORDING_SECONDS = 10;

type VideoRecorderProps = {
  onClose?: () => void;
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function VideoRecorder({ onClose }: VideoRecorderProps) {
  const cameraRef = useRef<CameraView>(null);
  const isMountedRef = useRef(true);
  const isRecordingRef = useRef(false);
  const shouldUploadRecordingRef = useRef(true);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const hasCameraPermission = cameraPermission?.granted;
  const hasMicrophonePermission = microphonePermission?.granted;
  const hasPermissions = hasCameraPermission && hasMicrophonePermission;

  const stopActiveRecording = useCallback(() => {
    if (!isRecordingRef.current && !recordingPromiseRef.current) {
      return;
    }

    cameraRef.current?.stopRecording();
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      shouldUploadRecordingRef.current = false;

      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }

      stopActiveRecording();
      isRecordingRef.current = false;
    };
  }, [stopActiveRecording]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const interval = setInterval(() => {
      setRecordingSeconds((seconds) => Math.min(seconds + 1, MAX_RECORDING_SECONDS));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isRecording]);

  const requestPermissions = async () => {
    const [nextCameraPermission, nextMicrophonePermission] = await Promise.all([
      requestCameraPermission(),
      requestMicrophonePermission(),
    ]);

    if (!nextCameraPermission.granted || !nextMicrophonePermission.granted) {
      Alert.alert(
        'Permissions needed',
        'Pulse Guard needs camera and microphone access to record video.'
      );
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || !isCameraReady || isRecordingRef.current) {
      return;
    }

    isRecordingRef.current = true;
    shouldUploadRecordingRef.current = true;
    setRecordingSeconds(0);
    setIsRecording(true);

    try {
      const recordingPromise = cameraRef.current.recordAsync({
        maxDuration: MAX_RECORDING_SECONDS,
      });
      recordingPromiseRef.current = recordingPromise;
      recordingTimeoutRef.current = setTimeout(() => {
        cameraRef.current?.stopRecording();
      }, MAX_RECORDING_SECONDS * 1000);

      const video = await recordingPromise;

      if (video?.uri && shouldUploadRecordingRef.current) {
        if (isMountedRef.current) {
          setIsUploading(true);
        }

        const locationResult = await requestLocationPermission();

        if (locationResult.status !== 'granted') {
          throw new Error('Unable to attach your current location to this video.');
        }

        await uploadRecordedVideo(video.uri, {
          location: {
            accuracy: locationResult.location.coords.accuracy,
            latitude: locationResult.location.coords.latitude,
            longitude: locationResult.location.coords.longitude,
            timestamp: locationResult.location.timestamp,
          },
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to record video. Please try again.';
      Alert.alert('Video failed', message);
    } finally {
      if (isMountedRef.current) {
        setIsRecording(false);
        setIsUploading(false);
      }

      isRecordingRef.current = false;
      recordingPromiseRef.current = null;

      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    stopActiveRecording();
  };

  const closeRecorder = () => {
    shouldUploadRecordingRef.current = false;
    stopActiveRecording();

    onClose?.();
  };

  // While permissions are being requested, show a loading state. If permissions are denied, show a prompt to enable them.
  if (!cameraPermission || !microphonePermission) {
    return (
      <View style={styles.stateScreen}>
        <Pressable
          accessibilityLabel="Close camera"
          accessibilityRole="button"
          onPress={closeRecorder}
          style={({ pressed }) => [styles.stateCloseButton, pressed && styles.pressed]}>
          <Ionicons name="close" size={26} color="#202020" />
        </Pressable>
        <ThemedText style={styles.stateTitle}>Preparing camera</ThemedText>
      </View>
    );
  }
// If we don't have permissions, show a prompt to enable them.
  if (!hasPermissions) {
    return (
      <View style={styles.stateScreen}>
        <Pressable
          accessibilityLabel="Close camera"
          accessibilityRole="button"
          onPress={closeRecorder}
          style={({ pressed }) => [styles.stateCloseButton, pressed && styles.pressed]}>
          <Ionicons name="close" size={26} color="#202020" />
        </Pressable>
        <Ionicons name="videocam-outline" size={40} color="#202020" />
        <ThemedText style={styles.stateTitle}>Enable video recording</ThemedText>
        <ThemedText style={styles.stateCopy}>
          Camera and microphone access are required because Pulse Guard records videos only.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void requestPermissions();
          }}
          style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}>
          <ThemedText style={styles.permissionButtonText}>Allow access</ThemedText>
        </Pressable>
      </View>
    );
  }
// If we have permissions, show the camera view with recording controls.
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        active
        facing="back"
        mode="video"
        mute={false}
        onCameraReady={() => {
          setIsCameraReady(true);
        }}
        onMountError={(event) => {
          Alert.alert('Camera error', event.message);
        }}
        responsiveOrientationWhenOrientationLocked
        style={styles.camera}
        videoQuality="1080p"
      />

      <View pointerEvents="box-none" style={styles.topOverlay}>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, isRecording && styles.recordingDot]} />
          <ThemedText style={styles.statusText}>
            {isRecording
              ? formatDuration(recordingSeconds)
              : isUploading
                ? 'Uploading'
                : 'long press to record'}
          </ThemedText>
        </View>
      </View>
      
      {/* this is the close button */}
      <Pressable
        accessibilityLabel="Close camera"
        accessibilityRole="button"
        onPress={closeRecorder}
        style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
        <Ionicons name="close" size={26} color="#FFFFFF" />
      </Pressable>

      <View pointerEvents="box-none" style={styles.bottomOverlay}>
        <Pressable
        // using a ternary operator to change the accessibility label based on whether we're currently recording or not
          accessibilityLabel={isRecording ? 'Stop video recording' : 'Start video recording'}
          accessibilityRole="button"
          disabled={!isCameraReady || isUploading}
          onPressIn={() => {
            void startRecording();
          }}
          // we use onPressIn to start recording immediately when the user presses the button,
          // and onPressOut to stop recording as soon as they release it. 
          // This allows for more natural recording behavior,
          // where the length of the recording is determined by how long the user holds the button.
          onPressOut={stopRecording}
          style={({ pressed }) => [
            styles.recordButton,
            isRecording && styles.recordButtonActive,
            (!isCameraReady || isUploading) && styles.disabledControl,
            pressed && styles.pressed,
          ]}>
          <View style={[styles.recordButtonCore, isRecording && styles.stopButtonCore]} />
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  statusPill: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  recordingDot: {
    backgroundColor: '#C22C2A',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Geist_500Medium',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  recordButtonActive: {
    borderColor: '#C22C2A',
  },
  recordButtonCore: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#C22C2A',
  },
  stopButtonCore: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  disabledControl: {
    opacity: 0.45,
  },
  stateScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#FFFFFF',
  },
  stateCloseButton: {
    position: 'absolute',
    top: 14,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    marginTop: 14,
    color: '#111111',
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
    fontFamily: 'Geist_500Medium',
  },
  stateCopy: {
    marginTop: 8,
    maxWidth: 300,
    color: '#77777B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Geist_400Regular',
  },
  permissionButton: {
    marginTop: 24,
    minWidth: 160,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202020',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Geist_500Medium',
  },
  pressed: {
    opacity: 0.78,
  },
});
