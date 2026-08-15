import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { EventSubscription } from "expo-modules-core";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import { removePushToken, savePushToken } from "@/api";
import { useAuth } from "@/context/AuthContext";
import { registerForPushNotificationAsync } from "../utils/registerForPushNotificationAsync";

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider",
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const router = useRouter();
  const { token } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  const lastKnownAuthToken = useRef<string | null>(null);
  const lastKnownPushToken = useRef<string | null>(null);

  // Register for a push token once, on mount.
  useEffect(() => {
    registerForPushNotificationAsync().then(
      (pushToken) => setExpoPushToken(pushToken),
      (reason) =>
        setError(reason instanceof Error ? reason : new Error(String(reason))),
    );

    notificationListener.current =
      Notifications.addNotificationReceivedListener((received) => {
        setNotification(received);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          reportId?: string;
        };

        if (data.reportId) {
          router.push(`/reports/${data.reportId}` as any);
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);

  useEffect(() => {
    if (!token || !expoPushToken) {
      return;
    }

    savePushToken(token, expoPushToken)
      .then(() => {
        lastKnownAuthToken.current = token;
        lastKnownPushToken.current = expoPushToken;
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      });
  }, [token, expoPushToken]);

  useEffect(() => {
    if (!token && lastKnownAuthToken.current && lastKnownPushToken.current) {
      const authToken = lastKnownAuthToken.current;
      const pushToken = lastKnownPushToken.current;

      removePushToken(authToken, pushToken).catch(() => {});

      lastKnownAuthToken.current = null;
      lastKnownPushToken.current = null;
    }
  }, [token]);

  return (
    <NotificationContext.Provider
      value={{ expoPushToken, notification, error }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
