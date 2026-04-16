import { Stack } from 'expo-router';

import { SignInForm } from '@/components/auth/sign-in-form';

export default function SignInScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SignInForm />
    </>
  );
}
