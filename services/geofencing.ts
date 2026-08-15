import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

// Must match the H3 resolution your backend uses (MOBILE_H3_RESOLUTION),
// only used here to size the geofence radius sensibly relative to a cell.
const GEOFENCE_APPROACH_RADIUS_METERS = 500;

// iOS hard caps at 20 simultaneously monitored regions.
const MAX_GEOFENCED_HOTSPOTS = 20;

const HOTSPOT_GEOFENCING_TASK = "pulse-guard-hotspot-geofencing";

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
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    return false;
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  return background.status === "granted";
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
    console.error("[geofencing] Failed to start geofencing:", err);
  }
}

export async function stopHotspotGeofencing(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    HOTSPOT_GEOFENCING_TASK,
  );

  if (isRegistered) {
    await Location.stopGeofencingAsync(HOTSPOT_GEOFENCING_TASK);
  }
}
