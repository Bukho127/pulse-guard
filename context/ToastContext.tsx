import { Ionicons } from "@expo/vector-icons";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error" | "info";

interface ToastData {
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  info: "information-circle",
};

const COLORS: Record<ToastType, string> = {
  success: "#57BE47",
  error: "#E3322B",
  info: "#2F80ED",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastData | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const iconScale = useRef(new Animated.Value(0.75)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
    };
  }, []);

  const hideToast = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -12,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      setToast({ message, type });
      opacity.setValue(0);
      translateY.setValue(-12);
      iconScale.setValue(0.75);
      iconRotate.setValue(0);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(iconScale, {
            toValue: 1.18,
            friction: 4,
            tension: 180,
            useNativeDriver: true,
          }),
          Animated.spring(iconScale, {
            toValue: 1,
            friction: 5,
            tension: 160,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(iconRotate, {
          toValue: type === "success" ? 1 : 0,
          duration: 420,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
      ]).start();

      hideTimeout.current = setTimeout(hideToast, 2200);
    },
    [hideToast, iconRotate, iconScale, opacity, translateY],
  );

  const iconRotation = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.container,
            {
              opacity,
              top: Math.max(insets.top + 10, 28),
              transform: [{ translateY }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.iconShell,
              { backgroundColor: COLORS[toast.type] },
              {
                transform: [
                  { scale: iconScale },
                  { rotate: toast.type === "success" ? iconRotation : "0deg" },
                ],
              },
            ]}
          >
            <Ionicons name={ICONS[toast.type]} size={15} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.message} numberOfLines={1}>
            {toast.message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    maxWidth: "88%",
    minHeight: 44,
    backgroundColor: "#202020",
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 999,
  },
  iconShell: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "500",
    maxWidth: 250,
  },
});
