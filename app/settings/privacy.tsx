import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";

export default function PrivacySettingsScreen() {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Privacy & safety</ThemedText>
      {/* TODO: implement visibility settings and blocked-users management */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    color: "#202020",
    fontFamily: "Geist_500Medium",
  },
});
