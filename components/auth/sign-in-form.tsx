import { router } from "expo-router";
import { useState } from "react";

import { AuthField, AuthFormShell } from "@/components/auth/auth-form-shell";
import { useAuth } from "@/context/AuthContext";
import { DEBUG_AUTH_BYPASS } from "@/services/auth";

export function SignInForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    if (!DEBUG_AUTH_BYPASS && (!email.trim() || !password)) {
      // basic client-side validation
      // use dynamic import to avoid adding Alert to top scope
      const { Alert } = await import("react-native");
      Alert.alert("Validation", "Email and password are required");
      return;
    }

    await login(email, password);
    router.replace("/(tabs)/home");
  };

  return (
    <AuthFormShell
      title="Welcome Back"
      subtitle="Sign in to continue"
      actionLabel="Sign in"
      actionPrompt="Don’t have an account?"
      actionLinkHref="/register"
      actionLinkLabel="Register"
      socialLabel="Continue with"
      onSubmit={handleSubmit}
      fields={
        <>
          <AuthField
            label="Email"
            placeholder="Example@gmail.com"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <AuthField
            label="Password"
            placeholder="**********"
            secureTextEntry
            autoComplete="password"
            rightText="0/12"
            value={password}
            onChangeText={setPassword}
          />
        </>
      }
    />
  );
}
