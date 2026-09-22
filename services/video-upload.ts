import { API_BASE_URL } from "@/api";
import { getToken } from "./auth";

type VideoLocation = {
  accuracy: number | null;
  latitude: number;
  longitude: number;
  timestamp: number;
};

type UploadRecordedVideoOptions = {
  location: VideoLocation;
  onProgress?: (progress: number) => void;
};

type ReactNativeFormDataFile = {
  name: string;
  type: string;
  uri: string;
};

function getVideoFileName(uri: string) {
  const fileName = uri.split("/").pop()?.split("?")[0];

  return fileName && fileName.includes(".")
    ? fileName
    : "pulse-guard-recording.mp4";
}

function getUploadErrorMessage(status: number, text: string) {
  if (!text) {
    return `Video upload failed with status ${status}.`;
  }

  try {
    const payload = JSON.parse(text) as Record<string, unknown>;
    const message = payload.message || payload.error;

    if (Array.isArray(message)) {
      return message.filter(Boolean).join(", ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  } catch {
    // Use the raw response text below.
  }

  return text;
}

function sendMultipartRequest(
  url: string,
  formData: FormData,
  token: string | null,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }

      reject(
        new Error(getUploadErrorMessage(request.status, request.responseText)),
      );
    };

    request.onerror = () => {
      reject(new Error("Video upload failed. Check your connection."));
    };

    request.ontimeout = () => {
      reject(new Error("Video upload timed out. Please try again."));
    };

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress?.(Math.min(event.loaded / event.total, 1));
    };

    request.open("POST", url);
    request.timeout = 60000;

    if (token) {
      request.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    request.send(formData);
  });
}

export async function uploadRecordedVideo(
  uri: string,
  options: UploadRecordedVideoOptions,
) {
  const formData = new FormData();
  const videoFile: ReactNativeFormDataFile = {
    uri,
    name: getVideoFileName(uri),
    type: "video/mp4",
  };

  formData.append("video", videoFile as unknown as Blob);
  formData.append("latitude", String(options.location.latitude));
  formData.append("longitude", String(options.location.longitude));
  formData.append("accuracy", String(options.location.accuracy ?? ""));
  formData.append(
    "recordedAt",
    new Date(options.location.timestamp).toISOString(),
  );

  await sendMultipartRequest(
    `${API_BASE_URL}/incidents`,
    formData,
    await getToken(),
    options.onProgress,
  );
}
