import { router } from 'expo-router';

import { AuthField, AuthFormShell } from '@/components/auth/auth-form-shell';

export function RegisterForm() {
  return (
    <AuthFormShell
      title="Create Your Account"
      subtitle="Sign up to get started"
      actionLabel="Register"
      actionPrompt="Already have an account?"
      actionLinkHref="/sign-in"
      actionLinkLabel="Sign in"
      socialLabel="Register with"
      onSubmit={() => router.replace('/(tabs)/home')}
      fields={
        <>
          <AuthField
            label="Name"
            placeholder="Enter your name"
            autoCapitalize="words"
            autoComplete="name"
          />
          <AuthField
            label="Email"
            placeholder="Example@gmail.com"
            keyboardType="email-address"
            autoComplete="email"
          />
          <AuthField
            label="Password"
            placeholder="**********"
            secureTextEntry
            autoComplete="new-password"
            rightText="0/12"
          />
          <AuthField
            label="Confirm password"
            placeholder="Confirm Password"
            secureTextEntry
            autoComplete="new-password"
          />
        </>
      }
    />
  );
}
