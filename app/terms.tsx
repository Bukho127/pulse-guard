import { Stack } from 'expo-router';

import { TermsOfServiceScreen } from '@/components/legal/terms-of-service-screen';

export default function TermsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Terms of Service' }} />
      <TermsOfServiceScreen />
    </>
  );
}
