import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { Href, useRouter } from "expo-router";
import {
  openBrowserAsync,
  WebBrowserPresentationStyle,
} from "expo-web-browser";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Linking,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchCurrentUser, fetchNotificationsCount } from "@/api";
import NotificationIcon from "@/assets/icons/notification-icon.svg";
import { ThemedText } from "@/components/themed-text";
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "@/constants/legal-links";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { requestLocationPermission } from "@/services/location";

const FALLBACK_LOCATION = "Fetching location...";
const FALLBACK_USER_NAME = "Ratiloe Mbonani";
const FALLBACK_USER_EMAIL = "Profile";

type DrawerItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  helper: string;
  onPress: () => void;
  labelStyle?: StyleProp<TextStyle>;
  iconColor?: string;
};

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "U";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatLocation(places: Location.LocationGeocodedAddress[]) {
  const place = places[0];

  if (!place) {
    return "Current location";
  }

  const area = place.district ?? place.name ?? place.street;
  const city = place.city ?? place.subregion ?? place.region;
  const parts = [area, city].filter(
    (part, index, list): part is string =>
      Boolean(part) && list.indexOf(part) === index,
  );

  return parts.length > 0 ? parts.join(", ") : "Current location";
}

function DrawerItem({
  icon,
  label,
  helper,
  onPress,
  labelStyle,
  iconColor,
}: DrawerItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.drawerItem, pressed && styles.pressed]}
    >
      <View style={styles.drawerItemIcon}>
        <Ionicons name={icon} size={19} color={iconColor || "#202020"} />
      </View>
      <View style={styles.drawerItemText}>
        <ThemedText style={[styles.drawerItemLabel, labelStyle]}>
          {label}
        </ThemedText>
        <ThemedText style={styles.drawerItemHelper}>{helper}</ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#A1A1A1" />
    </Pressable>
  );
}

export function HomeHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { token, logout } = useAuth();
  const { notification } = useNotification();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [locationLabel, setLocationLabel] = useState(FALLBACK_LOCATION);
  const [userName, setUserName] = useState(FALLBACK_USER_NAME);
  const [userEmail, setUserEmail] = useState(FALLBACK_USER_EMAIL);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isProfileDrawerVisible, setIsProfileDrawerVisible] = useState(false);
  const drawerProgress = useRef(new Animated.Value(0)).current;
  const drawerWidth = Math.min(width * 0.82, 340);

  const loadLocation = useCallback(async () => {
    setLocationLabel(FALLBACK_LOCATION);

    const result = await requestLocationPermission();

    if (result.status !== "granted") {
      setLocationLabel("Location unavailable");
      return;
    }

    try {
      const [place] = await Location.reverseGeocodeAsync({
        latitude: result.location.coords.latitude,
        longitude: result.location.coords.longitude,
      });

      setLocationLabel(formatLocation(place ? [place] : []));
    } catch {
      setLocationLabel("Current location");
    }
  }, []);

  useEffect(() => {
    void loadLocation();
  }, [loadLocation]);

  useEffect(() => {
    let isActive = true;

    async function loadCurrentUser() {
      if (!token) {
        return;
      }

      try {
        const user = await fetchCurrentUser(token);

        if (isActive) {
          setUserName(user.name);
          setUserEmail(user.email ?? FALLBACK_USER_EMAIL);
        }
      } catch {
        if (isActive) {
          setUserName(FALLBACK_USER_NAME);
          setUserEmail(FALLBACK_USER_EMAIL);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isActive = false;
    };
  }, [token]);

  const loadUnreadNotificationCount = useCallback(async () => {
    if (!token) {
      setUnreadNotificationCount(0);
      return;
    }

    try {
      const count = await fetchNotificationsCount(token);
      setUnreadNotificationCount(count);
    } catch {
      setUnreadNotificationCount(0);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadUnreadNotificationCount();
    }, [loadUnreadNotificationCount]),
  );

  useEffect(() => {
    void loadUnreadNotificationCount();
  }, [loadUnreadNotificationCount, notification]);

  useEffect(() => {
    if (!isProfileDrawerVisible) {
      return;
    }

    Animated.timing(drawerProgress, {
      toValue: isProfileDrawerOpen ? 1 : 0,
      duration: isProfileDrawerOpen ? 180 : 140,
      easing: isProfileDrawerOpen
        ? Easing.out(Easing.cubic)
        : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !isProfileDrawerOpen) {
        setIsProfileDrawerVisible(false);
      }
    });
  }, [drawerProgress, isProfileDrawerOpen, isProfileDrawerVisible]);

  const initials = getInitials(userName);

  const openProfileDrawer = () => {
    drawerProgress.setValue(0);
    setIsProfileDrawerVisible(true);
    setIsProfileDrawerOpen(true);
  };

  const closeProfileDrawer = () => {
    setIsProfileDrawerOpen(false);
  };

  const navigateFromDrawer = (href: Href) => {
    closeProfileDrawer();
    router.push(href);
  };

  const openExternalLinkFromDrawer = async (href: string) => {
    closeProfileDrawer();

    if (process.env.EXPO_OS === "web") {
      await Linking.openURL(href);
      return;
    }

    await openBrowserAsync(href, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  };

  const handleLogout = async () => {
    closeProfileDrawer();
    await logout();
    router.replace("/sign-in");
  };

  return (
    <View style={styles.header}>
      <View style={styles.profileGroup}>
        <Pressable
          accessibilityLabel="Open profile menu"
          accessibilityRole="button"
          onPress={() => {
            openProfileDrawer();
          }}
          style={({ pressed }) => [
            styles.profileButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.initialsText}>{initials}</ThemedText>
        </Pressable>

        <View style={styles.userTextGroup}>
          <ThemedText style={styles.userName}>{userName}</ThemedText>
          <ThemedText numberOfLines={1} style={styles.locationText}>
            {locationLabel}
          </ThemedText>
        </View>
      </View>

      <Pressable
        accessibilityLabel="Notifications"
        accessibilityRole="button"
        onPress={() => {
          router.push("/(tabs)/notifications");
        }}
        style={({ pressed }) => [
          styles.notificationButton,
          pressed && styles.pressed,
        ]}
      >
        <NotificationIcon width={24} height={24} />
        {unreadNotificationCount > 0 ? (
          <View style={styles.notificationBadge}>
            <ThemedText
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.notificationBadgeText}
            >
              {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
            </ThemedText>
          </View>
        ) : null}
      </Pressable>

      <Modal
        animationType="none"
        onRequestClose={closeProfileDrawer}
        transparent
        visible={isProfileDrawerVisible}
      >
        <View style={styles.drawerOverlay}>
          <Animated.View
            style={[
              styles.drawerScrim,
              {
                opacity: drawerProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          >
            <Pressable
              accessibilityLabel="Close profile menu"
              accessibilityRole="button"
              onPress={closeProfileDrawer}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.drawer,
              {
                width: drawerWidth,
                paddingTop: Math.max(insets.top, 18) + 14,
                paddingBottom: Math.max(insets.bottom, 18),
                transform: [
                  {
                    translateX: drawerProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-drawerWidth, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.drawerHeader}>
              <View style={styles.drawerAvatar}>
                <ThemedText style={styles.drawerAvatarText}>
                  {initials}
                </ThemedText>
              </View>
              <View style={styles.drawerProfileText}>
                <ThemedText style={styles.drawerName}>{userName}</ThemedText>
                <ThemedText numberOfLines={1} style={styles.drawerEmail}>
                  {userEmail}
                </ThemedText>
              </View>
              <Pressable
                accessibilityLabel="Close profile menu"
                accessibilityRole="button"
                onPress={closeProfileDrawer}
                style={({ pressed }) => [
                  styles.drawerCloseButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="close" size={21} color="#202020" />
              </Pressable>
            </View>

            <View style={styles.drawerLocation}>
              <Ionicons name="location-outline" size={18} color="#57BE47" />
              <ThemedText numberOfLines={2} style={styles.drawerLocationText}>
                {locationLabel}
              </ThemedText>
            </View>

            {/* these are the items in the drawer menu, each item has an icon,
              label, helper text, and an onPress function that navigates to a
              different screen or opens an external link */}

            <ThemedText style={styles.drawerSectionLabel}>Account</ThemedText>
            <View style={styles.drawerSection}>
              <DrawerItem
                icon="notifications-circle-outline"
                label="Notification settings"
                helper="Choose what alerts you receive"
                onPress={() => navigateFromDrawer("/settings/notifications")}
              />
              <DrawerItem
                icon="shield-outline"
                label="Privacy & safety"
                helper="Manage visibility and blocked users"
                onPress={() => navigateFromDrawer("/settings/privacy")}
              />
            </View>

            <ThemedText style={styles.drawerSectionLabel}>Support</ThemedText>
            <View style={styles.drawerSection}>
              <DrawerItem
                icon="help-circle-outline"
                label="Help center"
                helper="FAQs and how-to guides"
                onPress={() => navigateFromDrawer("/support/help")}
              />
              <DrawerItem
                icon="flag-outline"
                label="Report a problem"
                helper="Tell us about a bug or issue"
                onPress={() => navigateFromDrawer("/support/report")}
              />
            </View>

            <ThemedText style={styles.drawerSectionLabel}>Legal</ThemedText>
            <View style={styles.drawerSection}>
              <DrawerItem
                icon="document-text-outline"
                label="Terms of service"
                helper="Read app usage terms"
                onPress={() => {
                  void openExternalLinkFromDrawer(TERMS_OF_USE_URL);
                }}
              />
              <DrawerItem
                icon="shield-checkmark-outline"
                label="Privacy policy"
                helper="See how data is handled"
                onPress={() => {
                  void openExternalLinkFromDrawer(PRIVACY_POLICY_URL);
                }}
              />
            </View>

            <ThemedText style={styles.drawerSectionLabel}>
              Account management
            </ThemedText>
            <View style={styles.drawerSection}>
              <DrawerItem
                icon="trash-outline"
                label="Delete account"
                helper="remove your account and data"
                labelStyle={styles.drawerDangerLabel}
                iconColor="#C4291C"
                onPress={() => navigateFromDrawer("/settings/delete-account")}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void handleLogout();
              }}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="log-out-outline" size={19} color="#C4291C" />
              <ThemedText style={styles.logoutText}>Sign out</ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginBottom: 12,
    justifyContent: "space-between",
  },
  profileGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileButton: {
    width: 45,
    height: 45,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#57BE47",
  },
  initialsText: {
    color: "#FFFFFF",
    fontSize: 19,
    lineHeight: 20,
    fontFamily: "Geist_500Medium",
  },
  userTextGroup: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  userName: {
    color: "#202020",
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "Geist_500Medium",
  },
  locationText: {
    color: "#77777B",
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "Geist_400Regular",
  },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    backgroundColor: "#E3322B",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    lineHeight: 13,
    fontFamily: "Geist_500Medium",
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: "row",
  },
  drawerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.34)",
  },
  drawer: {
    maxWidth: 340,
    height: "100%",
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 10,
  },
  drawerHeader: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  drawerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#57BE47",
  },
  drawerAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "Geist_500Medium",
  },
  drawerProfileText: {
    flex: 1,
    minWidth: 0,
  },
  drawerName: {
    color: "#202020",
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "Geist_500Medium",
  },
  drawerEmail: {
    marginTop: 2,
    color: "#77777B",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Geist_400Regular",
  },
  drawerCloseButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerLocation: {
    minHeight: 44,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: "#F7FAF6",
    borderWidth: 1,
    borderColor: "#E1F1DE",
  },
  drawerSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8A8A8A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 6,
  },
  drawerLocationText: {
    flex: 1,
    minWidth: 0,
    color: "#4E4E4E",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Geist_400Regular",
  },
  drawerSection: {
    marginTop: 22,
    gap: 4,
  },
  drawerItem: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  drawerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F4",
  },
  drawerItemText: {
    flex: 1,
    minWidth: 0,
  },
  drawerItemLabel: {
    color: "#202020",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Geist_500Medium",
  },
  drawerItemHelper: {
    marginTop: 2,
    color: "#77777B",
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Geist_400Regular",
  },
  drawerDangerLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#C4291C",
    letterSpacing: 0.1,
  },
  logoutButton: {
    minHeight: 48,
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FFF5F4",
  },
  logoutText: {
    color: "#C4291C",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Geist_500Medium",
  },
  pressed: {
    opacity: 0.78,
  },
});
