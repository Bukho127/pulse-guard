import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_API_PORT = "5001";

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

  return "http://localhost:5001";
}

const expoExtra =
  (Constants.expoConfig as any)?.extra ||
  (Constants.manifest2 as any)?.extra ||
  (Constants.manifest as any)?.extra ||
  (Constants.expoGoConfig as any)?.extra ||
  (Constants.manifest as any)?.extra;

const environmentApiUrl =
  expoExtra?.EXPO_PUBLIC_API_URL ||
  expoExtra?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.VITE_API_URL ||
  process.env.API_URL;

export const API_BASE_URL = normalizeApiBaseUrl(
  environmentApiUrl || getDefaultApiBaseUrl(),
);

console.log('Resolved environmentApiUrl:', environmentApiUrl);
console.log('Resolved API_BASE_URL:', API_BASE_URL);

// Diagnostic: log resolved API base for debugging on device
console.log('Resolved API_BASE_URL:', API_BASE_URL);

// ---------------------------------------------------------------------------
// Error

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoginPayload {
  email: string;
  password: string;
}

export interface Pagination {
  page: number;
  pages: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  limit?: number;
  perPage?: number;
  per_page?: number;
  pageSize?: number;
  page_size?: number;
  [key: string]: unknown;
}

export interface Incident {
  id: string | number;
  [key: string]: unknown;
}

export interface IncidentsResponse {
  incidents: Incident[];
  pagination: Pagination | null;
}

export interface Notification {
  id: string | number;
  [key: string]: unknown;
}

export interface UnreadNotificationsResponse {
  count: number;
  notifications: Notification[];
}

export interface HeatmapFeature {
  [key: string]: unknown;
}

export interface HeatmapMetadata {
  [key: string]: unknown;
}

export interface HeatmapData {
  type?: string;
  features: HeatmapFeature[];
  metadata?: HeatmapMetadata;
  [key: string]: unknown;
}

export interface OSRMRoute {
  [key: string]: unknown;
}

export interface CurrentUser {
  id?: string | number;
  name: string;
  email?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      (data as Record<string, string>)?.message ||
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
    headers["Authorization"] = `Bearer ${token}`;
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
    console.error("API network request failed:", {
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

  const page = Number(
    pagination.page ??
      pagination.currentPage ??
      pagination.current_page ??
      pagination.pageNumber ??
      1,
  );
  const pages = Number(
    pagination.pages ??
      pagination.totalPages ??
      pagination.total_pages ??
      pagination.pageCount ??
      1,
  );
  const total = Number(
    pagination.total ??
      pagination.totalItems ??
      pagination.total_items ??
      pagination.count ??
      incidentCount,
  );

  return {
    ...pagination,
    page,
    pages,
    total,
    hasPrev: Boolean(
      pagination.hasPrev ??
      pagination.hasPreviousPage ??
      pagination.has_previous_page ??
      page > 1,
    ),
    hasNext: Boolean(
      pagination.hasNext ??
      pagination.hasNextPage ??
      pagination.has_next_page ??
      page < pages,
    ),
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

  return { incidents: normalizedIncidents, pagination };
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
    (payload.personnel as Record<string, unknown> | undefined) ||
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
    name: fullName,
    email: pickString(nested.email, nested.emailAddress, nested.email_address),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function loginPersonnel(payload: LoginPayload): Promise<unknown> {
  const body = JSON.stringify(payload);
  console.log("Payload being sent:", payload);
  console.log("Stringified body:", body);

  return request("/police/login", {
    method: "POST",
    headers: buildHeaders(null, true),
    body,
  });
}

export async function fetchCurrentUser(token: string): Promise<CurrentUser> {
  const paths = ["/users/me", "/auth/me", "/me", "/profile", "/police/me"];
  let lastError: unknown;

  for (const path of paths) {
    try {
      const response = await request(path, {
        method: "GET",
        headers: buildHeaders(token, false),
      });

      return normalizeCurrentUser(response);
    } catch (error) {
      if ((error as ApiError).status !== 404) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("User profile endpoint was not found");
}

export async function fetchIncidents(
  token: string,
  page?: number,
  limit?: number,
): Promise<IncidentsResponse> {
  console.log(
    "fetchIncidents called with token:",
    token ? "present" : "missing",
  );
  const headers = buildHeaders(token, false);
  console.log("fetchIncidents headers:", headers);

  try {
    const query =
      page && limit
        ? `?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`
        : "";

    const response = await request(`/incidents${query}`, {
      method: "GET",
      headers,
    });
    return normalizeIncidentsResponse(response);
  } catch (err) {
    const apiErr = err as ApiError;
    console.error(
      "fetchIncidents error:",
      apiErr.status,
      apiErr.message,
      apiErr.payload,
    );
    throw err;
  }
}

export async function fetchAllIncidents(token: string): Promise<Incident[]> {
  try {
    const response = await request("/incidents/all", {
      method: "GET",
      headers: buildHeaders(token, false),
    });

    return normalizeIncidentsResponse(response).incidents;
  } catch (err) {
    if ((err as ApiError).status !== 404) {
      throw err;
    }
  }

  const firstPage = await fetchIncidents(token);
  const incidents: Incident[] = [...firstPage.incidents];
  const pagination = firstPage.pagination;

  if (!pagination?.pages || pagination.pages <= 1) {
    return incidents;
  }

  const limit =
    pagination.limit ||
    pagination.perPage ||
    pagination.per_page ||
    pagination.pageSize ||
    pagination.page_size ||
    firstPage.incidents.length ||
    10;

  const remainingPages = Array.from(
    { length: pagination.pages - pagination.page },
    (_, index) => pagination.page + index + 1,
  );

  const responses = await Promise.all(
    remainingPages.map((page) => fetchIncidents(token, page, Number(limit))),
  );

  responses.forEach((response) => {
    incidents.push(...response.incidents);
  });

  return incidents;
}

export async function updateIncidentStatus(
  token: string,
  incidentId: string | number,
  status: string,
): Promise<unknown> {
  if (!incidentId) {
    throw new Error("Missing incident ID for status update.");
  }

  return request(`/incidents/${encodeURIComponent(incidentId)}/status`, {
    method: "PUT",
    headers: buildHeaders(token, true),
    body: JSON.stringify({ status }),
  });
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
  if (Array.isArray(d.data)) return (d.data as unknown[]).length;

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
    return { count: data.length, notifications: data as Notification[] };
  }

  if (!data || typeof data !== "object") {
    return { count: 0, notifications: [] };
  }

  const d = data as Record<string, unknown>;
  const dd = d.data as Record<string, unknown> | undefined;

  const notifications =
    d.notifications || dd?.notifications || d.data || d.results || [];

  const count =
    d.count ||
    d.unreadCount ||
    dd?.count ||
    dd?.unreadCount ||
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
    throw new Error("Missing notification ID for marking as read.");
  }

  return request(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "PUT",
    headers: buildHeaders(token, false),
  });
}

/**
 * Fetch all heatmap data.
 */
export async function fetchHeatmapPoints(token: string): Promise<HeatmapData> {
  const data = await request("/heatmap", {
    method: "GET",
    headers: buildHeaders(token, false),
  });

  const d = data as Record<string, unknown>;

  if (d?.type === "heatmap" && d?.features) {
    return d as HeatmapData;
  }

  return (
    (d?.heatmap as HeatmapData) ||
    (d as HeatmapData) || { features: [], metadata: {} }
  );
}

/**
 * Fetch heatmap data for a specific month (YYYY-MM).
 */
export async function fetchHeatmapByMonth(
  token: string,
  month: string,
): Promise<HeatmapData> {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Invalid month format. Use YYYY-MM");
  }

  const query = `?month=${encodeURIComponent(month)}`;
  const data = await request(`/heatmap/month${query}`, {
    method: "GET",
    headers: buildHeaders(token, false),
  });

  const d = data as Record<string, unknown>;

  if (d?.type === "heatmap" && d?.features) {
    return d as HeatmapData;
  }

  return (
    (d?.heatmap as HeatmapData) ||
    (d as HeatmapData) || { features: [], metadata: {} }
  );
}

/**
 * Fetch an OSRM route between two coordinates.
 *
 * NOTE: The original source had a truncated/broken function signature and
 * unreachable code after `throw`. This has been reconstructed to a working
 * state — verify the endpoint URL and parameter names against your backend.
 */
export async function fetchOSRMRoute(
  token: string,
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number,
): Promise<OSRMRoute> {
  const url = `${API_BASE_URL}/route?startLng=${startLng}&startLat=${startLat}&endLng=${endLng}&endLat=${endLat}`;

  const response = await fetch(url, {
    method: "GET",
    headers: buildHeaders(token, false) as HeadersInit,
  });

  console.log("OSRM response status:", response.status);

  if (!response.ok) {
    console.error("OSRM request failed:", {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    });
    throw new Error(`OSRM request failed with status ${response.status}`);
  }

  return response.json() as Promise<OSRMRoute>;
}

/**
 * Fetch heatmap data for a date range (YYYY-MM-DD).
 */
export async function fetchHeatmapByDateRange(
  token: string,
  startDate: string,
  endDate: string,
): Promise<HeatmapData> {
  if (!startDate || !endDate) {
    throw new Error("startDate and endDate are required (YYYY-MM-DD format)");
  }

  const query = `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  const data = await request(`/heatmap/range${query}`, {
    method: "GET",
    headers: buildHeaders(token, false),
  });

  const d = data as Record<string, unknown>;

  if (d?.type === "heatmap" && d?.features) {
    return d as HeatmapData;
  }

  return (
    (d?.heatmap as HeatmapData) ||
    (d as HeatmapData) || { features: [], metadata: {} }
  );
}

export default {
  API_BASE_URL,
  loginPersonnel,
  fetchCurrentUser,
  fetchIncidents,
  fetchAllIncidents,
  updateIncidentStatus,
  fetchNotificationsCount,
  fetchUnreadNotifications,
  markNotificationAsRead,
  fetchHeatmapPoints,
  fetchHeatmapByMonth,
  fetchHeatmapByDateRange,
  fetchOSRMRoute,
};
