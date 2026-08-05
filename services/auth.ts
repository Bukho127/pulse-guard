import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/api";

const TOKEN_KEY = "jwt_token";

export const DEBUG_AUTH_BYPASS = true;
export const DEBUG_AUTH_TOKEN = "debug-auth-token";

function extractToken(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;
  const candidate =
    payload.token ||
    payload.accessToken ||
    payload.access_token ||
    payload.jwt ||
    (payload.data as Record<string, unknown>)?.token ||
    (payload.data as Record<string, unknown>)?.accessToken ||
    (payload.data as Record<string, unknown>)?.access_token ||
    (payload.data as Record<string, unknown>)?.jwt;

  return typeof candidate === "string" ? candidate : null;
}

export async function loginRequest(email: string, password: string) {
  if (DEBUG_AUTH_BYPASS) {
    await AsyncStorage.setItem(TOKEN_KEY, DEBUG_AUTH_TOKEN);
    return DEBUG_AUTH_TOKEN;
  }

  try {
    const url = `${API_BASE_URL}/login`;
    console.log("Auth login URL:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Login failed");
    }

    const data = await res.json();
    const token = extractToken(data);
    if (!token) throw new Error("No token returned from server");

    await AsyncStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch (err: any) {
    // Surface network errors with context
    throw new Error(`Network request failed: ${err?.message || String(err)}`);
  }
}

export async function registerRequest(
  name: string,
  email: string,
  password: string,
) {
  try {
    const url = `${API_BASE_URL}/register`;
    console.log("Auth register URL:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Registration failed");
    }

    const data = await res.json();
    const token = extractToken(data);
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      return token;
    }

    return null;
  } catch (err: any) {
    throw new Error(`Network request failed: ${err?.message || String(err)}`);
  }
}

export async function logoutRequest() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getToken() {
  if (DEBUG_AUTH_BYPASS) {
    return DEBUG_AUTH_TOKEN;
  }

  const token = await AsyncStorage.getItem(TOKEN_KEY);
  console.log("Stored auth token:", token ? `present (${token.slice(0, 10)}...)` : "missing");
  return token;
}

export async function authFetch(input: RequestInfo, init?: RequestInit) {
  const token = await getToken();
  const headers = new Headers(init?.headers as HeadersInit);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
