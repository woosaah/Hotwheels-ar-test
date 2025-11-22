import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  RaceSession,
  CalibrationData,
  Car,
  CarStats,
  RaceResult,
  Tournament,
  TournamentMatch,
  ColorRange,
} from '../types';

const STORAGE_KEYS = {
  SESSIONS: '@hotwheels/sessions',
  CALIBRATION: '@hotwheels/calibration',
  CARS: '@hotwheels/cars',
  RACE_RESULTS: '@hotwheels/race_results',
  TOURNAMENTS: '@hotwheels/tournaments',
  SETTINGS: '@hotwheels/settings',
};

// ============ RACE SESSIONS (Legacy) ============

export async function saveSessions(sessions: RaceSession[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
}

export async function loadSessions(): Promise<RaceSession[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
  return data ? JSON.parse(data) : [];
}

export async function addSession(session: RaceSession): Promise<void> {
  const sessions = await loadSessions();
  sessions.unshift(session);
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

// ============ CALIBRATION ============

export async function saveCalibration(calibration: CalibrationData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.CALIBRATION, JSON.stringify(calibration));
}

export async function loadCalibration(): Promise<CalibrationData | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.CALIBRATION);
  return data ? JSON.parse(data) : null;
}

// ============ CARS (Garage) ============

export async function saveCars(cars: Car[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.CARS, JSON.stringify(cars));
}

export async function loadCars(): Promise<Car[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.CARS);
  return data ? JSON.parse(data) : [];
}

export async function addCar(car: Car): Promise<void> {
  const cars = await loadCars();
  cars.unshift(car);
  await saveCars(cars);
}

export async function updateCar(carId: string, updates: Partial<Car>): Promise<void> {
  const cars = await loadCars();
  const index = cars.findIndex(c => c.id === carId);
  if (index !== -1) {
    cars[index] = {...cars[index], ...updates};
    await saveCars(cars);
  }
}

export async function deleteCar(carId: string): Promise<void> {
  const cars = await loadCars();
  const filtered = cars.filter(c => c.id !== carId);
  await saveCars(filtered);
}

export async function updateCarStats(
  carId: string,
  raceResult: {timeMs: number; speedKmh: number; won: boolean},
): Promise<void> {
  const cars = await loadCars();
  const index = cars.findIndex(c => c.id === carId);

  if (index !== -1) {
    const car = cars[index];
    const stats = car.stats;

    stats.totalRaces += 1;
    if (raceResult.won) {
      stats.wins += 1;
    } else {
      stats.losses += 1;
    }

    if (stats.bestTime === null || raceResult.timeMs < stats.bestTime) {
      stats.bestTime = raceResult.timeMs;
    }

    if (stats.bestSpeed === null || raceResult.speedKmh > stats.bestSpeed) {
      stats.bestSpeed = raceResult.speedKmh;
    }

    // Update average speed
    const prevTotal = stats.avgSpeed * (stats.totalRaces - 1);
    stats.avgSpeed = (prevTotal + raceResult.speedKmh) / stats.totalRaces;

    cars[index].stats = stats;
    await saveCars(cars);
  }
}

export function createDefaultCarStats(): CarStats {
  return {
    totalRaces: 0,
    wins: 0,
    losses: 0,
    bestTime: null,
    bestSpeed: null,
    avgSpeed: 0,
  };
}

export function createCar(name: string, color: ColorRange): Car {
  return {
    id: generateId(),
    name,
    color,
    stats: createDefaultCarStats(),
    createdAt: Date.now(),
  };
}

// ============ RACE RESULTS ============

export async function saveRaceResults(results: RaceResult[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.RACE_RESULTS, JSON.stringify(results));
}

export async function loadRaceResults(): Promise<RaceResult[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.RACE_RESULTS);
  return data ? JSON.parse(data) : [];
}

export async function addRaceResult(result: RaceResult): Promise<void> {
  const results = await loadRaceResults();
  results.unshift(result);
  await saveRaceResults(results);

  // Update car stats for each participant
  for (const lap of result.laps) {
    if (lap.didFinish && !lap.disqualified) {
      await updateCarStats(lap.carId, {
        timeMs: lap.measurement.timeMs,
        speedKmh: lap.measurement.speedKmh,
        won: result.winner?.carId === lap.carId,
      });
    }
  }
}

export async function deleteRaceResult(resultId: string): Promise<void> {
  const results = await loadRaceResults();
  const filtered = results.filter(r => r.id !== resultId);
  await saveRaceResults(filtered);
}

// ============ TOURNAMENTS ============

export async function saveTournaments(tournaments: Tournament[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(tournaments));
}

export async function loadTournaments(): Promise<Tournament[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.TOURNAMENTS);
  return data ? JSON.parse(data) : [];
}

export async function addTournament(tournament: Tournament): Promise<void> {
  const tournaments = await loadTournaments();
  tournaments.unshift(tournament);
  await saveTournaments(tournaments);
}

export async function updateTournament(
  tournamentId: string,
  updates: Partial<Tournament>,
): Promise<void> {
  const tournaments = await loadTournaments();
  const index = tournaments.findIndex(t => t.id === tournamentId);
  if (index !== -1) {
    tournaments[index] = {...tournaments[index], ...updates};
    await saveTournaments(tournaments);
  }
}

export async function deleteTournament(tournamentId: string): Promise<void> {
  const tournaments = await loadTournaments();
  const filtered = tournaments.filter(t => t.id !== tournamentId);
  await saveTournaments(filtered);
}

export async function getTournament(tournamentId: string): Promise<Tournament | null> {
  const tournaments = await loadTournaments();
  return tournaments.find(t => t.id === tournamentId) || null;
}

export async function updateTournamentMatch(
  tournamentId: string,
  matchId: string,
  raceResult: RaceResult,
): Promise<Tournament | null> {
  const tournaments = await loadTournaments();
  const tournamentIndex = tournaments.findIndex(t => t.id === tournamentId);

  if (tournamentIndex === -1) return null;

  const tournament = tournaments[tournamentIndex];
  let matchFound = false;

  // Find and update the match
  for (const round of tournament.bracket.rounds) {
    const matchIndex = round.matches.findIndex(m => m.id === matchId);
    if (matchIndex !== -1) {
      const match = round.matches[matchIndex];
      matchFound = true;

      // Add race result to match
      match.races.push(raceResult);

      // Update win counts
      if (raceResult.winner) {
        if (raceResult.winner.carId === match.car1?.id) {
          match.car1Wins += 1;
        } else if (raceResult.winner.carId === match.car2?.id) {
          match.car2Wins += 1;
        }
      }

      // Check if match is complete (best of N)
      const winsNeeded = Math.ceil(tournament.bestOf / 2);
      if (match.car1Wins >= winsNeeded) {
        match.winner = match.car1;
        match.status = 'completed';
        advanceWinner(tournament, match, match.car1!);
      } else if (match.car2Wins >= winsNeeded) {
        match.winner = match.car2;
        match.status = 'completed';
        advanceWinner(tournament, match, match.car2!);
      }

      break;
    }
  }

  if (!matchFound) return null;

  // Check if tournament is complete
  const finalRound = tournament.bracket.rounds[tournament.bracket.rounds.length - 1];
  const finalMatch = finalRound.matches[0];
  if (finalMatch.status === 'completed' && finalMatch.winner) {
    tournament.winner = finalMatch.winner;
    tournament.status = 'completed';
    tournament.completedAt = Date.now();
  }

  await saveTournaments(tournaments);
  return tournament;
}

function advanceWinner(tournament: Tournament, match: TournamentMatch, winner: Car): void {
  if (!match.nextMatchId) return;

  // Find next match and place winner
  for (const round of tournament.bracket.rounds) {
    const nextMatch = round.matches.find(m => m.id === match.nextMatchId);
    if (nextMatch) {
      if (match.nextMatchSlot === 'car1') {
        nextMatch.car1 = winner;
      } else {
        nextMatch.car2 = winner;
      }

      // If both cars are set and one is null (bye), auto-advance
      if (nextMatch.car1 && !nextMatch.car2) {
        nextMatch.winner = nextMatch.car1;
        nextMatch.status = 'bye';
        advanceWinner(tournament, nextMatch, nextMatch.car1);
      } else if (nextMatch.car2 && !nextMatch.car1) {
        nextMatch.winner = nextMatch.car2;
        nextMatch.status = 'bye';
        advanceWinner(tournament, nextMatch, nextMatch.car2);
      }
      break;
    }
  }
}

// ============ LEADERBOARD & STATS ============

export async function getLeaderboard(limit = 20): Promise<RaceSession[]> {
  const sessions = await loadSessions();
  return sessions
    .sort((a, b) => b.measurement.speedKmh - a.measurement.speedKmh)
    .slice(0, limit);
}

export async function getCarLeaderboard(limit = 20): Promise<Car[]> {
  const cars = await loadCars();
  return cars
    .filter(c => c.stats.bestSpeed !== null)
    .sort((a, b) => (b.stats.bestSpeed || 0) - (a.stats.bestSpeed || 0))
    .slice(0, limit);
}

export async function getStats(): Promise<{
  totalRaces: number;
  avgSpeed: number;
  topSpeed: number;
  avgScaleSpeed: number;
  totalCars: number;
  totalTournaments: number;
}> {
  const [sessions, cars, tournaments] = await Promise.all([
    loadSessions(),
    loadCars(),
    loadTournaments(),
  ]);

  if (sessions.length === 0) {
    return {
      totalRaces: 0,
      avgSpeed: 0,
      topSpeed: 0,
      avgScaleSpeed: 0,
      totalCars: cars.length,
      totalTournaments: tournaments.length,
    };
  }

  const speeds = sessions.map(s => s.measurement.speedKmh);
  const scaleSpeeds = sessions.map(s => s.measurement.scaleSpeedKmh);

  return {
    totalRaces: sessions.length,
    avgSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
    topSpeed: Math.max(...speeds),
    avgScaleSpeed: scaleSpeeds.reduce((a, b) => a + b, 0) / scaleSpeeds.length,
    totalCars: cars.length,
    totalTournaments: tournaments.length,
  };
}

export async function getHeadToHeadStats(
  car1Id: string,
  car2Id: string,
): Promise<{car1Wins: number; car2Wins: number; races: RaceResult[]}> {
  const results = await loadRaceResults();

  const headToHead = results.filter(
    r =>
      r.mode === 'head_to_head' &&
      r.laps.some(l => l.carId === car1Id) &&
      r.laps.some(l => l.carId === car2Id),
  );

  let car1Wins = 0;
  let car2Wins = 0;

  for (const race of headToHead) {
    if (race.winner?.carId === car1Id) car1Wins++;
    else if (race.winner?.carId === car2Id) car2Wins++;
  }

  return {car1Wins, car2Wins, races: headToHead};
}

// ============ UTILITIES ============

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}
