import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

// Must match the H3 resolution your backend uses (MOBILE_H3_RESOLUTION),
// only used here to size the geofence radius sensibly relative to a cell.
const GEOFENCE_APPROACH_RADIUS_METERS = 500;

// iOS hard caps at 20 simultaneously monitored regions.
const MAX_GEOFENCED_HOTSPOTS = 20;

const HOTSPOT_GEOFENCING_TASK = "pulse-guard-hotspot-geofencing";

let geofencingPermissionPromise: Promise<boolean> | null = null;
let activeRegionKey: string | null = null;

export interface GeofenceHotspot {
  id: string;
  latitude: number;
  longitude: number;
  reportedCases: number;
}

// This task is invoked by the OS when the user enters a geofenced region.
//this ensures that the user get notified even when they are not logged in to the app.
TaskManager.defineTask(
  HOTSPOT_GEOFENCING_TASK,
  async ({ data, error }: any) => {
    if (error) {
      console.error("[geofencing] Task error:", error.message);
      return;
    }

    const eventType: Location.GeofencingEventType = data.eventType;
    const region: Location.LocationRegion = data.region;

    if (eventType === Location.GeofencingEventType.Enter) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Approaching a hotspot",
          body: "You're nearing an area with recent safety reports. Stay alert.",
          data: { regionId: region.identifier },
        },
        trigger: null,
      });
    }
    //returning false here will prevent the task from being re-invoked for the same region until the user exits and re-enters it.
    return false;
  },
);

// Request the permission tier iOS geofencing requires
export async function requestGeofencingPermission(): Promise<boolean> {
  if (!geofencingPermissionPromise) {
    geofencingPermissionPromise = (async () => {
      const foreground = await Location.getForegroundPermissionsAsync();
      const hasForegroundPermission =
        foreground.status === "granted" ||
        (await Location.requestForegroundPermissionsAsync()).status ===
          "granted";

      if (!hasForegroundPermission) {
        return false;
      }

      const background = await Location.getBackgroundPermissionsAsync();
      return (
        background.status === "granted" ||
        (await Location.requestBackgroundPermissionsAsync()).status ===
          "granted"
      );
    })()
      .then((hasPermission) => {
        if (!hasPermission) {
          geofencingPermissionPromise = null;
        }

        return hasPermission;
      })
      .catch((error) => {
        geofencingPermissionPromise = null;
        throw error;
      });
  }

  return geofencingPermissionPromise;
}

export async function startHotspotGeofencing(
  hotspots: GeofenceHotspot[],
): Promise<void> {
  const hasPermission = await requestGeofencingPermission();
  if (!hasPermission) {
    console.warn(
      "[geofencing] Background location permission not granted — skipping hotspot geofencing.",
    );
    return;
  }

  // Only the nearest N, since the OS caps the number of simultaneously monitored regions (20 on iOS).
  const nearestHotspots = hotspots.slice(0, MAX_GEOFENCED_HOTSPOTS);

  if (nearestHotspots.length === 0) {
    await stopHotspotGeofencing();
    return;
  }

  const nextRegionKey = getRegionKey(nearestHotspots);
  if (nextRegionKey === activeRegionKey) {
    return;
  }

  activeRegionKey = nextRegionKey;

  const regions: Location.LocationRegion[] = nearestHotspots.map((spot) => ({
    identifier: spot.id,
    latitude: spot.latitude,
    longitude: spot.longitude,
    radius: GEOFENCE_APPROACH_RADIUS_METERS,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));

  try {
    // Calling this again with a new region array replaces the
    // previously-monitored set — safe to call repeatedly as hotspots
    // change (e.g. on every analytics refresh).
    await Location.startGeofencingAsync(HOTSPOT_GEOFENCING_TASK, regions);
  } catch (err) {
    activeRegionKey = null;
    console.error("[geofencing] Failed to start geofencing:", err);
  }
}

export async function stopHotspotGeofencing(): Promise<void> {
  activeRegionKey = null;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    HOTSPOT_GEOFENCING_TASK,
  );

  if (isRegistered) {
    await Location.stopGeofencingAsync(HOTSPOT_GEOFENCING_TASK);
  }
}

function getRegionKey(hotspots: GeofenceHotspot[]): string {
  return hotspots
    .map(
      (spot) =>
        `${spot.id}:${spot.latitude.toFixed(6)}:${spot.longitude.toFixed(6)}`,
    )
    .join("|");
}
