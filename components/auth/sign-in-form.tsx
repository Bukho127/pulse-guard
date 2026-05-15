import { router } from 'expo-router';

import { AuthField, AuthFormShell } from '@/components/auth/auth-form-shell';

export function SignInForm() {
  return (
    <AuthFormShell
      title="Welcome Back"
      subtitle="Sign in to continue"
      actionLabel="Sign in"
      actionPrompt="Don’t have an account?"
      actionLinkHref="/register"
      actionLinkLabel="Register"
      socialLabel="Continue with"
      onSubmit={() => router.replace('/(tabs)/home')}
      fields={
        <>
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
            autoComplete="password"
            rightText="0/12"
          />
        </>
      }
    />
  );
}
