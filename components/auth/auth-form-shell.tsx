import AppleLogo from "@/assets/logos/apple_logo.svg";
import GoogleLogo from "@/assets/logos/google_logo.svg";
import FacebookLogo from "@/assets/logos/logos_facebook.svg";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { type ReactNode } from "react";

import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type AuthFormShellProps = {
  title: string;
  subtitle: string;
  actionLabel: string;
  actionPrompt: string;
  actionLinkHref: "/register" | "/sign-in";
  actionLinkLabel: string;
  socialLabel: string;
  fields: ReactNode;
  onSubmit?: () => void;
};

type AuthFieldProps = {
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?:
    | "email"
    | "name"
    | "new-password"
    | "password"
    | "tel"
    | "username";
  rightText?: string;
};

export function AuthFormShell({
  title,
  subtitle,
  actionLabel,
  actionPrompt,
  actionLinkHref,
  actionLinkLabel,
  socialLabel,
  fields,
  onSubmit,
}: AuthFormShellProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.greenPanel}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
          style={styles.backButton}
        >
          <Ionicons color="#FFFFFF" name="arrow-back" size={26} />
        </Pressable>
      </View>
      {/* sign in container/ register container */}
      <View style={styles.sheet}>
        <ScrollView
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.fields}>{fields}</View>

          <Pressable
            accessibilityRole="button"
            onPress={onSubmit}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <LinearGradient
              colors={["rgba(141, 141, 141, 0.25)", "rgba(255, 255, 255, 0)"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.innerHighlight}
              pointerEvents="none"
            />
            <Text style={styles.primaryButtonText}>{actionLabel}</Text>
          </Pressable>

          <View style={styles.socialSection}>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerLabel}>{socialLabel}</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialIcons}>
              <Pressable accessibilityRole="button" style={styles.iconButton}>
                <GoogleLogo width={28} height={28} />
              </Pressable>

              <Pressable accessibilityRole="button" style={styles.iconButton}>
                <FacebookLogo width={28} height={28} />
              </Pressable>

              <Pressable accessibilityRole="button" style={styles.iconButton}>
                <AppleLogo width={28} height={28} />
              </Pressable>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{actionPrompt} </Text>
              <Link href={actionLinkHref} style={styles.footerLink}>
                {actionLinkLabel}
              </Link>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export function AuthField({
  label,
  placeholder,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
  autoComplete,
  rightText,
}: AuthFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {rightText ? <Text style={styles.rightText}>{rightText}</Text> : null}
      </View>

      <TextInput
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#B3B3B3"
        secureTextEntry={secureTextEntry}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#53BC43",
  },
  greenPanel: {
    flex: 0.38,
    backgroundColor: "#53BC43",
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    flex: 2.5,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
  },
  sheetContent: {
    paddingHorizontal: 34,
    paddingTop: 46,
    paddingBottom: 28,
  },
  header: {
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    color: "#000000",
    fontFamily: "Geist_500Medium",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 18,
    color: "#8A8A8A",
    fontFamily: "Geist_400Regular",
  },
  fields: {
    marginTop: 34,
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    lineHeight: 22,
    color: "#484848",
    fontFamily: "Geist_500Medium",
  },
  rightText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#777777",
    fontFamily: "Geist_400Regular",
  },
  input: {
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D8D8D8",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1F1F1F",
    backgroundColor: "#FFFFFF",
    fontFamily: "Geist_400Regular",
  },
  primaryButton: {
    marginTop: 34,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#202020",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#7f7f7f",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(66, 66, 66, 0.1)",
    borderBottomColor: "rgba(0, 0, 0, 0.35)",
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  innerHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "30%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    lineHeight: 21,
    color: "#FFFFFF",
    fontFamily: "Geist_400Regular",
  },
  socialSection: {
    marginTop: 36,
    alignItems: "center",
  },
  dividerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  divider: {
    flex: 1,
    height: 1.5,
    backgroundColor: "#E0E0E0",
  },
  dividerLabel: {
    fontSize: 16,
    lineHeight: 20,
    color: "#8D8D8D",
    fontFamily: "Geist_500Medium",
  },
  socialIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
    marginTop: 26,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 28,
  },
  footerText: {
    fontSize: 15,
    lineHeight: 18,
    color: "#9D9D9D",
    fontFamily: "Geist_400Regular",
  },
  footerLink: {
    fontSize: 15,
    lineHeight: 18,
    color: "#63B95B",
    fontFamily: "Geist_500Medium",
    textDecorationLine: "underline",
  },
});
