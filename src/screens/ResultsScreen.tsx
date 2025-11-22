import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types';
import {HOT_WHEELS_SCALE} from '../types';
import {formatSpeed, formatTime} from '../utils/speedCalculator';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

export default function ResultsScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const {session} = route.params;
  const {measurement} = session;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Hot Wheels Speed Camera Results!\n\nCar: ${session.carName}\nActual Speed: ${measurement.speedKmh} km/h\nScale Speed (1:${HOT_WHEELS_SCALE}): ${measurement.scaleSpeedKmh} km/h\nTime: ${formatTime(measurement.timeMs)}\n\nMeasured with Hot Wheels Speed Camera app`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const getSpeedRating = (scaleSpeed: number): {label: string; color: string} => {
    if (scaleSpeed > 300) return {label: 'SUPERCAR!', color: '#ff6b35'};
    if (scaleSpeed > 200) return {label: 'FAST!', color: '#4ecdc4'};
    if (scaleSpeed > 100) return {label: 'Good', color: '#7bed9f'};
    return {label: 'Slow', color: '#888'};
  };

  const rating = getSpeedRating(measurement.scaleSpeedKmh);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.carName}>{session.carName}</Text>
        <View style={[styles.colorBadge, {backgroundColor: getColorHex(session.carColor)}]}>
          <Text style={styles.colorBadgeText}>{session.carColor}</Text>
        </View>
      </View>

      {/* Main Speed Display */}
      <View style={styles.speedCard}>
        <Text style={styles.speedLabel}>ACTUAL SPEED</Text>
        <View style={styles.speedRow}>
          <Text style={styles.speedValue}>{measurement.speedKmh}</Text>
          <Text style={styles.speedUnit}>km/h</Text>
        </View>
      </View>

      {/* Scale Speed */}
      <View style={styles.scaleCard}>
        <Text style={styles.scaleLabel}>SCALE SPEED (1:{HOT_WHEELS_SCALE})</Text>
        <View style={styles.speedRow}>
          <Text style={styles.scaleValue}>{measurement.scaleSpeedKmh}</Text>
          <Text style={styles.scaleUnit}>km/h</Text>
        </View>
        <View style={[styles.ratingBadge, {backgroundColor: rating.color}]}>
          <Text style={styles.ratingText}>{rating.label}</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatTime(measurement.timeMs)}</Text>
          <Text style={styles.statLabel}>Time</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{measurement.distanceMeters * 100} cm</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{measurement.fps} fps</Text>
          <Text style={styles.statLabel}>Frame Rate</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {measurement.endFrame - measurement.startFrame}
          </Text>
          <Text style={styles.statLabel}>Frames</Text>
        </View>
      </View>

      {/* Comparison Info */}
      <View style={styles.comparisonCard}>
        <Text style={styles.comparisonTitle}>Real World Comparison</Text>
        <Text style={styles.comparisonText}>
          At 1:64 scale, your Hot Wheels car is moving at the equivalent of{' '}
          <Text style={styles.highlight}>{measurement.scaleSpeedKmh} km/h</Text>
        </Text>
        <Text style={styles.comparisonSubtext}>
          {getSpeedComparison(measurement.scaleSpeedKmh)}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>Share Results</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.raceAgainButton}
          onPress={() => navigation.navigate('Calibration')}>
          <Text style={styles.raceAgainButtonText}>Race Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.leaderboardButton}
          onPress={() => navigation.navigate('Leaderboard')}>
          <Text style={styles.leaderboardButtonText}>View Leaderboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home')}>
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function getColorHex(colorName: string): string {
  const colors: Record<string, string> = {
    Red: '#e74c3c',
    Orange: '#e67e22',
    Yellow: '#f1c40f',
    Green: '#27ae60',
    Blue: '#3498db',
    Purple: '#9b59b6',
    Pink: '#e91e63',
  };
  return colors[colorName] || '#888';
}

function getSpeedComparison(scaleSpeed: number): string {
  if (scaleSpeed > 400) {
    return "That's faster than a Formula 1 car's top speed!";
  }
  if (scaleSpeed > 300) {
    return "That's as fast as a Bugatti Veyron!";
  }
  if (scaleSpeed > 200) {
    return "That's highway supercar speed!";
  }
  if (scaleSpeed > 120) {
    return "That's highway speed!";
  }
  if (scaleSpeed > 60) {
    return "That's city driving speed.";
  }
  return "That's neighborhood speed.";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  carName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  colorBadge: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  colorBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  speedCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 25,
    borderRadius: 16,
    alignItems: 'center',
  },
  speedLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  speedValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
  },
  speedUnit: {
    fontSize: 20,
    color: '#888',
    marginLeft: 8,
  },
  scaleCard: {
    backgroundColor: '#1a2a2e',
    marginHorizontal: 20,
    marginTop: 15,
    padding: 25,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4ecdc4',
  },
  scaleLabel: {
    fontSize: 14,
    color: '#4ecdc4',
    marginBottom: 5,
  },
  scaleValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  scaleUnit: {
    fontSize: 24,
    color: '#4ecdc4',
    marginLeft: 8,
  },
  ratingBadge: {
    marginTop: 15,
    paddingHorizontal: 25,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ratingText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 15,
    marginTop: 20,
  },
  statItem: {
    width: '50%',
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  comparisonCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  comparisonText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
  },
  highlight: {
    color: '#4ecdc4',
    fontWeight: 'bold',
  },
  comparisonSubtext: {
    fontSize: 13,
    color: '#888',
    marginTop: 10,
    fontStyle: 'italic',
  },
  actions: {
    padding: 20,
    gap: 12,
  },
  shareButton: {
    backgroundColor: '#4ecdc4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  raceAgainButton: {
    backgroundColor: '#ff6b35',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  raceAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  leaderboardButton: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4ecdc4',
  },
  leaderboardButtonText: {
    color: '#4ecdc4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  homeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#888',
    fontSize: 14,
  },
});
