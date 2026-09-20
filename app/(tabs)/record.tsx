import { VideoRecorder } from "@/components/record/video-recorder";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RecordScreen() {
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);

      return () => setIsFocused(false);
    }, []),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {isFocused ? (
        <VideoRecorder
          onClose={() => {
            router.replace("/(tabs)/home");
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
});
