// Types for Hot Wheels Speed Camera App

export interface CalibrationData {
  distanceMeters: number; // Real-world distance between markers in meters
  pixelDistance: number; // Distance in pixels in the frame
  markerStartX: number; // Start marker X position (0-1 normalized)
  markerEndX: number; // End marker X position (0-1 normalized)
  frameWidth: number; // Frame width at calibration time
  frameHeight: number; // Frame height at calibration time
  createdAt: number; // Timestamp
}

export interface CarPosition {
  x: number; // Normalized position (0-1)
  y: number; // Normalized position (0-1)
  timestamp: number; // Frame timestamp in ms
  frameNumber: number;
  confidence: number; // Detection confidence (0-1)
}

export interface SpeedMeasurement {
  speedKmh: number; // Actual speed in km/h
  scaleSpeedKmh: number; // Scale speed (multiplied by scale factor)
  timeMs: number; // Time taken to traverse distance
  distanceMeters: number; // Distance covered
  startFrame: number;
  endFrame: number;
  fps: number; // Frames per second used
}

export interface RaceSession {
  id: string;
  carName: string;
  carColor: string;
  measurement: SpeedMeasurement;
  calibrationId: string;
  videoPath?: string;
  thumbnailPath?: string;
  createdAt: number;
}

export interface ColorRange {
  name: string;
  hueMin: number;
  hueMax: number;
  saturationMin: number;
  saturationMax: number;
  valueMin: number;
  valueMax: number;
}

// Predefined colors for Hot Wheels cars
export const HOT_WHEELS_COLORS: ColorRange[] = [
  {name: 'Red', hueMin: 0, hueMax: 10, saturationMin: 0.5, saturationMax: 1, valueMin: 0.4, valueMax: 1},
  {name: 'Red (wrap)', hueMin: 350, hueMax: 360, saturationMin: 0.5, saturationMax: 1, valueMin: 0.4, valueMax: 1},
  {name: 'Orange', hueMin: 10, hueMax: 25, saturationMin: 0.5, saturationMax: 1, valueMin: 0.4, valueMax: 1},
  {name: 'Yellow', hueMin: 25, hueMax: 45, saturationMin: 0.5, saturationMax: 1, valueMin: 0.4, valueMax: 1},
  {name: 'Green', hueMin: 80, hueMax: 150, saturationMin: 0.4, saturationMax: 1, valueMin: 0.3, valueMax: 1},
  {name: 'Blue', hueMin: 200, hueMax: 250, saturationMin: 0.4, saturationMax: 1, valueMin: 0.3, valueMax: 1},
  {name: 'Purple', hueMin: 250, hueMax: 290, saturationMin: 0.4, saturationMax: 1, valueMin: 0.3, valueMax: 1},
  {name: 'Pink', hueMin: 290, hueMax: 350, saturationMin: 0.3, saturationMax: 0.8, valueMin: 0.5, valueMax: 1},
];

// Hot Wheels scale is typically 1:64
export const HOT_WHEELS_SCALE = 64;

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  Calibration: undefined;
  Recording: {calibration: CalibrationData; selectedColor: ColorRange};
  Results: {session: RaceSession};
  Leaderboard: undefined;
  Settings: undefined;
};
