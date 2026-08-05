import { router } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";

import { AuthField, AuthFormShell } from "@/components/auth/auth-form-shell";
import { useAuth } from "@/context/AuthContext";

export function RegisterForm() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Validation", "Name, email and password are required");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Validation", "Passwords do not match");
      return;
    }

    try {
      await register(name.trim(), email.trim(), password);
      router.replace("/(tabs)/home");
    } catch (_) {
      // error shown in context; keep on screen
    }
  };

  return (
    <AuthFormShell
      title="Create Your Account"
      subtitle="Sign up to get started"
      actionLabel="Register"
      actionPrompt="Already have an account?"
      actionLinkHref="/sign-in"
      actionLinkLabel="Sign in"
      socialLabel="Register with"
      onSubmit={handleSubmit}
      fields={
        <>
          <AuthField
            label="Name"
            placeholder="Enter your name"
            autoCapitalize="words"
            autoComplete="name"
            value={name}
            onChangeText={setName}
          />
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
            autoComplete="new-password"
            rightText="0/12"
            value={password}
            onChangeText={setPassword}
          />
          <AuthField
            label="Confirm password"
            placeholder="Confirm Password"
            secureTextEntry
            autoComplete="new-password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </>
      }
    />
  );
}
