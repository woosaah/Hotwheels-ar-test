import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList, CalibrationData} from '../types';
import {loadCalibration, getStats} from '../services/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({navigation}: Props): React.JSX.Element {
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [stats, setStats] = useState({
    totalRaces: 0,
    avgSpeed: 0,
    topSpeed: 0,
    avgScaleSpeed: 0,
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const cal = await loadCalibration();
    setCalibration(cal);
    const s = await getStats();
    setStats(s);
  };

  const handleStartRace = () => {
    if (!calibration) {
      Alert.alert(
        'Calibration Required',
        'Please calibrate your camera first by setting up distance markers.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Calibrate', onPress: () => navigation.navigate('Calibration')},
        ],
      );
      return;
    }
    navigation.navigate('Calibration');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
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
          <Text style={styles.statValue}>
            {stats.avgScaleSpeed > 0 ? Math.round(stats.avgScaleSpeed) : '-'}
          </Text>
          <Text style={styles.statLabel}>Avg Scale km/h</Text>
        </View>
      </View>

      {/* Calibration Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Calibration Status</Text>
        {calibration ? (
          <View>
            <Text style={styles.statusText}>
              Distance: {calibration.distanceMeters * 100} cm
            </Text>
            <Text style={styles.statusText}>
              Last calibrated:{' '}
              {new Date(calibration.createdAt).toLocaleDateString()}
            </Text>
            <TouchableOpacity
              style={styles.recalibrateButton}
              onPress={() => navigation.navigate('Calibration')}>
              <Text style={styles.recalibrateText}>Recalibrate</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.statusWarning}>Not calibrated</Text>
            <Text style={styles.statusHint}>
              Place markers on your track and calibrate before racing
            </Text>
          </View>
        )}
      </View>

      {/* Main Actions */}
      <TouchableOpacity style={styles.mainButton} onPress={handleStartRace}>
        <Text style={styles.mainButtonText}>Start Race</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Leaderboard')}>
        <Text style={styles.secondaryButtonText}>View Leaderboard</Text>
      </TouchableOpacity>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>How to Use</Text>
        <Text style={styles.instructionText}>
          1. Place two markers on your track at a known distance (e.g., 50cm)
        </Text>
        <Text style={styles.instructionText}>
          2. Calibrate by marking the distance in the app
        </Text>
        <Text style={styles.instructionText}>
          3. Select your car's color for tracking
        </Text>
        <Text style={styles.instructionText}>
          4. Record your car racing through the markers
        </Text>
        <Text style={styles.instructionText}>
          5. View actual speed and scale speed (1:64)
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
    paddingVertical: 30,
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
  statusCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
  },
  statusWarning: {
    fontSize: 16,
    color: '#ff6b35',
    fontWeight: 'bold',
  },
  statusHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  recalibrateButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#2a2a4e',
    borderRadius: 8,
    alignItems: 'center',
  },
  recalibrateText: {
    color: '#4ecdc4',
    fontWeight: 'bold',
  },
  mainButton: {
    backgroundColor: '#ff6b35',
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  mainButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4ecdc4',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ecdc4',
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
