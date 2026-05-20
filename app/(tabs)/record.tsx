import { VideoRecorder } from "@/components/record/video-recorder";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RecordScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();

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
