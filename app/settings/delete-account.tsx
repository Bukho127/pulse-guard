import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";

export default function DeleteAccountScreen() {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Delete account</ThemedText>
      {/* TODO: implement confirmation flow (e.g. re-auth or "type DELETE"),
          explain what happens to the user's data/reports, then call the
          delete-account API and log the user out on success */}
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
