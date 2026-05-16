import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';

import NotificationIcon from '@/assets/icons/notification-icon.svg';
import { ThemedText } from '@/components/themed-text';
import { DUMMY_NOTIFICATIONS, type NotificationItem } from '@/constants/notification-data';

function NotificationRow({ item }: { item: NotificationItem }) {
  return (
    <View style={styles.notificationRow}>
      <View style={styles.notificationIconShell}>
        <View style={styles.notificationIconCore} />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationTitleRow}>
          <ThemedText numberOfLines={1} style={styles.notificationTitle}>
            {item.title}
          </ThemedText>
          <ThemedText style={styles.notificationDate}>{item.date}</ThemedText>
        </View>
        <ThemedText style={styles.notificationMessage}>{item.message}</ThemedText>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => {
              router.replace('/(tabs)/home');
            }}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={27} color="#111111" />
          </Pressable>

          <ThemedText style={styles.headerTitle}>Notifications</ThemedText>

          <Pressable
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}>
            <NotificationIcon width={24} height={24} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.notificationList}
          showsVerticalScrollIndicator={false}>
          {DUMMY_NOTIFICATIONS.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 80,
    paddingHorizontal: 24,
    paddingTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 7,
    zIndex: 2,
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F3F3',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  headerTitle: {
    position: 'absolute',
    top: 44,
    left: 84,
    right: 84,
    color: '#202020',
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Geist_500Medium',
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationList: {
    paddingBottom: 18,
  },
  notificationRow: {
    minHeight: 106,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#F1F1F1',
    borderBottomWidth: 4,
    borderBottomColor: '#FFFFFF',
  },
  notificationIconShell: {
    width: 47,
    height: 47,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F58AF',
  },
  notificationIconCore: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#57BE47',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationContent: {
    flex: 1,
    minWidth: 0,
    paddingTop: 4,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationTitle: {
    flex: 1,
    color: '#060606',
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Geist_500Medium',
  },
  notificationDate: {
    color: '#000000',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Geist_400Regular',
  },
  notificationMessage: {
    marginTop: 8,
    color: '#444444',
    fontSize: 15,
    lineHeight: 21,
    fontFamily: 'Geist_400Regular',
  },
  pressed: {
    opacity: 0.78,
  },
});
