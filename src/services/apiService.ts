/**
 * API Service for external tournament app integration
 *
 * This service handles all communication with the external tournament web app.
 * Update the endpoint paths and data transformations to match your API structure.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ApiSettings,
  ApiTournament,
  ApiBracket,
  ApiMatch,
  ApiRaceResult,
  ApiParticipant,
  RaceResult,
  LapResult,
} from '../types';
import {DEFAULT_API_SETTINGS} from '../types';

const SETTINGS_KEY = '@hotwheels_api_settings';

// ============ SETTINGS MANAGEMENT ============

export async function getApiSettings(): Promise<ApiSettings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (json) {
      return {...DEFAULT_API_SETTINGS, ...JSON.parse(json)};
    }
    return DEFAULT_API_SETTINGS;
  } catch (error) {
    console.error('Failed to load API settings:', error);
    return DEFAULT_API_SETTINGS;
  }
}

export async function saveApiSettings(settings: ApiSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save API settings:', error);
    throw error;
  }
}

export async function isApiMode(): Promise<boolean> {
  const settings = await getApiSettings();
  return settings.mode === 'api' && !!settings.apiUrl;
}

// ============ API CLIENT ============

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const settings = await getApiSettings();

  if (!settings.apiUrl) {
    return {success: false, error: 'API URL not configured', statusCode: 0};
  }

  const url = `${settings.apiUrl.replace(/\/$/, '')}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add API key if configured
  if (settings.apiKey) {
    headers['Authorization'] = `Bearer ${settings.apiKey}`;
    // Or use your API's auth method:
    // headers['X-API-Key'] = settings.apiKey;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const statusCode = response.status;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `API Error (${statusCode}): ${errorText}`,
        statusCode,
      };
    }

    const data = await response.json();
    return {success: true, data, statusCode};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    return {success: false, error: message, statusCode: 0};
  }
}

// ============ CONNECTION TEST ============

export async function testApiConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  const settings = await getApiSettings();

  if (!settings.apiUrl) {
    return {success: false, message: 'API URL not configured'};
  }

  try {
    // Adjust this endpoint to match your API's health/ping endpoint
    const response = await apiRequest<{status: string}>('/api/health');
    // Or try: '/api/ping', '/api/v1/status', etc.

    if (response.success) {
      return {success: true, message: 'Connected successfully'};
    }

    return {success: false, message: response.error || 'Connection failed'};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return {success: false, message};
  }
}

// ============ TOURNAMENTS ============

export async function fetchTournaments(): Promise<ApiResponse<ApiTournament[]>> {
  // Adjust endpoint to match your API
  return apiRequest<ApiTournament[]>('/api/tournaments');
  // Or: '/api/v1/tournaments', '/tournaments', etc.
}

export async function fetchTournament(
  tournamentId: string,
): Promise<ApiResponse<ApiTournament>> {
  return apiRequest<ApiTournament>(`/api/tournaments/${tournamentId}`);
}

// ============ BRACKETS ============

export async function fetchBracket(
  tournamentId: string,
): Promise<ApiResponse<ApiBracket>> {
  // Adjust endpoint to match your API
  return apiRequest<ApiBracket>(`/api/tournaments/${tournamentId}/bracket`);
  // Or: `/api/brackets/${tournamentId}`, etc.
}

export async function fetchBracketMatches(
  bracketId: string,
): Promise<ApiResponse<ApiMatch[]>> {
  return apiRequest<ApiMatch[]>(`/api/brackets/${bracketId}/matches`);
}

// ============ MATCHES ============

export async function fetchMatch(matchId: string): Promise<ApiResponse<ApiMatch>> {
  return apiRequest<ApiMatch>(`/api/matches/${matchId}`);
}

export async function fetchPendingMatches(
  tournamentId: string,
): Promise<ApiResponse<ApiMatch[]>> {
  // Fetch matches that are ready to be raced
  return apiRequest<ApiMatch[]>(
    `/api/tournaments/${tournamentId}/matches?status=pending`,
  );
}

// ============ RACE RESULTS ============

/**
 * Submit race result to the external tournament API
 * This is the main integration point - call this after a race completes
 */
export async function submitRaceResult(
  matchId: string,
  raceResult: RaceResult,
): Promise<ApiResponse<ApiMatch>> {
  // Transform local RaceResult to your API's expected format
  const apiResult = transformRaceResultForApi(raceResult, matchId);

  return apiRequest<ApiMatch>(`/api/matches/${matchId}/result`, {
    method: 'POST',
    body: JSON.stringify(apiResult),
  });
}

/**
 * Transform local RaceResult to API format
 * Adjust this function to match your API's expected data structure
 */
function transformRaceResultForApi(
  raceResult: RaceResult,
  matchId: string,
): ApiRaceResult {
  const winner = raceResult.winner;
  const laps = raceResult.laps;

  // Find participants by finish order
  const first = laps.find(l => l.finishOrder === 1);
  const second = laps.find(l => l.finishOrder === 2);

  return {
    matchId,
    winnerId: winner?.carId || '',
    participant1Time: first?.measurement.timeMs,
    participant2Time: second?.measurement.timeMs,
    participant1Speed: first?.measurement.speedKmh,
    participant2Speed: second?.measurement.speedKmh,
    winMargin: raceResult.winMargin,
    // Add more fields as needed for your API
  };
}

/**
 * Transform API match data to local format
 * Adjust this to match your API's data structure
 */
export function transformApiMatchToLocal(apiMatch: ApiMatch): {
  id: string;
  participant1Id?: string;
  participant2Id?: string;
  winnerId?: string;
  status: string;
} {
  return {
    id: apiMatch.id,
    participant1Id: apiMatch.participant1Id,
    participant2Id: apiMatch.participant2Id,
    winnerId: apiMatch.winnerId,
    status: apiMatch.status,
  };
}

// ============ PARTICIPANTS ============

export async function fetchParticipants(
  tournamentId: string,
): Promise<ApiResponse<ApiParticipant[]>> {
  return apiRequest<ApiParticipant[]>(
    `/api/tournaments/${tournamentId}/participants`,
  );
}

export async function fetchParticipant(
  participantId: string,
): Promise<ApiResponse<ApiParticipant>> {
  return apiRequest<ApiParticipant>(`/api/participants/${participantId}`);
}

// ============ SYNC UTILITIES ============

/**
 * Sync all pending local results to the API
 * Call this when app comes online or user triggers manual sync
 */
export async function syncPendingResults(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  // TODO: Implement queue for offline results
  // This would read from a local queue of unsent results
  // and attempt to send each one to the API

  return {synced: 0, failed: 0, errors: []};
}

/**
 * Update last sync timestamp
 */
export async function updateLastSync(): Promise<void> {
  const settings = await getApiSettings();
  settings.lastSyncAt = Date.now();
  await saveApiSettings(settings);
}

// ============ VIDEO UPLOAD (Placeholder) ============

export async function uploadRaceVideo(
  matchId: string,
  videoPath: string,
): Promise<ApiResponse<{videoUrl: string}>> {
  // TODO: Implement video upload
  // This would use multipart/form-data to upload the video file
  // and return the hosted URL

  return {
    success: false,
    error: 'Video upload not implemented',
    statusCode: 501,
  };
}
