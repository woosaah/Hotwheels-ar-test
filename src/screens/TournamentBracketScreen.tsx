import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList, TournamentMatch, CalibrationData, RaceConfig} from '../types';
import {loadCalibration, getTournament} from '../services/database';

type Props = NativeStackScreenProps<RootStackParamList, 'TournamentBracket'>;

export default function TournamentBracketScreen({navigation, route}: Props): React.JSX.Element {
  const [tournament, setTournament] = useState(route.params.tournament);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);

  useEffect(() => {
    loadCalibration().then(setCalibration);
  }, []);

  // Refresh tournament data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const updated = await getTournament(tournament.id);
      if (updated) {
        setTournament(updated);
      }
    });
    return unsubscribe;
  }, [navigation, tournament.id]);

  const handleMatchPress = (match: TournamentMatch) => {
    if (match.status === 'bye') {
      Alert.alert('Bye', 'This car advances automatically');
      return;
    }
    if (match.status === 'completed') {
      Alert.alert(
        'Match Complete',
        `Winner: ${match.winner?.name}\nScore: ${match.car1Wins} - ${match.car2Wins}`,
      );
      return;
    }
    if (!match.car1 || !match.car2) {
      Alert.alert('Waiting', 'Waiting for previous matches to complete');
      return;
    }

    // Check calibration
    if (!calibration) {
      Alert.alert(
        'Calibration Required',
        'Please calibrate your track before racing',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Calibrate',
            onPress: () => navigation.navigate('Calibration', {mode: 'tournament'}),
          },
        ],
      );
      return;
    }

    // Create race config with tournament context
    const raceConfig: RaceConfig = {
      mode: 'tournament',
      calibrationId: calibration.id,
      cars: [
        {car: match.car1, lane: 1, color: match.car1.color},
        {car: match.car2, lane: 2, color: match.car2.color},
      ],
      laneCount: 2,
      bestOf: tournament.bestOf,
      tournamentId: tournament.id,
      matchId: match.id,
    };

    Alert.alert(
      `${match.car1.name} vs ${match.car2.name}`,
      `Score: ${match.car1Wins} - ${match.car2Wins}\nFirst to ${Math.ceil(tournament.bestOf / 2)} wins`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Race!',
          onPress: () => navigation.navigate('Recording', {calibration, raceConfig}),
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} horizontal>
      <ScrollView contentContainerStyle={styles.bracketContainer}>
        {/* Tournament Header */}
        <View style={styles.header}>
          <Text style={styles.tournamentName}>{tournament.name}</Text>
          <Text style={styles.tournamentInfo}>
            {tournament.cars.length} cars • Best of {tournament.bestOf}
          </Text>
          {tournament.winner && (
            <View style={styles.championBanner}>
              <Text style={styles.championText}>🏆 Champion: {tournament.winner.name}</Text>
            </View>
          )}
        </View>

        {/* Bracket */}
        <View style={styles.bracket}>
          {tournament.bracket.rounds.map((round) => (
            <View key={round.roundNumber} style={styles.round}>
              <Text style={styles.roundName}>{round.name}</Text>
              <View style={styles.matchesContainer}>
                {round.matches.map((match) => (
                  <TouchableOpacity
                    key={match.id}
                    style={[
                      styles.matchCard,
                      match.status === 'completed' && styles.matchCardCompleted,
                      match.status === 'bye' && styles.matchCardBye,
                    ]}
                    onPress={() => handleMatchPress(match)}>
                    {/* Car 1 */}
                    <View style={[
                      styles.matchSlot,
                      match.winner?.id === match.car1?.id && styles.matchSlotWinner,
                    ]}>
                      {match.car1 ? (
                        <>
                          <View style={[styles.carDot, {backgroundColor: getColorHex(match.car1.color.name)}]} />
                          <Text style={styles.carName} numberOfLines={1}>{match.car1.name}</Text>
                          <Text style={styles.winsCount}>{match.car1Wins}</Text>
                        </>
                      ) : (
                        <Text style={styles.tbdText}>TBD</Text>
                      )}
                    </View>

                    <View style={styles.matchDivider}>
                      <Text style={styles.vsText}>vs</Text>
                    </View>

                    {/* Car 2 */}
                    <View style={[
                      styles.matchSlot,
                      match.winner?.id === match.car2?.id && styles.matchSlotWinner,
                    ]}>
                      {match.car2 ? (
                        <>
                          <View style={[styles.carDot, {backgroundColor: getColorHex(match.car2.color.name)}]} />
                          <Text style={styles.carName} numberOfLines={1}>{match.car2.name}</Text>
                          <Text style={styles.winsCount}>{match.car2Wins}</Text>
                        </>
                      ) : match.status === 'bye' ? (
                        <Text style={styles.byeText}>BYE</Text>
                      ) : (
                        <Text style={styles.tbdText}>TBD</Text>
                      )}
                    </View>

                    {match.status === 'pending' && match.car1 && match.car2 && (
                      <View style={styles.playButton}>
                        <Text style={styles.playButtonText}>▶</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back to Tournaments</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScrollView>
  );
}

function getColorHex(colorName: string): string {
  const colors: Record<string, string> = {
    Red: '#e74c3c', Orange: '#e67e22', Yellow: '#f1c40f', Green: '#27ae60',
    Blue: '#3498db', Purple: '#9b59b6', Pink: '#e91e63', White: '#ecf0f1', Black: '#2c3e50',
  };
  return colors[colorName] || '#888';
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0f23'},
  bracketContainer: {padding: 20, minWidth: '100%'},
  header: {alignItems: 'center', marginBottom: 30},
  tournamentName: {fontSize: 24, fontWeight: 'bold', color: '#fff'},
  tournamentInfo: {fontSize: 14, color: '#888', marginTop: 5},
  championBanner: {backgroundColor: '#ffd700', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 15},
  championText: {fontSize: 16, fontWeight: 'bold', color: '#000'},
  bracket: {flexDirection: 'row', justifyContent: 'center'},
  round: {marginHorizontal: 10, minWidth: 150},
  roundName: {fontSize: 14, fontWeight: 'bold', color: '#4ecdc4', textAlign: 'center', marginBottom: 15},
  matchesContainer: {justifyContent: 'space-around', flex: 1},
  matchCard: {backgroundColor: '#1a1a2e', borderRadius: 10, marginVertical: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#333'},
  matchCardCompleted: {borderColor: '#4ecdc4'},
  matchCardBye: {opacity: 0.5},
  matchSlot: {flexDirection: 'row', alignItems: 'center', padding: 10},
  matchSlotWinner: {backgroundColor: 'rgba(78, 205, 196, 0.2)'},
  carDot: {width: 12, height: 12, borderRadius: 6, marginRight: 8},
  carName: {flex: 1, fontSize: 12, color: '#fff'},
  winsCount: {fontSize: 14, fontWeight: 'bold', color: '#4ecdc4', marginLeft: 5},
  tbdText: {fontSize: 12, color: '#666', fontStyle: 'italic'},
  byeText: {fontSize: 12, color: '#888'},
  matchDivider: {backgroundColor: '#2a2a4e', paddingVertical: 2, alignItems: 'center'},
  vsText: {fontSize: 10, color: '#666'},
  playButton: {position: 'absolute', right: 5, top: '50%', marginTop: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: '#ff6b35', justifyContent: 'center', alignItems: 'center'},
  playButtonText: {fontSize: 10, color: '#fff'},
  backButton: {marginTop: 30, padding: 15, alignItems: 'center'},
  backButtonText: {fontSize: 14, color: '#888'},
});
