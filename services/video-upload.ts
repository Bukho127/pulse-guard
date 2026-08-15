import { API_BASE_URL } from "@/api";
import { authFetch } from "./auth";

type VideoLocation = {
  accuracy: number | null;
  latitude: number;
  longitude: number;
  timestamp: number;
};

type UploadRecordedVideoOptions = {
  location: VideoLocation;
};

export async function uploadRecordedVideo(
  uri: string,
  options: UploadRecordedVideoOptions,
) {
  const formData = new FormData();
  formData.append("video", {
    uri,
    name: "pulse-guard-recording.mp4",
    type: "video/mp4",
  } as unknown as Blob);
  formData.append("latitude", String(options.location.latitude));
  formData.append("longitude", String(options.location.longitude));
  formData.append("accuracy", String(options.location.accuracy ?? ""));
  formData.append(
    "recordedAt",
    new Date(options.location.timestamp).toISOString(),
  );

  const response = await authFetch(`${API_BASE_URL}/incidents`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Video upload failed with status ${response.status}.`);
  }
}
