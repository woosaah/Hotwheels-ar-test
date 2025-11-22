import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Animated,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList, LapResult, Tournament} from '../types';
import {HOT_WHEELS_SCALE} from '../types';
import {updateTournamentMatch} from '../services/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Winner'>;

export default function WinnerScreen({navigation, route}: Props): React.JSX.Element {
  const {raceResult, tournamentId, matchId} = route.params;
  const [updatedTournament, setUpdatedTournament] = useState<Tournament | null>(null);
  const sortedLaps = [...raceResult.laps]
    .filter(l => l.didFinish)
    .sort((a, b) => a.finishOrder - b.finishOrder);

  const winner = sortedLaps[0];
  const second = sortedLaps[1];
  const third = sortedLaps[2];

  const isTournamentMatch = !!(tournamentId && matchId);

  const podiumAnimation = new Animated.Value(0);

  useEffect(() => {
    Animated.spring(podiumAnimation, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Update tournament match if this is a tournament race
    if (isTournamentMatch) {
      updateTournamentMatch(tournamentId!, matchId!, raceResult).then(tournament => {
        if (tournament) {
          setUpdatedTournament(tournament);
        }
      });
    }
  }, []);

  const handleShare = async () => {
    const results = sortedLaps
      .map((lap, i) => `${i + 1}. ${lap.carName} - ${lap.measurement.timeMs}ms`)
      .join('\n');

    await Share.share({
      message: `Hot Wheels Race Results!\n\nWinner: ${winner?.carName}\n\n${results}\n\nScale Speed: ${winner?.measurement.scaleSpeedKmh} km/h (1:${HOT_WHEELS_SCALE})`,
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Winner Header */}
      <View style={styles.winnerHeader}>
        <Text style={styles.trophyEmoji}>🏆</Text>
        <Text style={styles.winnerLabel}>WINNER!</Text>
        {winner && (
          <>
            <Text style={styles.winnerName}>{winner.carName}</Text>
            <View style={[styles.winnerColorBadge, {backgroundColor: getColorHex(winner.carColor)}]}>
              <Text style={styles.winnerColorText}>{winner.carColor}</Text>
            </View>
          </>
        )}
      </View>

      {/* Podium */}
      {sortedLaps.length > 1 && (
        <Animated.View
          style={[
            styles.podiumContainer,
            {
              transform: [{scale: podiumAnimation}],
              opacity: podiumAnimation,
            },
          ]}>
          {/* Second Place */}
          {second && (
            <View style={styles.podiumPosition}>
              <View style={[styles.podiumAvatar, {backgroundColor: getColorHex(second.carColor)}]}>
                <Text style={styles.podiumNumber}>2</Text>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>{second.carName}</Text>
              <Text style={styles.podiumTime}>{second.measurement.timeMs}ms</Text>
              <View style={[styles.podiumBlock, styles.podiumSecond]}>
                <Text style={styles.podiumMedal}>🥈</Text>
              </View>
            </View>
          )}

          {/* First Place */}
          {winner && (
            <View style={styles.podiumPosition}>
              <View style={[styles.podiumAvatar, styles.podiumAvatarFirst, {backgroundColor: getColorHex(winner.carColor)}]}>
                <Text style={styles.podiumNumberFirst}>1</Text>
              </View>
              <Text style={styles.podiumNameFirst} numberOfLines={1}>{winner.carName}</Text>
              <Text style={styles.podiumTimeFirst}>{winner.measurement.timeMs}ms</Text>
              <View style={[styles.podiumBlock, styles.podiumFirst]}>
                <Text style={styles.podiumMedalFirst}>🥇</Text>
              </View>
            </View>
          )}

          {/* Third Place */}
          {third && (
            <View style={styles.podiumPosition}>
              <View style={[styles.podiumAvatar, {backgroundColor: getColorHex(third.carColor)}]}>
                <Text style={styles.podiumNumber}>3</Text>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>{third.carName}</Text>
              <Text style={styles.podiumTime}>{third.measurement.timeMs}ms</Text>
              <View style={[styles.podiumBlock, styles.podiumThird]}>
                <Text style={styles.podiumMedal}>🥉</Text>
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {/* Winner Stats */}
      {winner && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Winner Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{winner.measurement.timeMs}</Text>
              <Text style={styles.statLabel}>Time (ms)</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{winner.measurement.speedKmh}</Text>
              <Text style={styles.statLabel}>Speed (km/h)</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{winner.measurement.scaleSpeedKmh}</Text>
              <Text style={styles.statLabel}>Scale Speed</Text>
            </View>
            {raceResult.winMargin !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>+{raceResult.winMargin}</Text>
                <Text style={styles.statLabel}>Win Margin (ms)</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* All Results */}
      <View style={styles.resultsCard}>
        <Text style={styles.resultsTitle}>Race Results</Text>
        {sortedLaps.map((lap, index) => (
          <View key={lap.carId} style={styles.resultRow}>
            <View style={styles.resultPosition}>
              <Text style={styles.resultPositionText}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
              </Text>
            </View>
            <View style={[styles.resultColorDot, {backgroundColor: getColorHex(lap.carColor)}]} />
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{lap.carName}</Text>
              <Text style={styles.resultLane}>Lane {lap.lane}</Text>
            </View>
            <View style={styles.resultStats}>
              <Text style={styles.resultTime}>{lap.measurement.timeMs}ms</Text>
              <Text style={styles.resultSpeed}>{lap.measurement.speedKmh} km/h</Text>
            </View>
          </View>
        ))}

        {/* DNF */}
        {raceResult.laps.filter(l => !l.didFinish).map(lap => (
          <View key={lap.carId} style={[styles.resultRow, styles.resultRowDNF]}>
            <View style={styles.resultPosition}>
              <Text style={styles.resultPositionDNF}>DNF</Text>
            </View>
            <View style={[styles.resultColorDot, {backgroundColor: getColorHex(lap.carColor)}]} />
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{lap.carName}</Text>
              <Text style={styles.resultLane}>Lane {lap.lane}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Tournament Status */}
      {isTournamentMatch && updatedTournament && (
        <View style={styles.tournamentStatus}>
          <Text style={styles.tournamentStatusTitle}>Tournament Update</Text>
          {updatedTournament.winner ? (
            <View style={styles.championBanner}>
              <Text style={styles.championText}>
                {updatedTournament.winner.name} is the Champion!
              </Text>
            </View>
          ) : (
            <Text style={styles.tournamentStatusText}>
              Match recorded. Continue the bracket for more races!
            </Text>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>Share Results</Text>
        </TouchableOpacity>

        {isTournamentMatch && updatedTournament ? (
          <TouchableOpacity
            style={styles.rematchButton}
            onPress={() => navigation.navigate('TournamentBracket', {tournament: updatedTournament})}>
            <Text style={styles.rematchButtonText}>
              {updatedTournament.winner ? 'View Final Bracket' : 'Continue Tournament'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.rematchButton}
            onPress={() => navigation.navigate('Calibration', {mode: raceResult.mode})}>
            <Text style={styles.rematchButtonText}>Race Again</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.leaderboardButton}
          onPress={() => navigation.navigate('Leaderboard')}>
          <Text style={styles.leaderboardButtonText}>Leaderboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home')}>
          <Text style={styles.homeButtonText}>Home</Text>
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
    White: '#ecf0f1',
    Black: '#2c3e50',
  };
  return colors[colorName] || '#888';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  winnerHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#1a1a2e',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  trophyEmoji: {
    fontSize: 60,
  },
  winnerLabel: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffd700',
    marginTop: 10,
  },
  winnerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  winnerColorBadge: {
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 15,
    marginTop: 10,
  },
  winnerColorText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 10,
  },
  podiumPosition: {
    alignItems: 'center',
    marginHorizontal: 5,
    flex: 1,
  },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  podiumAvatarFirst: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderColor: '#ffd700',
    borderWidth: 3,
  },
  podiumNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  podiumNumberFirst: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  podiumName: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 2,
    maxWidth: 80,
    textAlign: 'center',
  },
  podiumNameFirst: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
    maxWidth: 100,
    textAlign: 'center',
  },
  podiumTime: {
    fontSize: 10,
    color: '#888',
    marginBottom: 5,
  },
  podiumTimeFirst: {
    fontSize: 12,
    color: '#ffd700',
    marginBottom: 5,
  },
  podiumBlock: {
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  podiumFirst: {
    height: 100,
    backgroundColor: '#ffd700',
  },
  podiumSecond: {
    height: 70,
    backgroundColor: '#c0c0c0',
  },
  podiumThird: {
    height: 50,
    backgroundColor: '#cd7f32',
  },
  podiumMedal: {
    fontSize: 30,
  },
  podiumMedalFirst: {
    fontSize: 40,
  },
  statsCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    paddingVertical: 10,
    alignItems: 'center',
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
  resultsCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  resultRowDNF: {
    opacity: 0.5,
  },
  resultPosition: {
    width: 40,
    alignItems: 'center',
  },
  resultPositionText: {
    fontSize: 20,
  },
  resultPositionDNF: {
    fontSize: 12,
    color: '#ff6b35',
    fontWeight: 'bold',
  },
  resultColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  resultLane: {
    fontSize: 12,
    color: '#666',
  },
  resultStats: {
    alignItems: 'flex-end',
  },
  resultTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  resultSpeed: {
    fontSize: 12,
    color: '#888',
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
  rematchButton: {
    backgroundColor: '#ff6b35',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rematchButtonText: {
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
  tournamentStatus: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  tournamentStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ecdc4',
    marginBottom: 10,
  },
  tournamentStatusText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  championBanner: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  championText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});
