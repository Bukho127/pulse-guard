import { Stack } from 'expo-router';

import { PrivacyPolicyScreen } from '@/components/legal/privacy-policy-screen';

export default function PrivacyRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Privacy Policy' }} />
      <PrivacyPolicyScreen />
    </>
  );
}
