import {
  fetchUnreadNotifications,
  markNotificationAsRead,
  type Notification as ApiNotification,
} from "@/api";
import MyCustomIcon from "@/assets/icons/notification-empty-state-mobile.svg";
import NotificationIcon from "@/assets/icons/notification-icon.svg";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BRAND_GREEN = "#57BE47";

const NOTIFICATION_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> =
  {
    alert: "warning-outline",
    system: "information-circle-outline",
  };

const DEFAULT_TYPE_ICON: keyof typeof Ionicons.glyphMap =
  "notifications-outline";

type FilterKey = "all" | "alert" | "system";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  type: Exclude<FilterKey, "all">;
  raw: ApiNotification;
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "alert", label: "Alerts" },
  { key: "system", label: "System" },
];

function FilterTabs({
  activeFilter,
  onSelect,
}: {
  activeFilter: FilterKey;
  onSelect: (key: FilterKey) => void;
}) {
  return (
    <View style={styles.filterTrack}>
      {FILTERS.map((filter) => {
        const isActive = filter.key === activeFilter;

        return (
          <Pressable
            key={filter.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onSelect(filter.key)}
            style={({ pressed }) => [
              styles.filterChip,
              isActive && styles.filterChipActive,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              style={[
                styles.filterChipLabel,
                isActive && styles.filterChipLabelActive,
              ]}
            >
              {filter.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function getStringValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return null;
}

function getNotificationType(
  notification: ApiNotification,
): NotificationItem["type"] {
  const source = notification as Record<string, unknown>;
  const rawType = getStringValue(source, [
    "type",
    "category",
    "kind",
  ])?.toLowerCase();

  if (rawType === "alert" || rawType === "warning" || rawType === "incident") {
    return "alert";
  }

  return "system";
}

function formatNotificationDate(notification: ApiNotification) {
  const source = notification as Record<string, unknown>;
  const rawDate = getStringValue(source, [
    "created_at",
    "createdAt",
    "date",
    "timestamp",
  ]);

  if (!rawDate) {
    return "";
  }

  const timestamp = new Date(rawDate).getTime();

  if (Number.isNaN(timestamp)) {
    return rawDate;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function toNotificationItem(notification: ApiNotification): NotificationItem {
  const source = notification as Record<string, unknown>;
  const id =
    getStringValue(source, ["id", "notification_id", "_id"]) ??
    `${getStringValue(source, ["created_at", "createdAt", "timestamp"]) ?? "notification"}-${getStringValue(source, ["message", "body", "description"]) ?? "message"}`;
  const message =
    getStringValue(source, ["message", "body", "description", "text"]) ??
    "You have a new notification.";

  return {
    id,
    title:
      getStringValue(source, ["title", "subject", "heading"]) ??
      (getNotificationType(notification) === "alert"
        ? "Safety alert"
        : "Notification"),
    message,
    date: formatNotificationDate(notification),
    isRead: Boolean(source.read ?? source.isRead ?? false),
    type: getNotificationType(notification),
    raw: notification,
  };
}

function NotificationRow({
  item,
  onPress,
}: {
  item: NotificationItem;
  onPress: (item: NotificationItem) => void;
}) {
  const typeIcon = NOTIFICATION_TYPE_ICONS[item.type] ?? DEFAULT_TYPE_ICON;

  return (
    <Pressable
      accessibilityLabel={`${item.title}. ${item.isRead ? "Read" : "Unread"}`}
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.notificationRow,
        !item.isRead && styles.notificationRowUnread,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.notificationIconShell}>
        <Ionicons name={typeIcon} size={20} color="#FFFFFF" />
        {!item.isRead ? <View style={styles.unreadDot} /> : null}
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationTitleRow}>
          <ThemedText
            numberOfLines={1}
            style={[
              styles.notificationTitle,
              !item.isRead && styles.notificationTitleUnread,
            ]}
          >
            {item.title}
          </ThemedText>
          <ThemedText style={styles.notificationDate}>{item.date}</ThemedText>
        </View>
        <ThemedText numberOfLines={2} style={styles.notificationMessage}>
          {item.message}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function EmptyState({ activeFilter }: { activeFilter: FilterKey }) {
  const filterLabel = FILTERS.find(
    (filter) => filter.key === activeFilter,
  )?.label;
  const subtitle =
    activeFilter === "all"
      ? "New reports and updates near you will show up here."
      : `You have no ${filterLabel?.toLowerCase()} right now.`;

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconShell}>
        <MyCustomIcon width={200} height={200} />
      </View>
      <ThemedText style={styles.emptyTitle}>
        You&apos;re all caught up
      </ThemedText>
      <ThemedText style={styles.emptySubtitle}>{subtitle}</ThemedText>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(
    async (refreshing = false) => {
      if (!token) {
        setNotifications([]);
        setError("Sign in to view your notifications.");
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await fetchUnreadNotifications(token);
        setNotifications(response.notifications.map(toNotificationItem));
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load notifications.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") {
      return notifications;
    }

    return notifications.filter((item) => item.type === activeFilter);
  }, [activeFilter, notifications]);

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!token || item.isRead) {
      return;
    }

    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === item.id
          ? { ...notification, isRead: true }
          : notification,
      ),
    );

    try {
      await markNotificationAsRead(token, item.id);
    } catch {
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === item.id
            ? { ...notification, isRead: false }
            : notification,
        ),
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}
        >
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => {
              router.replace("/(tabs)/home");
            }}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="chevron-back" size={27} color="#111111" />
          </Pressable>

          <ThemedText numberOfLines={1} style={styles.headerTitle}>
            Notifications
          </ThemedText>

          <Pressable
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.headerIconButton,
              pressed && styles.pressed,
            ]}
          >
            <NotificationIcon width={24} height={24} />
          </Pressable>
        </View>

        <FilterTabs activeFilter={activeFilter} onSelect={setActiveFilter} />

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={BRAND_GREEN} />
            <ThemedText style={styles.loadingText}>
              Loading notifications...
            </ThemedText>
          </View>
        ) : (
          <FlatList
            style={styles.notificationListContainer}
            contentContainerStyle={styles.notificationList}
            data={filteredNotifications}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              error ? (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyTitle}>{error}</ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void loadNotifications()}
                    style={({ pressed }) => [
                      styles.retryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText style={styles.retryButtonText}>
                      Retry
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <EmptyState activeFilter={activeFilter} />
              )
            }
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                onRefresh={() => void loadNotifications(true)}
                refreshing={isRefreshing}
                tintColor={BRAND_GREEN}
              />
            }
            renderItem={({ item }) => (
              <NotificationRow item={item} onPress={handleNotificationPress} />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  notificationListContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F7F8",
  },
  container: {
    flex: 1,
    backgroundColor: "#F7F7F8",
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    zIndex: 2,
  },
  backButton: {
    width: 35,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "#202020",
    fontSize: 16,
    lineHeight: 21,
    textAlign: "center",
    fontFamily: "Geist_500Medium",
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  filterTrack: {
    flexDirection: "row",
    backgroundColor: "#F1F1F1",
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  filterChip: {
    flex: 1,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  filterChipLabel: {
    color: "#8A8A8A",
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "Geist_500Medium",
  },
  filterChipLabelActive: {
    color: "#202020",
  },
  notificationList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  separator: {
    height: 10,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: "#77777B",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Geist_400Regular",
  },
  notificationRow: {
    minHeight: 92,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  notificationRowUnread: {
    backgroundColor: "#F7FAF6",
    borderWidth: 1,
    borderColor: "#E1F1DE",
  },
  notificationIconShell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: BRAND_GREEN,
  },
  unreadDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#E3322B",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  notificationContent: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  notificationTitle: {
    flex: 1,
    color: "#3A3A3A",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Geist_400Regular",
  },
  notificationTitleUnread: {
    color: "#151515",
    fontFamily: "Geist_500Medium",
  },
  notificationDate: {
    color: "#8A8A8A",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Geist_400Regular",
  },
  notificationMessage: {
    marginTop: 4,
    color: "#6B6B6B",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Geist_400Regular",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIconShell: {
    minHeight: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    color: "#202020",
    fontSize: 15,
    fontFamily: "Geist_500Medium",
  },
  emptySubtitle: {
    color: "#8A8A8A",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "Geist_400Regular",
  },
  retryButton: {
    minWidth: 112,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: "#202020",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "Geist_500Medium",
  },
  pressed: {
    opacity: 0.78,
  },
});
