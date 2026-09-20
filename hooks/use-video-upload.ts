import { useToast } from "@/context/ToastContext";
import { uploadRecordedVideo } from "@/services/video-upload";
import { useCallback, useState } from "react";

type VideoLocation = {
  accuracy: number | null;
  latitude: number;
  longitude: number;
  timestamp: number;
};

export function useVideoUpload() {
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (uri: string, location: VideoLocation) => {
      setIsUploading(true);
      try {
        await uploadRecordedVideo(uri, { location });
        showToast("Video uploaded successfully", "success");
      } catch (err) {
        showToast(
          err instanceof Error
            ? err.message
            : "Upload failed. Please try again.",
          "error",
        );
        throw err; // re-throw so the caller can still react if needed
      } finally {
        setIsUploading(false);
      }
    },
    [showToast],
  );

  return { upload, isUploading };
}
