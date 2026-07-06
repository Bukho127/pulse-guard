import { LegalScreenLayout, LegalSection } from "@/components/legal/legal-screen-layout";

export function PrivacyPolicyScreen() {
  return (
    <LegalScreenLayout title="Privacy Policy" updatedAt="Last updated: July 6, 2026">
      <LegalSection title="Overview">
        Pulse Guard is a safety reporting app. This Privacy Policy explains how we collect, use,
        store, and share information when you use the app, including when you record and submit a
        video report, allow location access, receive notifications, or view incident status
        updates.
      </LegalSection>

      <LegalSection title="Information we collect">
        We may collect account information you provide, such as your name, email address, phone
        number, or login details. When you record a report, we collect the video and audio captured
        through the app, the location attached to the report, the time of submission, and related
        incident details. We may also collect device and app information such as device type,
        operating system, app version, notification token, network information, and diagnostic
        logs needed to keep the service reliable.
      </LegalSection>

      <LegalSection title="Camera, microphone, and location">
        Pulse Guard requests camera and microphone access so you can record incident videos inside
        the app. Pulse Guard requests location access so submitted reports can include where the
        incident happened and so map and heatmap features can work. You can manage these
        permissions in your device settings, but some safety reporting features may not work if
        permissions are disabled.
      </LegalSection>

      <LegalSection title="How we use information">
        We use information to operate the app, submit incident reports, attach location to reports,
        show report progress and acknowledgement status, display safety maps and heatmaps, send
        safety notifications, prevent misuse, troubleshoot technical problems, improve reliability,
        and support lawful safety or incident response processes.
      </LegalSection>

      <LegalSection title="Report status">
        Pulse Guard may use backend incident records to show whether a submitted report has been
        sent, received, acknowledged, resolved, or otherwise updated. These status updates are
        informational and may depend on data provided by authorized personnel or connected systems.
      </LegalSection>

      <LegalSection title="How we share information">
        We do not sell your personal information. We may share incident reports, video, audio,
        location, and status information with authorized safety personnel, administrators, service
        providers, or authorities when needed to operate Pulse Guard, respond to reports, comply
        with the law, protect users, or investigate misuse of the service.
      </LegalSection>

      <LegalSection title="Service providers">
        Pulse Guard may use third-party services for hosting, cloud storage, maps, notifications,
        analytics, security, and infrastructure. These providers may process information only as
        needed to provide services to Pulse Guard and are expected to protect information according
        to appropriate security and confidentiality standards.
      </LegalSection>

      <LegalSection title="Data retention">
        We keep information for as long as needed to provide the app, maintain incident records,
        support safety response, comply with legal obligations, resolve disputes, prevent misuse,
        and improve reliability. Retention periods may vary depending on the type of data and the
        purpose for keeping it.
      </LegalSection>

      <LegalSection title="Security">
        We use reasonable technical and organizational safeguards to protect information submitted
        through Pulse Guard. No system is perfectly secure, so we cannot guarantee that information
        will always be protected against unauthorized access, loss, misuse, or disclosure.
      </LegalSection>

      <LegalSection title="Your choices">
        You can stop using Pulse Guard at any time. You can manage camera, microphone, location,
        and notification permissions through your device settings. You may contact us to request
        access to, correction of, or deletion of your personal information, subject to legal,
        safety, and operational requirements.
      </LegalSection>

      <LegalSection title="Children">
        Pulse Guard is not intended for children who are not legally able to consent to these
        practices. If we learn that we collected personal information from a child without the
        required consent, we will take reasonable steps to delete it.
      </LegalSection>

      <LegalSection title="Changes to this policy">
        We may update this Privacy Policy from time to time. If we make material changes, we will
        update the effective date and may provide additional notice in the app or through another
        appropriate channel.
      </LegalSection>

      <LegalSection title="Contact">
        If you have questions, requests, or concerns about this Privacy Policy or how Pulse Guard
        handles information, contact us at: [Insert contact email].
      </LegalSection>
    </LegalScreenLayout>
  );
}
