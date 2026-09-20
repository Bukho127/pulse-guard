import { API_BASE_URL } from "@/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "jwt_token";

export const DEBUG_AUTH_BYPASS = false;
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

async function getErrorMessage(res: Response, fallback: string) {
  const payload = await res.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const errorPayload = payload as Record<string, unknown>;
  const message = errorPayload.message || errorPayload.error;

  if (Array.isArray(message)) {
    return message.filter(Boolean).join(", ") || fallback;
  }

  return typeof message === "string" && message.trim() ? message : fallback;
}

export async function loginRequest(email: string, password: string) {
  if (DEBUG_AUTH_BYPASS) {
    await AsyncStorage.setItem(TOKEN_KEY, DEBUG_AUTH_TOKEN);
    return DEBUG_AUTH_TOKEN;
  }

  try {
    const url = `${API_BASE_URL}/auth/login`;
    console.log("Auth login URL:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      throw new Error(await getErrorMessage(res, "Login failed"));
    }

    const data = await res.json();
    const token = extractToken(data);
    if (!token) throw new Error("No token returned from server");

    await AsyncStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch (err: any) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

export async function googleIdTokenLoginRequest(idToken: string) {
  try {
    const url = `${API_BASE_URL}/auth/google`;
    console.log("Auth Google login URL:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    console.log("Google auth response status:", res.status);

    if (!res.ok) {
      throw new Error(await getErrorMessage(res, "Google sign-in failed"));
    }

    const data = await res.json();
    const token = extractToken(data);
    if (!token) throw new Error("No token returned from server");

    await AsyncStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch (err: any) {
    console.log("Google auth caught error:", err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

export async function registerRequest(
  name: string,
  email: string,
  password: string,
) {
  try {
    const url = `${API_BASE_URL}/auth/register`;
    console.log("Auth register URL:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name, name, email, password }),
    });

    if (!res.ok) {
      throw new Error(await getErrorMessage(res, "Registration failed"));
    }

    const data = await res.json();
    const token = extractToken(data);
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      return token;
    }

    return null;
  } catch (err: any) {
    throw err instanceof Error ? err : new Error(String(err));
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
  console.log(
    "Stored auth token:",
    token ? `present (${token.slice(0, 10)}...)` : "missing",
  );
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
