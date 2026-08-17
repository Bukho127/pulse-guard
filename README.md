# Pulse Guard

Pulse Guard is a community safety platform that lets users report incidents via short video recordings, tracks report status in real time, and surfaces localized crime analytics to help people avoid high-risk areas — all while giving security personnel a live queue of incidents to acknowledge and act on.

The project is split into three services: an Expo/React Native mobile app, a Node/Express backend, and a Go media-processing worker, orchestrated locally with Docker Compose.

## Overview

- Track nearby safety activity through the home and heatmap experience
- Review notifications and incident updates in one place
- Capture and upload video evidence when needed
- Access onboarding, privacy, and legal information from the app

## Core Features

- **Video incident reporting** — users record a short video directly in-app; it's uploaded, transcoded/handled by the Go worker, and persisted to Azure Blob Storage.
- **Real-time incident status** — an uploaded → sent → acknowledged stepper reflects live status as personnel act on a report.
- **Localized crime analytics** — the mobile app requests a live risk assessment for the user's current area, computed server-side using H3 hexagonal indexing.
- **Native Google Sign-In** — full native (non-browser) OAuth flow with backend ID token verification.
- **Push & local notifications** — server-driven push notifications for incident acknowledgment, and on-device local notifications when a user physically approaches a reported hotspot.
- **Personnel dashboard hooks** — incident acknowledgment triggers notifications to the reporting user and updates their report's status stepper in real time.

---

## System Design

### Incident Reporting Pipeline

1. User records a video in the mobile app (`expo-camera`), capped at a configurable max duration.
2. On stop, the app resolves the device's current GPS location and uploads the video as `multipart/form-data` to `POST /incidents`.
3. The Express backend:
   - Persists an `Incident` record immediately with a placeholder `video_url: "processing"`.
   - Reverse-geocodes the coordinates for a human-readable address (non-fatal if it fails).
   - Hands the video off to the Go worker via an internal HTTP call, using a **shared Docker volume** so both containers can access the uploaded file on disk.
   - Queues a notification job to alert nearby personnel.
4. The Go worker picks up the job from its internal queue, uploads the video to Azure Blob Storage, and calls back to `POST /internal/video-complete` with the final URL.
5. The backend updates the incident's `video_url`, completing the pipeline.

> **Design note:** the video handoff between the Node backend and the Go worker relies on both containers sharing a mounted volume for the uploads directory. If you see incidents stuck with `video_url: "processing"` and the Go worker logs a `no such file or directory` error, check that the shared volume is correctly configured in `docker-compose.yml`.

### H3-Based Local Crime Analytics

Rather than running unbounded queries against all incidents on every mobile request, the mobile-specific analytics service uses [H3](https://h3geo.org/) hexagonal spatial indexing:

- Every incident has an `h3_index` column, computed automatically at write time via a Sequelize model hook (`beforeCreate`/`beforeUpdate`) from its `latitude`/`longitude`.
- The column is indexed (composite with `status`) for fast lookups.
- When a mobile client requests analytics for its current location, the backend converts that location to an H3 cell, expands it to a small ring of neighboring cells (`gridDisk`), and queries only incidents whose `h3_index` falls within that set — filtering happens in SQL, not in application code.
- Results include a risk classification (`Low` / `Moderate` / `Critical`), local incident clusters, and per-cell counts, delivered over a Socket.IO connection.

> **Sequelize version note:** this project runs on **Sequelize v3**. The combined `beforeSave` hook (available in v4+) does not exist in v3 — it is silently ignored if used. Use `beforeCreate` and `beforeUpdate` explicitly instead.

### Authentication

- **Email/password** — standard bcrypt + JWT flow.
- **Google Sign-In** — implemented natively via `@react-native-google-signin/google-signin` (not the browser-based `expo-auth-session` flow), for a frictionless in-app experience. The mobile app obtains a Google ID token, sends it to `POST /auth/google`, and the backend verifies it against Google's servers before issuing its own session JWT — mirroring the same response shape as the password login flow so the rest of the app is provider-agnostic.
- Apple Sign-In is required by App Store policy once any third-party login (Google/Facebook) is offered, and is planned but not yet implemented.

### Notifications

Two independent mechanisms are used, chosen deliberately per use case:

| Trigger                            | Mechanism                                                    | Why                                                                                              |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Incident acknowledged by personnel | Server-sent push notification (Expo Push Service → FCM/APNs) | Needs to reach the user regardless of whether the app is open                                    |
| Approaching a reported hotspot     | On-device local notification                                 | No location data ever leaves the device; works fully offline once hotspot regions are registered |

### Proximity Hotspot Warnings

Implemented using native OS-level geofencing (`expo-location` + `expo-task-manager`) rather than polling, it would be computationally expensive to poll every other minute, task manager handles this well, it is a built in in-app feature:

- After each crime-analytics fetch, the nearest hotspots (sorted by distance to the user) are registered as geofenced regions on-device.
- The OS — not the app — monitors these regions continuously and wakes a background task only when the user physically crosses into one, at which point a local notification fires immediately.
- Only region **entry** triggers a notification (the goal is warning users as they approach a hotspot, not repeatedly notifying while inside one).
- iOS caps simultaneous monitored regions at 20, so only the nearest hotspots to the user's last known location are kept registered at any time. to calculate the distance between 2 hexagons I am making use of haversine algorithm.

---

## Screenshots

### Home

![Pulse Guard home screen](assets/screenshots/home-screen.png)

### Onboarding

![Pulse Guard onboarding screen](assets/screenshots/onboarding-screen.png)

### Video recording

![Pulse Guard video screen](assets/screenshots/video-screen.png)

### Terms and policy

![Pulse Guard terms screen](assets/screenshots/terms-of-use.png)

### Notifications

![Pulse Guard empty notification state](assets/screenshots/empty-notification-state.png)

---

## Project structure

```
pulse-guard/                   # Mobile app (Expo)
├── app/                       # Expo Router screens
├── components/
├── context/                   # AuthContext, etc.
├── services/                  # API clients, geofencing, auth, video upload
└── app.json

pulse-guard-backend/           # Express backend
├── controllers/
├── models/                    # Sequelize models
├── routes/
├── services/                  # Notification service, mobile analytics, sockets
├── scripts/                   # One-off maintenance scripts (e.g. H3 backfill)
└── docker-compose.yml

pulse-guard-worker-golang/     # Go media worker
├── main.go
└── media/
```

---

## Tech Stack

**Mobile**

- Expo (React Native, TypeScript, Expo Router)
- `expo-camera`, `expo-location`, `expo-task-manager`, `expo-notifications`
- `@react-native-google-signin/google-signin` for native Google authentication
- `socket.io-client` for real-time crime analytics
- `@rnmapbox/maps` for map rendering

**Backend**

- Node.js / Express
- Sequelize ORM (MySQL)
- Socket.IO for real-time events
- `expo-server-sdk` for push notification delivery
- `h3-js` for hexagonal geospatial indexing
- BullMQ-style job queue backed by Valkey (Redis-compatible)

**Media Worker**

- Go, with a worker-pool pattern for concurrent video processing
- Azure Blob Storage for durable video storage
- Multer for file/ Media handling

**Infrastructure**

- Docker Compose for local orchestration
- Designed for eventual deployment on Azure (AKS)

---

---

**Backend (`.env`)**

```
PORT=5001
JWT_SECRET=
DB_HOST=
DB_NAME=
DB_USER=
DB_PASSWORD=
GOOGLE_WEB_CLIENT_ID=
GO_SERVICE_URL=http://go-worker:5002
MOBILE_H3_RESOLUTION=10
MOBILE_MODERATE_RISK_MIN=5
MOBILE_CRITICAL_RISK_MIN=15
```

**Mobile (`.env`)**

```
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=
```

> The Google Web Client ID must be identical on both the mobile app and the backend — the backend verifies incoming ID tokens against this exact audience.

---

## Known Limitations

- **Video handoff requires a shared Docker volume** between the backend and Go worker containers; this does not translate directly to a Kubernetes deployment and will need to be re-architected (e.g. direct-to-blob upload, or a shared PVC) before production deployment.
- **Background geofencing reliability differs by platform** — Android does not automatically relaunch a fully terminated app on a geofence event; iOS does. Expect more consistent hotspot warnings on iOS for now.
- **Apple Sign-In is not yet implemented**, despite being required by App Store policy alongside Google Sign-In.
- Development and testing to date has been on Android emulators; iOS-specific permission flows (particularly "Always" location access) have not yet been validated on a physical device.
