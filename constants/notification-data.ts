export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  date: string;
};

export const DUMMY_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'incident-nearby',
    title: 'Incident nearby',
    message: 'Please take care crime in your area is rife. Pulse guard is warning you',
    date: 'Apr 11, 2026',
  },
  {
    id: 'report-acknowledged',
    title: 'Report acknowledged',
    message: 'Your report in Philippi has been acknowledged by authorities.',
    date: 'Apr 11, 2026',
  },
  {
    id: 'heatmap-updated',
    title: 'Heatmap updated',
    message: 'heatmap for your area has to be updated with the latest reports. Tap to view',
    date: 'Apr 04, 2026',
  },
  {
    id: 'thank-you',
    title: 'Thank you for reporting',
    message: 'Your recent report helped authorities respond faster.',
    date: 'Apr 01, 2026',
  },
  {
    id: 'community-update',
    title: 'Community update',
    message: 'Earn up to 5% cashback on every purchase with our new Gold Credit Card!',
    date: 'Mar 23, 2026',
  },
  {
    id: 'report-resolved',
    title: 'Report resolved',
    message: 'Your report in Khayelitsha has been marked resolved by authorities.',
    date: 'Mar 11, 2026',
  },
];
