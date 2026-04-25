import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { openLocationSettings, requestLocationPermission } from '@/services/location';

export function useLocationPermissionOnLaunch(enabled: boolean) {
  const hasRequestedLocationRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasRequestedLocationRef.current) {
      return;
    }

    hasRequestedLocationRef.current = true;

    const requestLocationOnLaunch = async () => {
      const result = await requestLocationPermission();

      if (result.status === 'granted') {
        return;
      }

      if (result.status === 'denied') {
        Alert.alert(
          'Permission needed',
          'Please allow location access so the app can use your current position.'
        );
        return;
      }

      if (result.status === 'services_disabled') {
        Alert.alert(
          'Turn on location',
          'Your phone location is off. Open settings and turn on location services.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Open settings',
              onPress: () => {
                void openLocationSettings();
              },
            },
          ]
        );
        return;
      }

      Alert.alert('Location error', result.message);
    };

    void requestLocationOnLaunch();
  }, [enabled]);
}
