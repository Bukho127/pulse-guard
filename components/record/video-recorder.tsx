import { ThemedText } from "@/components/themed-text";
import { requestLocationPermission } from "@/services/location";
import { uploadRecordedVideo } from "@/services/video-upload";
import { Ionicons } from "@expo/vector-icons";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

const MAX_RECORDING_SECONDS = 10;

type VideoRecorderProps = {
  onClose?: () => void;
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function VideoRecorder({ onClose }: VideoRecorderProps) {
  const cameraRef = useRef<CameraView>(null);
  const isMountedRef = useRef(true);
  const isRecordingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const shouldUploadRecordingRef = useRef(true);
  const recordingPromiseRef = useRef<Promise<
    { uri: string } | undefined
  > | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPressingRecord, setIsPressingRecord] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [debugStatus, setDebugStatus] = useState("Waiting for camera");

  const hasCameraPermission = cameraPermission?.granted;
  const hasMicrophonePermission = microphonePermission?.granted;
  const hasPermissions = hasCameraPermission && hasMicrophonePermission;

  // Single, clean stop — no retry loop
  const stopActiveRecording = useCallback(() => {
    if (!isRecordingRef.current && !recordingPromiseRef.current) {
      setDebugStatus("Stop requested before recording started");
      return;
    }
    stopRequestedRef.current = true;
    setDebugStatus("Stopping recording");
    cameraRef.current?.stopRecording();
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      shouldUploadRecordingRef.current = false;
      stopActiveRecording();
      isRecordingRef.current = false;
    };
  }, [stopActiveRecording]);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordingSeconds((s) => Math.min(s + 1, MAX_RECORDING_SECONDS));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const requestPermissions = async () => {
    const [nextCamera, nextMic] = await Promise.all([
      requestCameraPermission(),
      requestMicrophonePermission(),
    ]);
    if (!nextCamera.granted || !nextMic.granted) {
      Alert.alert(
        "Permissions needed",
        "Pulse Guard needs camera and microphone access to record video.",
      );
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || !isCameraReady || isRecordingRef.current) return;

    isRecordingRef.current = true;
    stopRequestedRef.current = false;
    shouldUploadRecordingRef.current = true;
    setIsPressingRecord(true);
    setRecordingSeconds(0);
    setIsRecording(true);
    setDebugStatus("Starting recording");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // maxDuration lets the SDK handle the time limit natively
      const recordingPromise = cameraRef.current.recordAsync({
        maxDuration: MAX_RECORDING_SECONDS,
      });
      recordingPromiseRef.current = recordingPromise;
      setDebugStatus("Recording active");

      // Give the native session ~300ms to open before honouring any stop request
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (stopRequestedRef.current) {
        cameraRef.current?.stopRecording();
      }

      const video = await recordingPromise;
      setDebugStatus(
        video?.uri ? "Video saved" : "Recording stopped without video",
      );

      if (video?.uri && shouldUploadRecordingRef.current) {
        if (isMountedRef.current) {
          setIsUploading(true);
          setDebugStatus("Getting location");
        }

        const locationResult = await requestLocationPermission();
        if (locationResult.status !== "granted") {
          throw new Error(
            "Unable to attach your current location to this video.",
          );
        }

        setDebugStatus("Uploading video");
        await uploadRecordedVideo(video.uri, {
          location: {
            accuracy: locationResult.location.coords.accuracy,
            latitude: locationResult.location.coords.latitude,
            longitude: locationResult.location.coords.longitude,
            timestamp: locationResult.location.timestamp,
          },
        });
        setDebugStatus("Video uploaded");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to record video. Please try again.";
      setDebugStatus(message);
      Alert.alert("Video failed", message);
    } finally {
      if (isMountedRef.current) {
        setIsRecording(false);
        setIsPressingRecord(false);
        setIsUploading(false);
      }
      isRecordingRef.current = false;
      stopRequestedRef.current = false;
      recordingPromiseRef.current = null;
    }
  };

  const stopRecording = () => {
    setIsPressingRecord(false);
    setDebugStatus("Release detected");
    stopActiveRecording();
  };

  const closeRecorder = () => {
    shouldUploadRecordingRef.current = false;
    stopActiveRecording();
    onClose?.();
  };

  if (!cameraPermission || !microphonePermission) {
    return (
      <View style={styles.stateScreen}>
        <Pressable
          accessibilityLabel="Close camera"
          accessibilityRole="button"
          onPress={closeRecorder}
          style={({ pressed }) => [
            styles.stateCloseButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="close" size={26} color="#202020" />
        </Pressable>
        <ThemedText style={styles.stateTitle}>Preparing camera</ThemedText>
      </View>
    );
  }

  if (!hasPermissions) {
    return (
      <View style={styles.stateScreen}>
        <Pressable
          accessibilityLabel="Close camera"
          accessibilityRole="button"
          onPress={closeRecorder}
          style={({ pressed }) => [
            styles.stateCloseButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="close" size={26} color="#202020" />
        </Pressable>
        <Ionicons name="videocam-outline" size={40} color="#202020" />
        <ThemedText style={styles.stateTitle}>
          Enable video recording
        </ThemedText>
        <ThemedText style={styles.stateCopy}>
          Camera and microphone access are required because Pulse Guard records
          videos only.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => void requestPermissions()}
          style={({ pressed }) => [
            styles.permissionButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.permissionButtonText}>
            Allow access
          </ThemedText>
        </Pressable>
      </View>
    );
  }

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
          setDebugStatus("Camera ready");
        }}
        onMountError={(event) => {
          setDebugStatus(event.message);
          Alert.alert("Camera error", event.message);
        }}
        responsiveOrientationWhenOrientationLocked
        style={styles.camera}
        videoQuality="1080p"
      />

      <View pointerEvents="box-none" style={styles.topOverlay}>
        <View style={styles.statusStack}>
          <View style={styles.statusPill}>
            <View
              style={[styles.statusDot, isRecording && styles.recordingDot]}
            />
            <ThemedText style={styles.statusText}>
              {isRecording
                ? formatDuration(recordingSeconds)
                : isUploading
                  ? "Uploading"
                  : "Hold to record"}
            </ThemedText>
          </View>
          <View style={styles.debugPill}>
            <ThemedText style={styles.debugText}>{debugStatus}</ThemedText>
          </View>
        </View>
      </View>

      <Pressable
        accessibilityLabel="Close camera"
        accessibilityRole="button"
        onPress={closeRecorder}
        style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
      >
        <Ionicons name="close" size={26} color="#FFFFFF" />
      </Pressable>

      <View pointerEvents="box-none" style={styles.bottomOverlay}>
        <View
          accessible
          accessibilityLabel={
            isRecording ? "Stop video recording" : "Start video recording"
          }
          accessibilityRole="button"
          onAccessibilityTap={() => {
            if (isRecording) {
              stopRecording();
            } else {
              void startRecording();
            }
          }}
          onResponderGrant={() => {
            if (!isCameraReady || isUploading) return;
            void startRecording();
          }}
          onResponderRelease={stopRecording}
          onResponderTerminate={stopRecording}
          onStartShouldSetResponder={() => !isUploading && isCameraReady}
          onTouchCancel={stopRecording}
          onTouchEnd={stopRecording}
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive,
            (!isCameraReady || isUploading) && styles.disabledControl,
            isPressingRecord && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.recordButtonCore,
              isRecording && styles.stopButtonCore,
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  camera: {
    flex: 1,
  },
  topOverlay: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
    flexDirection: "row",
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.42)",
  },
  statusPill: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  statusStack: {
    alignItems: "center",
    gap: 8,
  },
  debugPill: {
    maxWidth: 300,
    minHeight: 30,
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.88)",
  },
  debugText: {
    color: "#202020",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    fontFamily: "Geist_400Regular",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  recordingDot: {
    backgroundColor: "#C22C2A",
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Geist_500Medium",
  },
  bottomOverlay: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  recordButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  recordButtonActive: {
    borderColor: "#C22C2A",
  },
  recordButtonCore: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#C22C2A",
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#FFFFFF",
  },
  stateCloseButton: {
    position: "absolute",
    top: 14,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    marginTop: 14,
    color: "#111111",
    fontSize: 20,
    lineHeight: 26,
    textAlign: "center",
    fontFamily: "Geist_500Medium",
  },
  stateCopy: {
    marginTop: 8,
    maxWidth: 300,
    color: "#77777B",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Geist_400Regular",
  },
  permissionButton: {
    marginTop: 24,
    minWidth: 160,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#202020",
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Geist_500Medium",
  },
  pressed: {
    opacity: 0.78,
  },
});
