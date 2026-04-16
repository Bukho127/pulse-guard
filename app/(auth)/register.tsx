import { Stack } from 'expo-router';

import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <RegisterForm />
    </>
  );
}
