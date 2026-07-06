import { StyleSheet, Switch, View } from "react-native";

import { ExternalLink } from "@/components/external-link";
import { LegalScreenLayout, LegalSection } from "@/components/legal/legal-screen-layout";
import { ThemedText } from "@/components/themed-text";
import { TERMS_OF_USE_URL } from "@/constants/legal-links";
import { useLegalAcceptance } from "@/context/LegalAcceptanceContext";

export function TermsOfServiceScreen() {
  const { hasAcceptedTerms, isLoading, setHasAcceptedTerms } = useLegalAcceptance();

  return (
    <LegalScreenLayout title="Terms of Service" updatedAt="Last updated: April 9, 2026">
      <LegalSection title="Using Pulse Guard">
        Pulse Guard is provided to help users access safety-focused features and related
        information. By using the app, you agree to use it lawfully and responsibly.
      </LegalSection>

      <LegalSection title="Your responsibilities">
        You are responsible for the information you provide, the permissions you enable, and how
        you use the service. You should keep your device secure and report misuse when necessary.
      </LegalSection>

      <LegalSection title="Service changes">
        We may update, improve, or discontinue features over time. Continued use of the app after
        changes means you accept the revised terms.
      </LegalSection>

      <View style={styles.linkCard}>
        <View style={styles.linkCopy}>
          <ThemedText type="defaultSemiBold">Full terms of use</ThemedText>
          <ThemedText style={styles.acceptanceText}>
            Read the current Pulse Guard Terms of Use before accepting.
          </ThemedText>
        </View>
        <ExternalLink href={TERMS_OF_USE_URL}>
          <ThemedText style={styles.linkText}>Open</ThemedText>
        </ExternalLink>
      </View>

      <View style={styles.acceptanceCard}>
        <View style={styles.acceptanceCopy}>
          <ThemedText type="defaultSemiBold">Accept terms of use</ThemedText>
          <ThemedText style={styles.acceptanceText}>
            Toggle this on to confirm that you have read and accepted the Terms of Service.
          </ThemedText>
          <ThemedText
            style={[
              styles.acceptanceStatus,
              hasAcceptedTerms ? styles.accepted : styles.pending,
            ]}>
            {isLoading
              ? "Checking acceptance status..."
              : hasAcceptedTerms
                ? "Terms accepted"
                : "Terms not accepted yet"}
          </ThemedText>
        </View>

        <Switch
          accessibilityLabel="Accept terms of use"
          disabled={isLoading}
          onValueChange={setHasAcceptedTerms}
          trackColor={{ false: "#D1D5DB", true: "#111827" }}
          thumbColor="#FFFFFF"
          value={hasAcceptedTerms}
        />
      </View>
    </LegalScreenLayout>
  );
}

const styles = StyleSheet.create({
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  linkCopy: {
    flex: 1,
    gap: 6,
  },
  linkText: {
    color: "#57BE47",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Geist_500Medium",
    textDecorationLine: "underline",
  },
  acceptanceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  acceptanceCopy: {
    flex: 1,
    gap: 6,
  },
  acceptanceText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4B5563",
  },
  acceptanceStatus: {
    fontSize: 13,
    lineHeight: 18,
  },
  accepted: {
    color: "#047857",
  },
  pending: {
    color: "#B45309",
  },
});
