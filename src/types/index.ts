// Types for Hot Wheels Speed Camera App

// ============ CALIBRATION ============

export interface CalibrationData {
  id: string;
  distanceMeters: number; // Real-world distance between markers in meters
  pixelDistance: number; // Distance in pixels in the frame
  markerStartX: number; // Start marker X position (0-1 normalized)
  markerEndX: number; // End marker X position (0-1 normalized)
  finishLineX: number; // Finish line position (0-1 normalized)
  frameWidth: number; // Frame width at calibration time
  frameHeight: number; // Frame height at calibration time
  lanes: LaneConfig[]; // Lane configurations for multi-car racing
  createdAt: number; // Timestamp
}

export interface LaneConfig {
  id: number;
  yPosition: number; // Normalized Y position (0-1)
  name: string; // "Lane 1", "Lane 2", etc.
  color: string; // Visual color for lane marker
}

// ============ CAR & TRACKING ============

export interface Car {
  id: string;
  name: string;
  color: ColorRange;
  lane?: number; // Assigned lane for head-to-head
  imageUri?: string; // Photo of the car
  stats: CarStats;
  createdAt: number;
}

export interface CarStats {
  totalRaces: number;
  wins: number;
  losses: number;
  bestTime: number | null; // Best time in ms
  bestSpeed: number | null; // Best speed in km/h
  avgSpeed: number;
}

export interface CarPosition {
  x: number; // Normalized position (0-1)
  y: number; // Normalized position (0-1)
  timestamp: number; // Frame timestamp in ms
  frameNumber: number;
  confidence: number; // Detection confidence (0-1)
  carId?: string; // Which car this position belongs to
  lane?: number; // Which lane
}

// ============ RACE MODES ============

export type RaceMode = 'time_trial' | 'head_to_head' | 'tournament';

export interface RaceConfig {
  mode: RaceMode;
  calibrationId: string;
  cars: RaceCar[];
  laneCount: number;
  bestOf?: number; // For tournaments, best of 3, 5, etc.
  // Tournament context (optional)
  tournamentId?: string;
  matchId?: string;
}

export interface RaceCar {
  car: Car;
  lane: number;
  color: ColorRange;
}

// ============ RACE RESULTS ============

export interface SpeedMeasurement {
  speedKmh: number; // Actual speed in km/h
  scaleSpeedKmh: number; // Scale speed (multiplied by scale factor)
  timeMs: number; // Time taken to traverse distance
  distanceMeters: number; // Distance covered
  startFrame: number;
  endFrame: number;
  fps: number; // Frames per second used
}

export interface LapResult {
  carId: string;
  carName: string;
  carColor: string;
  lane: number;
  measurement: SpeedMeasurement;
  finishTime: number; // Absolute timestamp when crossed finish line
  finishOrder: number; // 1st, 2nd, 3rd, etc.
  reactionTime?: number; // Time from start signal to first movement
  didFinish: boolean; // Whether car crossed finish line
  disqualified: boolean;
  disqualifyReason?: string;
}

export interface RaceResult {
  id: string;
  mode: RaceMode;
  calibrationId: string;
  laps: LapResult[];
  winner: LapResult | null;
  winMargin?: number; // Time difference to second place in ms
  videoPath?: string;
  thumbnailPath?: string;
  createdAt: number;
}

// Legacy support
export interface RaceSession {
  id: string;
  carName: string;
  carColor: string;
  measurement: SpeedMeasurement;
  calibrationId: string;
  videoPath?: string;
  thumbnailPath?: string;
  createdAt: number;
  raceResultId?: string; // Link to full race result
}

// ============ TOURNAMENT ============

export type TournamentStatus = 'pending' | 'in_progress' | 'completed';
export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'bye';

export interface Tournament {
  id: string;
  name: string;
  cars: Car[];
  bracket: TournamentBracket;
  currentRound: number;
  totalRounds: number;
  bestOf: number; // Best of 1, 3, 5
  status: TournamentStatus;
  winner?: Car;
  createdAt: number;
  completedAt?: number;
}

export interface TournamentBracket {
  rounds: TournamentRound[];
}

export interface TournamentRound {
  roundNumber: number;
  name: string; // "Quarter Finals", "Semi Finals", "Finals"
  matches: TournamentMatch[];
}

export interface TournamentMatch {
  id: string;
  car1: Car | null; // null for bye
  car2: Car | null; // null for bye
  car1Wins: number;
  car2Wins: number;
  races: RaceResult[];
  winner: Car | null;
  status: MatchStatus;
  nextMatchId?: string; // Winner advances to this match
  nextMatchSlot?: 'car1' | 'car2'; // Which slot in next match
}

// ============ COLOR DETECTION ============

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
  {name: 'White', hueMin: 0, hueMax: 360, saturationMin: 0, saturationMax: 0.15, valueMin: 0.8, valueMax: 1},
  {name: 'Black', hueMin: 0, hueMax: 360, saturationMin: 0, saturationMax: 0.3, valueMin: 0, valueMax: 0.2},
];

// Lane colors for visual display
export const LANE_COLORS = ['#4ecdc4', '#ff6b35', '#7bed9f', '#ffd93d', '#6c5ce7', '#fd79a8'];

// Hot Wheels scale is typically 1:64
export const HOT_WHEELS_SCALE = 64;

// ============ NAVIGATION ============

export type RootStackParamList = {
  Home: undefined;
  Calibration: {mode?: RaceMode};
  RaceSetup: {calibration: CalibrationData; mode: RaceMode};
  Recording: {
    calibration: CalibrationData;
    raceConfig: RaceConfig;
  };
  Results: {session: RaceSession};
  RaceResults: {raceResult: RaceResult};
  Winner: {raceResult: RaceResult; tournamentId?: string; matchId?: string};
  Leaderboard: undefined;
  CarGarage: undefined;
  CarDetail: {car: Car};
  Tournament: undefined;
  TournamentSetup: undefined;
  TournamentBracket: {tournament: Tournament};
  TournamentMatch: {tournament: Tournament; match: TournamentMatch};
  Settings: undefined;
};
