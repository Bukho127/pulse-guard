const VIDEO_UPLOAD_URL = 'https://example.com/api/videos';

export async function uploadRecordedVideo(uri: string) {
  const formData = new FormData();
  formData.append('video', {
    uri,
    name: 'pulse-guard-recording.mp4',
    type: 'video/mp4',
  } as unknown as Blob);

  const response = await fetch(VIDEO_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Video upload failed with status ${response.status}.`);
  }
}
