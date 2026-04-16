import { LegalScreenLayout, LegalSection } from '@/components/legal/legal-screen-layout';

export function PrivacyPolicyScreen() {
  return (
    <LegalScreenLayout title="Privacy Policy" updatedAt="Last updated: April 9, 2026">
      <LegalSection title="Information we collect">
        Pulse Guard collects the information necessary to provide a safe and reliable service.
        This includes account details such as your full name, email address, and phone number
        provided during registration. We also collect safety-related data including video footage
        recorded directly through the app, GPS location captured at the time of recording, device
        information such as device type, operating system, and app version, and network
        information at the time of submission. We do not allow users to upload pre-recorded videos
        - all footage must be recorded in real time through the app to ensure authenticity.
      </LegalSection>

      <LegalSection title="How information is used">
        We use the information we collect to operate and deliver core safety features, transmit
        incident reports and video footage to authorised security personnel, capture and store
        location data for incident reporting and crime pattern analysis, improve the reliability
        and performance of the app, and support users where necessary. We only retain your data
        for as long as it is needed for these purposes. All data is encrypted end-to-end and
        stored securely in the cloud.
      </LegalSection>

      <LegalSection title="Your choices">
        You can review and manage app permissions such as camera and location access at any time
        through your device settings. You may request updates to your account information by
        contacting us. You may stop using the service at any time. Additional privacy controls may
        be introduced in future updates, and we will notify you of any significant changes to our
        privacy practices.
      </LegalSection>

      <LegalSection title="Data sharing">
        We do not sell your personal information. Incident data including video footage and
        location is shared only with authorised security personnel for the purpose of responding to
        reported incidents. We do not share your data with third parties for advertising or
        marketing purposes.
      </LegalSection>

      <LegalSection title="Security">
        We take the security of your data seriously. All video footage and personal information is
        transmitted and stored using end-to-end encryption. Access to incident data is restricted
        to authorised personnel only. We regularly review our security practices to ensure the
        protection of your information.
      </LegalSection>
    </LegalScreenLayout>
  );
}
