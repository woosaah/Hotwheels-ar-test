import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList, CalibrationData, RaceMode} from '../types';
import {loadCalibration, getStats, loadCars, loadTournaments} from '../services/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({navigation}: Props): React.JSX.Element {
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [stats, setStats] = useState({
    totalRaces: 0,
    avgSpeed: 0,
    topSpeed: 0,
    avgScaleSpeed: 0,
    totalCars: 0,
    totalTournaments: 0,
  });
  const [activeTournaments, setActiveTournaments] = useState(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const [cal, s, cars, tournaments] = await Promise.all([
      loadCalibration(),
      getStats(),
      loadCars(),
      loadTournaments(),
    ]);
    setCalibration(cal);
    setStats({...s, totalCars: cars.length, totalTournaments: tournaments.length});
    setActiveTournaments(
      tournaments.filter(t => t.status === 'in_progress').length,
    );
  };

  const handleStartRace = (mode: RaceMode) => {
    navigation.navigate('Calibration', {mode});
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Hot Wheels</Text>
        <Text style={styles.subtitle}>Speed Camera</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalRaces}</Text>
          <Text style={styles.statLabel}>Races</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {stats.topSpeed > 0 ? stats.topSpeed.toFixed(1) : '-'}
          </Text>
          <Text style={styles.statLabel}>Top km/h</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalCars}</Text>
          <Text style={styles.statLabel}>Cars</Text>
        </View>
      </View>

      {/* Race Mode Selection */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Start Racing</Text>
      </View>

      <TouchableOpacity
        style={styles.raceModeCard}
        onPress={() => handleStartRace('time_trial')}>
        <View style={styles.raceModeIcon}>
          <Text style={styles.raceModeEmoji}>⏱️</Text>
        </View>
        <View style={styles.raceModeInfo}>
          <Text style={styles.raceModeTitle}>Time Trial</Text>
          <Text style={styles.raceModeDesc}>
            Single car speed measurement. Test your car's top speed!
          </Text>
        </View>
        <Text style={styles.raceModeArrow}>→</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.raceModeCard}
        onPress={() => handleStartRace('head_to_head')}>
        <View style={[styles.raceModeIcon, {backgroundColor: '#ff6b35'}]}>
          <Text style={styles.raceModeEmoji}>🏁</Text>
        </View>
        <View style={styles.raceModeInfo}>
          <Text style={styles.raceModeTitle}>Head-to-Head</Text>
          <Text style={styles.raceModeDesc}>
            Race 2 cars side by side. First across the finish line wins!
          </Text>
        </View>
        <Text style={styles.raceModeArrow}>→</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.raceModeCard}
        onPress={() => navigation.navigate('Tournament')}>
        <View style={[styles.raceModeIcon, {backgroundColor: '#9b59b6'}]}>
          <Text style={styles.raceModeEmoji}>🏆</Text>
        </View>
        <View style={styles.raceModeInfo}>
          <Text style={styles.raceModeTitle}>Tournament</Text>
          <Text style={styles.raceModeDesc}>
            Bracket-style competition. Crown the ultimate champion!
          </Text>
          {activeTournaments > 0 && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>
                {activeTournaments} active
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.raceModeArrow}>→</Text>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('CarGarage')}>
          <Text style={styles.quickActionEmoji}>🚗</Text>
          <Text style={styles.quickActionText}>Garage</Text>
          <Text style={styles.quickActionCount}>{stats.totalCars}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Leaderboard')}>
          <Text style={styles.quickActionEmoji}>📊</Text>
          <Text style={styles.quickActionText}>Leaderboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Calibration', {})}>
          <Text style={styles.quickActionEmoji}>⚙️</Text>
          <Text style={styles.quickActionText}>Calibrate</Text>
        </TouchableOpacity>
      </View>

      {/* Calibration Status */}
      {calibration && (
        <View style={styles.calibrationCard}>
          <Text style={styles.calibrationTitle}>Track Calibrated</Text>
          <Text style={styles.calibrationText}>
            Distance: {(calibration.distanceMeters * 100).toFixed(0)} cm •{' '}
            {calibration.lanes?.length || 1} lane(s)
          </Text>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Quick Start Guide</Text>
        <Text style={styles.instructionText}>
          1. Place markers on your track at a known distance
        </Text>
        <Text style={styles.instructionText}>
          2. Choose a race mode and calibrate
        </Text>
        <Text style={styles.instructionText}>
          3. Add your cars to the garage
        </Text>
        <Text style={styles.instructionText}>
          4. Race and see who's the fastest!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 25,
    position: 'relative',
  },
  settingsButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
  },
  settingsIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  subtitle: {
    fontSize: 24,
    color: '#fff',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  raceModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  raceModeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  raceModeEmoji: {
    fontSize: 24,
  },
  raceModeInfo: {
    flex: 1,
    marginLeft: 15,
  },
  raceModeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  raceModeDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  raceModeArrow: {
    fontSize: 24,
    color: '#4ecdc4',
  },
  activeBadge: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    marginHorizontal: 5,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickActionEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  quickActionText: {
    fontSize: 12,
    color: '#fff',
  },
  quickActionCount: {
    fontSize: 14,
    color: '#4ecdc4',
    fontWeight: 'bold',
    marginTop: 3,
  },
  calibrationCard: {
    backgroundColor: '#1a2a2e',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4ecdc4',
  },
  calibrationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  calibrationText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  instructions: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  instructionText: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 8,
    lineHeight: 18,
  },
});
