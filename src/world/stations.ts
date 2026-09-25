/** Camera "stations" — the places of the VICZO world. Every page and home section maps to one. */
export type StationId = 'core' | 'noise' | 'gate' | 'quarantine' | 'passport' | 'vault' | 'forge' | 'horizon' | 'lab' | 'detail' | 'lost';

export interface CameraPose {
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface Station {
  desktop: CameraPose;
  mobile: CameraPose;
}

/** World-space anchors for station set pieces. */
export const ANCHORS = {
  core: [0, 0, 0],
  gate: [0, -26, -6],
  quarantine: [0, -44, -4],
  passport: [0, -58, -4],
  vault: [0, -74, -16],
  forge: [14, -90, -10],
  horizon: [0, -108, -26],
  lab: [-34, -26, -6],
} as const;

export const STATIONS: Record<StationId, Station> = {
  core: {
    desktop: { pos: [-3.3, 0.7, 12.5], target: [-3.3, 0.15, 0], fov: 40 },
    mobile: { pos: [0, -2.4, 17], target: [0, -2.9, 0], fov: 46 },
  },
  noise: {
    // inside the storm, looking out and away from the Core so the copy has calm space
    desktop: { pos: [13, -5, 3], target: [26, -7.5, -9], fov: 56 },
    mobile: { pos: [12, -5, 4], target: [24, -8, -8], fov: 62 },
  },
  gate: {
    // three-quarter view so the stream visibly passes through the ring, gate on the right
    desktop: { pos: [-13.5, -24.2, 7.5], target: [-6.5, -26, -7.5], fov: 44 },
    mobile: { pos: [-9, -22.5, 12], target: [-2.5, -27.6, -6], fov: 58 },
  },
  quarantine: {
    desktop: { pos: [-2.4, -41.2, 9], target: [-2.4, -44.4, -4], fov: 40 },
    mobile: { pos: [0, -41, 13], target: [0, -44.6, -4], fov: 50 },
  },
  passport: {
    desktop: { pos: [0, -57, 8], target: [0, -58.3, -4], fov: 40 },
    mobile: { pos: [0, -57, 11], target: [0, -58.3, -4], fov: 50 },
  },
  vault: {
    desktop: { pos: [0, -72.5, 7], target: [0, -73.5, -16], fov: 44 },
    mobile: { pos: [0, -72.5, 9], target: [0, -73.5, -16], fov: 55 },
  },
  forge: {
    desktop: { pos: [5.2, -88.2, 6.5], target: [8.6, -89.8, -10], fov: 44 },
    mobile: { pos: [13, -88, 8], target: [14, -91.2, -10], fov: 52 },
  },
  horizon: {
    desktop: { pos: [0, -106.5, 8], target: [0, -107.2, -26], fov: 44 },
    mobile: { pos: [0, -107, 12], target: [0, -107.6, -26], fov: 56 },
  },
  lab: {
    desktop: { pos: [-31, -24.8, 9.5], target: [-32, -26.4, -6], fov: 42 },
    mobile: { pos: [-34, -24.3, 13], target: [-34, -25.4, -6], fov: 50 },
  },
  detail: {
    desktop: { pos: [3, -72, 6], target: [2, -73.5, -16], fov: 44 },
    mobile: { pos: [0, -72.5, 9], target: [0, -73.5, -16], fov: 55 },
  },
  lost: {
    desktop: { pos: [12, 4, 6], target: [0, -2, -10], fov: 60 },
    mobile: { pos: [10, 3, 9], target: [0, -2, -8], fov: 64 },
  },
};

/** Order of home-page chapters along the scroll path. */
export const HOME_PATH: StationId[] = ['core', 'noise', 'gate', 'quarantine', 'passport', 'vault', 'forge', 'horizon'];
