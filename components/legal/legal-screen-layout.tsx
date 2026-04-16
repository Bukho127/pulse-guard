import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

type LegalScreenLayoutProps = PropsWithChildren<{
  title: string;
  updatedAt: string;
}>;

type LegalSectionProps = PropsWithChildren<{
  title: string;
}>;

export function LegalScreenLayout({
  title,
  updatedAt,
  children,
}: LegalScreenLayoutProps) {
  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}
        overScrollMode="never"
        bounces={false}>
        <ThemedText type="title" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={styles.updatedAt}>{updatedAt}</ThemedText>
        {children}
      </ScrollView>
    </ThemedView>
  );
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
      <SectionBody>{children}</SectionBody>
    </View>
  );
}

function SectionBody({ children }: { children: ReactNode }) {
  if (typeof children === "string") {
    return <ThemedText style={styles.body}>{children}</ThemedText>;
  }

  return children;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 24,
  },
  title: {
    lineHeight: 38,
  },
  updatedAt: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
  section: {
    gap: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
  },
});
