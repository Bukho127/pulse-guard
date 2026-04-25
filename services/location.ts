import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

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

    const location = await Location.getCurrentPositionAsync({});
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
