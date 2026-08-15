import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { router } from "expo-router";
import { useState } from "react";

import { AuthField, AuthFormShell } from "@/components/auth/auth-form-shell";
import { useAuth } from "@/context/AuthContext";
import { DEBUG_AUTH_BYPASS } from "@/services/auth";

export function SignInForm() {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGooglePress = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log("Google signIn result:", JSON.stringify(userInfo, null, 2));

      const idToken = (userInfo as any)?.data?.idToken as string | undefined;

      if (!idToken) {
        throw new Error("No ID token returned from Google");
      }

      await loginWithGoogle(idToken);
      router.replace("/(tabs)/home");
    } catch (err: any) {
      console.log("Google sign-in error:", err);
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
    }
  };

  const handleSubmit = async () => {
    if (!DEBUG_AUTH_BYPASS && (!email.trim() || !password)) {
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
      actionPrompt="Don't have an account?"
      actionLinkHref="/register"
      actionLinkLabel="Register"
      socialLabel="Continue with"
      onSubmit={handleSubmit}
      onGooglePress={handleGooglePress}
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
