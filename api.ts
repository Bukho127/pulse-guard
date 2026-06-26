export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function parseResponse(response) {
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.message || response.statusText || "API request failed";
    throw new ApiError(message, response.status, data);
  }

  return data;
}

function buildHeaders(token, json = true) {
  const headers = {};

  if (json) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  return parseResponse(response);
}

function normalizePagination(pagination = {}, incidentCount = 0) {
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
    hasPrev:
      pagination.hasPrev ??
      pagination.hasPreviousPage ??
      pagination.has_previous_page ??
      page > 1,
    hasNext:
      pagination.hasNext ??
      pagination.hasNextPage ??
      pagination.has_next_page ??
      page < pages,
  };
}

function normalizeIncidentsResponse(response) {
  if (Array.isArray(response)) {
    return {
      incidents: response,
      pagination: null,
    };
  }

  const incidents =
    response?.incidents ||
    response?.results ||
    response?.data?.incidents ||
    response?.data?.results ||
    response?.data ||
    [];

  const normalizedIncidents = Array.isArray(incidents) ? incidents : [];
  const pagination =
    normalizePagination(response?.pagination, normalizedIncidents.length) ||
    normalizePagination(response?.data?.pagination, normalizedIncidents.length);

  return {
    incidents: normalizedIncidents,
    pagination,
  };
}

export async function loginPersonnel(payload) {
  const body = JSON.stringify(payload);
  console.log("Payload being sent:", payload);
  console.log("Stringified body:", body);

  return request("/police/login", {
    method: "POST",
    headers: buildHeaders(null, true),
    body,
  });
}

export async function fetchIncidents(token, page, limit) {
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
    console.error(
      "fetchIncidents error:",
      err.status,
      err.message,
      err.payload,
    );
    throw err;
  }
}

export async function fetchAllIncidents(token) {
  try {
    const response = await request("/incidents/all", {
      method: "GET",
      headers: buildHeaders(token, false),
    });

    return normalizeIncidentsResponse(response).incidents;
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }
  }

  const firstPage = await fetchIncidents(token);
  const incidents = [...firstPage.incidents];
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
    remainingPages.map((page) => fetchIncidents(token, page, limit)),
  );

  responses.forEach((response) => {
    incidents.push(...response.incidents);
  });

  return incidents;
}

export async function updateIncidentStatus(token, incidentId, status) {
  if (!incidentId) {
    throw new Error("Missing incident ID for status update.");
  }

  return request(`/incidents/${encodeURIComponent(incidentId)}/status`, {
    method: "PUT",
    headers: buildHeaders(token, true),
    body: JSON.stringify({ status }),
  });
}

export async function fetchNotificationsCount(token) {
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

  if (typeof data.count === "number") {
    return data.count;
  }

  if (typeof data.unreadCount === "number") {
    return data.unreadCount;
  }

  if (Array.isArray(data.notifications)) {
    return data.notifications.length;
  }

  if (Array.isArray(data.data)) {
    return data.data.length;
  }

  return 0;
}

export async function fetchUnreadNotifications(token) {
  const data = await request("/notifications/unread", {
    method: "GET",
    headers: buildHeaders(token, false),
  });

  if (Array.isArray(data)) {
    return {
      count: data.length,
      notifications: data,
    };
  }

  if (!data || typeof data !== "object") {
    return {
      count: 0,
      notifications: [],
    };
  }

  const notifications =
    data.notifications ||
    data.data?.notifications ||
    data.data ||
    data.results ||
    [];

  const count =
    data.count ||
    data.unreadCount ||
    data.data?.count ||
    data.data?.unreadCount ||
    (Array.isArray(notifications) ? notifications.length : 0);

  return {
    count,
    notifications: Array.isArray(notifications) ? notifications : [],
  };
}

export async function markNotificationAsRead(token, notificationId) {
  if (!notificationId) {
    throw new Error("Missing notification ID for marking as read.");
  }

  return request(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "PUT",
    headers: buildHeaders(token, false), // set json=false if payload is empty, standard headers handle the rest
  });
}

/**
 * Fetch all heatmap data
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Heatmap data with H3 hexagon features and metadata
 */
export async function fetchHeatmapPoints(token) {
  const data = await request("/heatmap", {
    method: "GET",
    headers: buildHeaders(token, false),
  });

  // Handle response format
  if (data?.type === "heatmap" && data?.features) {
    return data;
  }

  // Backward compatibility for old format
  return data?.heatmap || data || { features: [], metadata: {} };
}

/**
 * Fetch heatmap data for a specific month
 * @param {string} token - Authentication token
 * @param {string} month - Month in YYYY-MM format (e.g., "2026-06")
 * @returns {Promise<Object>} Heatmap data with H3 hexagon features
 */
export async function fetchHeatmapByMonth(token, month) {
  if (!month || !month.match(/^\d{4}-\d{2}$/)) {
    throw new Error("Invalid month format. Use YYYY-MM");
  }

  const query = `?month=${encodeURIComponent(month)}`;
  const data = await request(`/heatmap/month${query}`, {
    method: "GET",
    headers: buildHeaders(token, false),
  });

  // Handle response format
  if (data?.type === "heatmap" && data?.features) {
    return data;
  }

  // Backward compatibility
  return data?.heatmap || data || { features: [], metadata: {} };
}

//fetch OSMR data for a route between two points
export async function fetchOSRMRoute(
  startLng,
  startLat,
  endLng,
    {
      method: "GET",
      headers: buildHeaders(token, false),
    },
  );
  console.log("OSRM response status:", response.status);

  if (!response.ok) {
    throw new Error(`OSRM request failed with status ${response.status}`);
    console.error("OSRM request failed:", {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    });
  }

  return response.json(); // backend already returns geometry directly, no further parsing needed
}

/**
 * Fetch heatmap data for a date range
 * @param {string} token - Authentication token
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} Heatmap data with H3 hexagon features
 */
export async function fetchHeatmapByDateRange(token, startDate, endDate) {
  if (!startDate || !endDate) {
    throw new Error("startDate and endDate are required (YYYY-MM-DD format)");
  }

  const query = `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  const data = await request(`/heatmap/range${query}`, {
    method: "GET",
    headers: buildHeaders(token, false),
  });

  // Handle response format
  if (data?.type === "heatmap" && data?.features) {
    return data;
  }

  // Backward compatibility
  return data?.heatmap || data || { features: [], metadata: {} };
}

export default {
  API_BASE_URL,
  loginPersonnel,
  fetchIncidents,
  fetchAllIncidents,
  fetchNotificationsCount,
  fetchUnreadNotifications,
  fetchHeatmapPoints,
  fetchHeatmapByMonth,
  fetchHeatmapByDateRange,
};
