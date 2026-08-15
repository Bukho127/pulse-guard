import Constants from "expo-constants";
import { Platform } from "react-native";
import { io, type Socket } from "socket.io-client";

const DEFAULT_API_PORT = "5001";
const MOBILE_H3_RESOLUTION = 10;

function normalizeApiBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function getDevServerHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  if (typeof hostUri !== "string" || !hostUri) {
    return null;
  }

  return hostUri.split(":")[0] || null;
}

function getDefaultApiBaseUrl(): string {
  if (!__DEV__) {
    return "http://localhost:5001";
  }

  if (Platform.OS === "android") {
    const devServerHost = getDevServerHost();

    if (devServerHost && devServerHost !== "localhost") {
      return `http://${devServerHost}:${DEFAULT_API_PORT}`;
    }

    return `http://10.0.2.2:${DEFAULT_API_PORT}`;
  }

  return `http://localhost:${DEFAULT_API_PORT}`;
}

const expoExtra =
  (Constants.expoConfig as any)?.extra ||
  (Constants.manifest2 as any)?.extra ||
  (Constants.manifest as any)?.extra ||
  (Constants.expoGoConfig as any)?.extra;

const environmentApiUrl =
  expoExtra?.EXPO_PUBLIC_API_URL ||
  expoExtra?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.API_URL;

export const API_BASE_URL = normalizeApiBaseUrl(
  environmentApiUrl || getDefaultApiBaseUrl(),
);

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export interface Pagination {
  page: number;
  pages: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  limit?: number;
  [key: string]: unknown;
}

export interface Incident {
  incident_id?: string | number;
  id?: string | number;
  latitude?: string | number;
  longitude?: string | number;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface IncidentsResponse {
  incidents: Incident[];
  pagination: Pagination | null;
}

export interface Notification {
  id?: string | number;
  notification_id?: string | number;
  message?: string;
  read?: boolean;
  created_at?: string;
  [key: string]: unknown;
}

export interface UnreadNotificationsResponse {
  count: number;
  notifications: Notification[];
}

export interface CurrentUser {
  id?: string | number;
  user_id?: string | number;
  name: string;
  email?: string;
  [key: string]: unknown;
}

export type RiskRank = "Low Risk" | "Moderate Risk" | "Critical Risk";

export interface LocalCrimePoint {
  latitude: number;
  longitude: number;
  count: number;
  incidentIds: Array<string | number>;
}

export interface LocalCrimeCellCount {
  h3Index: string;
  count: number;
}

export interface MobileCrimeAnalytics {
  type: "mobile-crime-analytics";
  h3Index: string;
  resolution: number;
  searchedCells: string[];
  totalIncidentCount: number;
  riskRank: RiskRank;
  localCrimePoints: LocalCrimePoint[];
  cellCounts: LocalCrimeCellCount[];
}

type MobileAnalyticsAck =
  | {
      success: true;
      data: MobileCrimeAnalytics;
    }
  | {
      success: false;
      error?: {
        message?: string;
        statusCode?: number;
      };
    };

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const payload = data as Record<string, unknown>;
    const message =
      (typeof payload?.message === "string" && payload.message) ||
      (typeof payload?.error === "string" && payload.error) ||
      response.statusText ||
      "API request failed";

    throw new ApiError(message, response.status, data);
  }

  return data;
}

function buildHeaders(token: string | null, json = true): HeadersInit {
  const headers: Record<string, string> = {};

  if (json) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function request(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, options);
    return parseResponse(response);
  } catch (error) {
    console.error("API request failed:", {
      url,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function normalizePagination(
  pagination: Record<string, unknown> | undefined | null,
  incidentCount = 0,
): Pagination | null {
  if (!pagination || typeof pagination !== "object") {
    return null;
  }

  const page = Number(pagination.page ?? 1);
  const pages = Number(pagination.pages ?? pagination.totalPages ?? 1);
  const total = Number(pagination.total ?? pagination.count ?? incidentCount);

  return {
    ...pagination,
    page,
    pages,
    total,
    hasPrev: Boolean(pagination.hasPrev ?? page > 1),
    hasNext: Boolean(pagination.hasNext ?? page < pages),
  };
}

function normalizeIncidentsResponse(response: unknown): IncidentsResponse {
  if (Array.isArray(response)) {
    return { incidents: response as Incident[], pagination: null };
  }

  const res = response as Record<string, unknown>;

  const incidents =
    res?.incidents ||
    res?.results ||
    (res?.data as Record<string, unknown>)?.incidents ||
    (res?.data as Record<string, unknown>)?.results ||
    res?.data ||
    [];

  const normalizedIncidents = Array.isArray(incidents)
    ? (incidents as Incident[])
    : [];

  const pagination =
    normalizePagination(
      res?.pagination as Record<string, unknown>,
      normalizedIncidents.length,
    ) ||
    normalizePagination(
      (res?.data as Record<string, unknown>)?.pagination as Record<
        string,
        unknown
      >,
      normalizedIncidents.length,
    );

  return {
    incidents: normalizedIncidents,
    pagination,
  };
}

function pickString(...values: unknown[]): string | undefined {
  const value = values.find(
    (candidate) => typeof candidate === "string" && candidate.trim(),
  );

  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeCurrentUser(response: unknown): CurrentUser {
  if (!response || typeof response !== "object") {
    throw new Error("Invalid user profile response");
  }

  const payload = response as Record<string, unknown>;
  const nested =
    (payload.user as Record<string, unknown> | undefined) ||
    (payload.profile as Record<string, unknown> | undefined) ||
    (payload.data as Record<string, unknown> | undefined) ||
    payload;

  const firstName = pickString(
    nested.firstName,
    nested.first_name,
    nested.givenName,
    nested.given_name,
  );

  const lastName = pickString(
    nested.lastName,
    nested.last_name,
    nested.surname,
    nested.familyName,
    nested.family_name,
  );

  const fullName = pickString(
    nested.name,
    nested.fullName,
    nested.full_name,
    [firstName, lastName].filter(Boolean).join(" "),
  );

  if (!fullName) {
    throw new Error("User profile response is missing a name");
  }

  return {
    ...nested,
    id: (nested.id || nested._id || nested.userId || nested.user_id) as
      | string
      | number
      | undefined,
    user_id: nested.user_id as string | number | undefined,
    name: fullName,
    email: pickString(nested.email, nested.emailAddress, nested.email_address),
  };
}

export async function fetchCurrentUser(token: string): Promise<CurrentUser> {
  const response = await request("/users/me", {
    method: "GET",
    headers: buildHeaders(token, false),
  });

  return normalizeCurrentUser(response);
}

export async function fetchMyIncidents(
  token: string,
  page?: number,
  limit?: number,
): Promise<IncidentsResponse> {
  const query =
    page && limit
      ? `?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`
      : "";

  const response = await request(`/incidents/my${query}`, {
    method: "GET",
    headers: buildHeaders(token, false),
  });

  return normalizeIncidentsResponse(response);
}

export async function fetchMyIncidentById(
  token: string,
  incidentId: string | number,
): Promise<Incident> {
  if (!incidentId) {
    throw new Error("Missing incident ID.");
  }

  return request(`/incidents/my/${encodeURIComponent(incidentId)}`, {
    method: "GET",
    headers: buildHeaders(token, false),
  }) as Promise<Incident>;
}

export async function fetchNotificationsCount(token: string): Promise<number> {
  const data = await request("/notifications/unread", {
    method: "GET",
    headers: buildHeaders(token, false),
  });

  if (Array.isArray(data)) {
    return data.length;
  }

  if (!data || typeof data !== "object") {
    return 0;
  }

  const d = data as Record<string, unknown>;

  if (typeof d.count === "number") return d.count;
  if (typeof d.unreadCount === "number") return d.unreadCount;
  if (Array.isArray(d.notifications)) return d.notifications.length;
  if (Array.isArray(d.data)) return d.data.length;

  return 0;
}

export async function fetchUnreadNotifications(
  token: string,
): Promise<UnreadNotificationsResponse> {
  const data = await request("/notifications/unread", {
    method: "GET",
    headers: buildHeaders(token, false),
  });

  if (Array.isArray(data)) {
    return {
      count: data.length,
      notifications: data as Notification[],
    };
  }

  if (!data || typeof data !== "object") {
    return {
      count: 0,
      notifications: [],
    };
  }

  const d = data as Record<string, unknown>;
  const nestedData = d.data as Record<string, unknown> | undefined;

  const notifications =
    d.notifications || nestedData?.notifications || d.data || d.results || [];

  const count =
    d.count ||
    d.unreadCount ||
    nestedData?.count ||
    nestedData?.unreadCount ||
    (Array.isArray(notifications) ? notifications.length : 0);

  return {
    count: Number(count),
    notifications: Array.isArray(notifications)
      ? (notifications as Notification[])
      : [],
  };
}

export async function markNotificationAsRead(
  token: string,
  notificationId: string | number,
): Promise<unknown> {
  if (!notificationId) {
    throw new Error("Missing notification ID.");
  }

  return request(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "PUT",
    headers: buildHeaders(token, false),
  });
}

export async function savePushToken(
  authToken: string,
  pushToken: string,
): Promise<void> {
  try {
    await request("/push-tokens", {
      method: "POST",
      headers: buildHeaders(authToken, true),
      body: JSON.stringify({ token: pushToken }),
    });
  } catch (error) {
    console.error("Failed to save push token:", error);
  }
}

export async function removePushToken(
  authToken: string,
  pushToken: string,
): Promise<void> {
  try {
    await request(`/push-tokens/${encodeURIComponent(pushToken)}`, {
      method: "DELETE",
      headers: buildHeaders(authToken, false),
    });
  } catch (error) {
    console.error("Failed to remove push token:", error);
  }
}

export function createMobileSocket(token: string): Socket {
  return io(API_BASE_URL, {
    transports: ["websocket"],
    autoConnect: false,
    auth: {
      token,
    },
  });
}

export function getH3IndexForLocation(
  latitude: number,
  longitude: number,
): string {
  // Require h3-js at runtime to avoid triggering its TextDecoder usage during module
  // initialization. This prevents startup crashes in Metro/Expo environments where
  // utf-16le may not be available until our shim runs.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
  const { latLngToCell } = require("h3-js");

  return latLngToCell(latitude, longitude, MOBILE_H3_RESOLUTION);
}

export function requestMobileCrimeAnalytics(
  socket: Socket,
  latitude: number,
  longitude: number,
): Promise<MobileCrimeAnalytics> {
  const h3Index = getH3IndexForLocation(latitude, longitude);

  return requestMobileCrimeAnalyticsByH3Index(socket, h3Index);
}

export function requestMobileCrimeAnalyticsByH3Index(
  socket: Socket,
  h3Index: string,
): Promise<MobileCrimeAnalytics> {
  return new Promise((resolve, reject) => {
    socket.emit(
      "mobile:crime-analytics:request",
      { h3Index },
      (response: MobileAnalyticsAck) => {
        if (!response?.success) {
          reject(
            new Error(
              response?.error?.message ||
                "Mobile crime analytics request failed",
            ),
          );
          return;
        }

        resolve(response.data);
      },
    );
  });
}

export function subscribeToMobileCrimeAnalytics(
  socket: Socket,
  onUpdate: (analytics: MobileCrimeAnalytics) => void,
): () => void {
  socket.on("mobile:crime-analytics:update", onUpdate);

  return () => {
    socket.off("mobile:crime-analytics:update", onUpdate);
  };
}

export function subscribeToMobileCrimeAnalyticsErrors(
  socket: Socket,
  onError: (error: { message: string; statusCode?: number }) => void,
): () => void {
  socket.on("mobile:crime-analytics:error", onError);

  return () => {
    socket.off("mobile:crime-analytics:error", onError);
  };
}

export default {
  API_BASE_URL,
  fetchCurrentUser,
  fetchMyIncidents,
  fetchMyIncidentById,
  fetchNotificationsCount,
  fetchUnreadNotifications,
  markNotificationAsRead,
  savePushToken,
  removePushToken,
  createMobileSocket,
  getH3IndexForLocation,
  requestMobileCrimeAnalytics,
  requestMobileCrimeAnalyticsByH3Index,
  subscribeToMobileCrimeAnalytics,
  subscribeToMobileCrimeAnalyticsErrors,
};
