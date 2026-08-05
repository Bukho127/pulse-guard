import {
    getToken,
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
      const t = await loginRequest(email, password);
      setToken(t);
    } catch (err: any) {
      Alert.alert("Login failed", err.message || "Unable to login");
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const t = await registerRequest(name, email, password);
      if (t) {
        setToken(t);
        return;
      }
      // if no token returned, attempt to login after registering
      const loginToken = await loginRequest(email, password);
      setToken(loginToken);
    } catch (err: any) {
      Alert.alert("Registration failed", err.message || "Unable to register");
      throw err;
    }
  };

  const logout = async () => {
    await logoutRequest();
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
