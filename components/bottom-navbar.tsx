import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HeatmapIcon from "@/assets/icons/heatmap-icon.svg";
import HomeIcon from "@/assets/icons/Home-icon.svg";
import RecordIcon from "@/assets/icons/record-icon.svg";
import { ThemedText } from "@/components/themed-text";

const ACTIVE_COLOR = "#57BE47";
const RECORD_COLOR = "#C22C2A";
const TEXT_COLOR = "#111111";
const INACTIVE_OPACITY = 0.72;

const TAB_CONFIG = {
  home: {
    label: "Home",
    icon: HomeIcon,
    iconWidth: 25,
    iconHeight: 28,
  },
  record: {
    label: "Record",
    icon: RecordIcon,
    iconWidth: 45,
    iconHeight: 45,
  },
  heatmap: {
    label: "Heatmaps",
    icon: HeatmapIcon,
    iconWidth: 25,
    iconHeight: 29,
  },
} as const;

type TabName = keyof typeof TAB_CONFIG;

export function BottomNavbar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const tab = TAB_CONFIG[route.name as TabName];

        if (!tab) {
          return null;
        }

        const isFocused = state.index === index;
        const Icon = tab.icon;
        const accessibilityLabel =
          descriptors[route.key].options.tabBarAccessibilityLabel ??
          `${tab.label} tab`;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : undefined}
            onPress={onPress}
            style={({ pressed }) => [
              styles.tab,
              route.name === "record" && styles.recordTab,
              pressed && styles.pressed,
            ]}
          >
            {isFocused && route.name !== "record" ? (
              <View style={styles.activeIndicator} />
            ) : null}

            <Icon
              width={tab.iconWidth}
              height={tab.iconHeight}
              style={[
                route.name !== "record" && !isFocused
                  ? styles.inactiveIcon
                  : undefined,
              ]}
            />

            <ThemedText
              style={[
                styles.label,
                route.name === "record" && styles.recordLabel,
                route.name !== "record" && !isFocused && styles.inactiveLabel,
              ]}
            >
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 74,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    zIndex: 10,
  },
  tab: {
    width: 100,
    minHeight: 68,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    position: "relative",
  },
  recordTab: {
    paddingTop: 5,
  },
  activeIndicator: {
    position: "absolute",
    top: 0,
    width: 74,
    height: 4,
    backgroundColor: ACTIVE_COLOR,
  },
  inactiveIcon: {
    opacity: INACTIVE_OPACITY,
  },
  label: {
    color: TEXT_COLOR,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Geist_400Regular",
  },
  inactiveLabel: {
    opacity: INACTIVE_OPACITY,
  },
  recordLabel: {
    color: RECORD_COLOR,
    fontSize: 11,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.78,
  },
});
