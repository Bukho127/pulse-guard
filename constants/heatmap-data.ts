export const HEATMAP_CASE_THRESHOLD = 5;

export type HeatmapIncidentPoint = {
  id: string;
  latitude: number;
  longitude: number;
  reportedCases: number;
};
