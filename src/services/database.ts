import AsyncStorage from '@react-native-async-storage/async-storage';
import type {RaceSession, CalibrationData} from '../types';

const STORAGE_KEYS = {
  SESSIONS: '@hotwheels/sessions',
  CALIBRATION: '@hotwheels/calibration',
  SETTINGS: '@hotwheels/settings',
};

// Race Sessions
export async function saveSessions(sessions: RaceSession[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
}

export async function loadSessions(): Promise<RaceSession[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
  return data ? JSON.parse(data) : [];
}

export async function addSession(session: RaceSession): Promise<void> {
  const sessions = await loadSessions();
  sessions.unshift(session); // Add to beginning
  await saveSessions(sessions);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const sessions = await loadSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  await saveSessions(filtered);
}

export async function clearAllSessions(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.SESSIONS);
}

// Calibration
export async function saveCalibration(calibration: CalibrationData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.CALIBRATION, JSON.stringify(calibration));
}

export async function loadCalibration(): Promise<CalibrationData | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.CALIBRATION);
  return data ? JSON.parse(data) : null;
}

// Leaderboard helpers
export async function getLeaderboard(limit = 20): Promise<RaceSession[]> {
  const sessions = await loadSessions();
  return sessions
    .sort((a, b) => b.measurement.speedKmh - a.measurement.speedKmh)
    .slice(0, limit);
}

export async function getStats(): Promise<{
  totalRaces: number;
  avgSpeed: number;
  topSpeed: number;
  avgScaleSpeed: number;
}> {
  const sessions = await loadSessions();

  if (sessions.length === 0) {
    return {totalRaces: 0, avgSpeed: 0, topSpeed: 0, avgScaleSpeed: 0};
  }

  const speeds = sessions.map(s => s.measurement.speedKmh);
  const scaleSpeeds = sessions.map(s => s.measurement.scaleSpeedKmh);

  return {
    totalRaces: sessions.length,
    avgSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
    topSpeed: Math.max(...speeds),
    avgScaleSpeed: scaleSpeeds.reduce((a, b) => a + b, 0) / scaleSpeeds.length,
  };
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
