import { LegalScreenLayout, LegalSection } from '@/components/legal/legal-screen-layout';

export function TermsOfServiceScreen() {
  return (
    <LegalScreenLayout title="Terms of Service" updatedAt="Last updated: April 9, 2026">
      <LegalSection title="Using Pulse Guard">
        Pulse Guard is provided to help users access safety-focused features and related
        information. By using the app, you agree to use it lawfully and responsibly.
      </LegalSection>

      <LegalSection title="Your responsibilities">
        You are responsible for the information you provide, the permissions you enable, and how
        you use the service. You should keep your device secure and report misuse when necessary.
      </LegalSection>

      <LegalSection title="Service changes">
        We may update, improve, or discontinue features over time. Continued use of the app after
        changes means you accept the revised terms.
      </LegalSection>
    </LegalScreenLayout>
  );
}
