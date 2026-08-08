import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";

export default function EditProfileScreen() {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Edit profile</ThemedText>
      {/* TODO: implement edit profile form */}
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
