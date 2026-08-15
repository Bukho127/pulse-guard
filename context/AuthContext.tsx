import {
    getToken,
    googleIdTokenLoginRequest,
    loginRequest,
    logoutRequest,
    registerRequest,
} from "@/services/auth";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";

type AuthContextType = {
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const t = await getToken();
        if (t) setToken(t);
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setAuthError(null);
      const t = await loginRequest(email, password);
      setToken(t);
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err));
      setAuthError(error);
      Alert.alert("Login failed", error.message || "Unable to login");
      throw error;
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    try {
      setAuthError(null);
      const t = await googleIdTokenLoginRequest(idToken);
      setToken(t);
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err));
      setAuthError(error);
      Alert.alert(
        "Google sign-in failed",
        error.message || "Unable to sign in with Google",
      );
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setAuthError(null);
      const t = await registerRequest(name, email, password);
      if (t) {
        setToken(t);
        return;
      }
      try {
        const loginToken = await loginRequest(email, password);
        setToken(loginToken);
      } catch (loginErr: any) {
        const error = new Error(
          "Registration completed but automatic login failed. Please log in manually.",
        );
        setAuthError(error);
        Alert.alert("Registration completed", error.message);
        throw error;
      }
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err));
      setAuthError(error);
      if (!error.message.includes("Registration completed")) {
        Alert.alert(
          "Registration failed",
          error.message || "Unable to register",
        );
      }
      throw error;
    }
  };

  const logout = async () => {
    await logoutRequest();
    setToken(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{ token, loading, login, register, logout, loginWithGoogle }}
    >
      {children}
    </AuthContext.Provider>
  );
}
