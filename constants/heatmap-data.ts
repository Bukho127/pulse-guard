export const HEATMAP_CASE_THRESHOLD = 5;

export type HeatmapIncidentPoint = {
  id: string;
  latitude: number;
  longitude: number;
  reportedCases: number;
};

export const DUMMY_HEATMAP_INCIDENTS: HeatmapIncidentPoint[] = [
  {
    id: 'cape-town-cbd',
    latitude: -33.9249,
    longitude: 18.4241,
    reportedCases: 12,
  },
  {
    id: 'woodstock',
    latitude: -33.9285,
    longitude: 18.4475,
    reportedCases: 9,
  },
  {
    id: 'observatory',
    latitude: -33.9367,
    longitude: 18.4686,
    reportedCases: 7,
  },
  {
    id: 'sea-point',
    latitude: -33.918,
    longitude: 18.389,
    reportedCases: 4,
  },
  {
    id: 'rondebosch',
    latitude: -33.9636,
    longitude: 18.4764,
    reportedCases: 6,
  },
  {
    id: 'bellville',
    latitude: -33.9011,
    longitude: 18.6309,
    reportedCases: 14,
  },
  {
    id: 'athlone',
    latitude: -33.9667,
    longitude: 18.5142,
    reportedCases: 3,
  },
  {
    id: 'mitchells-plain',
    latitude: -34.0506,
    longitude: 18.6187,
    reportedCases: 11,
  },
];

export function getVisibleHeatmapIncidents(incidents: HeatmapIncidentPoint[]) {
  return incidents.filter((incident) => incident.reportedCases > HEATMAP_CASE_THRESHOLD);
}
