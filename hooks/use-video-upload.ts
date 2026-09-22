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
  const { showToast, updateToastProgress } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (uri: string, location: VideoLocation) => {
      setIsUploading(true);
      showToast("Sending video", "loading", {
        autoHide: false,
        progress: 0,
      });
      try {
        await uploadRecordedVideo(uri, {
          location,
          onProgress: updateToastProgress,
        });
        showToast("Video delivered", "success", { confetti: true });
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
    [showToast, updateToastProgress],
  );

  return { upload, isUploading };
}
