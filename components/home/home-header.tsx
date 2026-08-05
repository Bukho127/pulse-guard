import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { fetchCurrentUser } from "@/api";
import NotificationIcon from "@/assets/icons/notification-icon.svg";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { requestLocationPermission } from "@/services/location";

const FALLBACK_LOCATION = "Fetching location...";
const FALLBACK_USER_NAME = "Ratiloe Mbonani";

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

export function HomeHeader() {
  const router = useRouter();
  const { token } = useAuth();
  const { notification } = useNotification();
  const [locationLabel, setLocationLabel] = useState(FALLBACK_LOCATION);
  const [userName, setUserName] = useState(FALLBACK_USER_NAME);

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
        }
      } catch {
        if (isActive) {
          setUserName(FALLBACK_USER_NAME);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isActive = false;
    };
  }, [token]);

  const initials = getInitials(userName);

  return (
    <View style={styles.header}>
      <View style={styles.profileGroup}>
        <Pressable
          accessibilityLabel="Refresh current location"
          accessibilityRole="button"
          onPress={() => {
            void loadLocation();
          }}
          style={({ pressed }) => [
            styles.locationButton,
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
        {notification ? <View style={styles.notificationDot} /> : null}
      </Pressable>
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
  locationButton: {
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
  notificationDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E3322B",
  },
  pressed: {
    opacity: 0.78,
  },
});
