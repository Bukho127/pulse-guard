import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

const LOCATION_TIMEOUT_MS = 8000;

export type LocationPermissionResult =
  | {
    status: 'granted';
    location: Location.LocationObject;
  }
  | {
    status: 'denied';
  }
  | {
    status: 'services_disabled';
  }
  | {
    status: 'error';
    message: string;
  };

export async function requestLocationPermission(): Promise<LocationPermissionResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      return { status: 'denied' };
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();

    if (!servicesEnabled) {
      return { status: 'services_disabled' };
    }

    const location = await getAvailableLocation();
    return { status: 'granted', location };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to read the current location.';

    return { status: 'error', message };
  }
}

export async function openLocationSettings(): Promise<void> {
  if (Platform.OS === 'android' && typeof Linking.sendIntent === 'function') {
    await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
    return;
  }

  await Linking.openSettings();
}

async function getAvailableLocation() {
  try {
    return await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      LOCATION_TIMEOUT_MS
    );
  } catch (error) {
    const lastKnownLocation = await Location.getLastKnownPositionAsync({
      maxAge: 10 * 60 * 1000,
      requiredAccuracy: 5000,
    });

    if (lastKnownLocation) {
      return lastKnownLocation;
    }

    throw error;
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Unable to read the current location.'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
