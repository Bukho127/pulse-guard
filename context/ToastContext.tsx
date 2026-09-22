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
import Svg, { Circle } from "react-native-svg";

type ToastType = "success" | "error" | "info" | "loading";

interface ToastData {
  message: string;
  confetti?: boolean;
  progress?: number | null;
  type: ToastType;
}

type ToastOptions = {
  autoHide?: boolean;
  confetti?: boolean;
  progress?: number | null;
};

interface ToastContextValue {
  showToast: (
    message: string,
    type?: ToastType,
    options?: ToastOptions,
  ) => void;
  updateToastProgress: (progress: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  info: "information-circle",
  loading: "cloud-upload-outline",
};

const COLORS: Record<ToastType, string> = {
  success: "#57BE47",
  error: "#E3322B",
  info: "#2F80ED",
  loading: "#57BE47",
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const PRIMARY_COLOR = "#57BE47";
const RING_SIZE = 20;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// this is the success status for when the has uploaded
const CONFETTI_PIECES = [
  { color: "#57BE47", tx: -46, ty: -32, rotate: "-32deg" },
  { color: "#FFD166", tx: -28, ty: -44, rotate: "28deg" },
  { color: "#2F80ED", tx: -10, ty: -36, rotate: "68deg" },
  { color: "#57BE47", tx: 12, ty: -44, rotate: "-42deg" },
  { color: "#E3322B", tx: 34, ty: -30, rotate: "36deg" },
  { color: "#FFD166", tx: 50, ty: -12, rotate: "74deg" },
  { color: "#2F80ED", tx: -44, ty: 4, rotate: "42deg" },
  { color: "#57BE47", tx: 42, ty: 10, rotate: "-24deg" },
];

function getVisibleRingProgress(progress: number) {
  return progress >= 1 ? 1 : Math.max(progress, 0.08);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastData | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const iconScale = useRef(new Animated.Value(0.75)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const ringProgress = useRef(new Animated.Value(0)).current;
  const ringSpin = useRef(new Animated.Value(0)).current;
  const confettiBurst = useRef(new Animated.Value(0)).current;
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringSpinLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
      ringSpinLoop.current?.stop();
    };
  }, []);

  const hideToast = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    ringSpinLoop.current?.stop();
    ringSpinLoop.current = null;

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

  const updateToastProgress = useCallback(
    (progress: number) => {
      const nextProgress = Math.max(0, Math.min(progress, 1));
      setToast((current) =>
        current?.type === "loading"
          ? { ...current, progress: nextProgress }
          : current,
      );
      Animated.timing(ringProgress, {
        toValue: getVisibleRingProgress(nextProgress),
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [ringProgress],
  );

  const showToast = useCallback(
    (message: string, type: ToastType = "info", options: ToastOptions = {}) => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      ringSpinLoop.current?.stop();
      ringSpinLoop.current = null;

      const shouldAutoHide = options.autoHide ?? type !== "loading";
      const nextProgress = options.progress ?? (type === "loading" ? 0 : null);

      setToast({
        confetti: options.confetti,
        message,
        progress: nextProgress,
        type,
      });
      opacity.setValue(0);
      translateY.setValue(-12);
      iconScale.setValue(0.75);
      iconRotate.setValue(0);
      ringProgress.setValue(
        typeof nextProgress === "number"
          ? getVisibleRingProgress(nextProgress)
          : 0,
      );
      ringSpin.setValue(0);
      confettiBurst.setValue(0);

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

      if (type === "loading") {
        ringSpinLoop.current = Animated.loop(
          Animated.timing(ringSpin, {
            toValue: 1,
            duration: 1200,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        );
        ringSpinLoop.current.start();
      }

      if (type === "success" && options.confetti) {
        Animated.sequence([
          Animated.delay(80),
          Animated.timing(confettiBurst, {
            toValue: 1,
            duration: 720,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }

      if (shouldAutoHide) {
        hideTimeout.current = setTimeout(hideToast, 2200);
      } else {
        hideTimeout.current = null;
      }
    },
    [
      confettiBurst,
      hideToast,
      iconRotate,
      iconScale,
      opacity,
      ringProgress,
      ringSpin,
      translateY,
    ],
  );

  const iconRotation = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const ringRotation = ringSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["-90deg", "270deg"],
  });
  const ringDashOffset = ringProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  return (
    <ToastContext.Provider value={{ showToast, updateToastProgress }}>
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
          {toast.confetti && (
            <View pointerEvents="none" style={styles.confettiLayer}>
              {CONFETTI_PIECES.map((piece, index) => {
                const translateX = confettiBurst.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, piece.tx],
                });
                const translateYConfetti = confettiBurst.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, piece.ty],
                });
                const confettiOpacity = confettiBurst.interpolate({
                  inputRange: [0, 0.22, 1],
                  outputRange: [0, 1, 0],
                });

                return (
                  <Animated.View
                    key={`${piece.color}-${index}`}
                    style={[
                      styles.confettiPiece,
                      {
                        backgroundColor: piece.color,
                        opacity: confettiOpacity,
                      },
                      {
                        transform: [
                          { translateX },
                          { translateY: translateYConfetti },
                          { rotate: piece.rotate },
                          { scale: iconScale },
                        ],
                      },
                    ]}
                  />
                );
              })}
            </View>
          )}
          <Animated.View
            style={[
              styles.iconShell,
              toast.type === "loading"
                ? styles.loadingIconShell
                : { backgroundColor: COLORS[toast.type] },
              {
                transform: [
                  { scale: iconScale },
                  { rotate: toast.type === "success" ? iconRotation : "0deg" },
                ],
              },
            ]}
          >
            {toast.type === "loading" ? (
              <Animated.View
                style={[
                  styles.progressRing,
                  { transform: [{ rotate: ringRotation }] },
                ]}
              >
                <Svg height={RING_SIZE} width={RING_SIZE}>
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    fill="transparent"
                    r={RING_RADIUS}
                    stroke="rgba(255, 255, 255, 0.22)"
                    strokeWidth={RING_STROKE}
                  />
                  <AnimatedCircle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    fill="transparent"
                    r={RING_RADIUS}
                    stroke={PRIMARY_COLOR}
                    strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                    strokeDashoffset={ringDashOffset}
                    strokeLinecap="round"
                    strokeWidth={RING_STROKE}
                  />
                </Svg>
              </Animated.View>
            ) : (
              <Ionicons
                name={ICONS[toast.type]}
                size={toast.type === "success" ? 16 : 15}
                color="#FFFFFF"
              />
            )}
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
    backgroundColor: "#2e2e2e",
    borderRadius: 10,
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
  loadingIconShell: {
    backgroundColor: "transparent",
  },
  progressRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  confettiLayer: {
    position: "absolute",
    left: 24,
    top: 22,
    zIndex: 1,
  },
  confettiPiece: {
    position: "absolute",
    width: 5,
    height: 9,
    borderRadius: 2,
  },
  message: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "500",
    maxWidth: 250,
  },
});
