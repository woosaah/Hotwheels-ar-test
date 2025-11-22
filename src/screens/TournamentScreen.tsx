import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {
  RootStackParamList,
  Tournament,
  Car,
  TournamentBracket,
  TournamentRound,
  TournamentMatch,
} from '../types';
import {loadTournaments, loadCars, addTournament, deleteTournament, generateId} from '../services/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Tournament'>;

export default function TournamentScreen({navigation}: Props): React.JSX.Element {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [selectedCars, setSelectedCars] = useState<Car[]>([]);
  const [availableCars, setAvailableCars] = useState<Car[]>([]);
  const [bestOf, setBestOf] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const [loadedTournaments, cars] = await Promise.all([
      loadTournaments(),
      loadCars(),
    ]);
    setTournaments(loadedTournaments);
    setAvailableCars(cars);
  };

  const toggleCarSelection = (car: Car) => {
    if (selectedCars.find(c => c.id === car.id)) {
      setSelectedCars(selectedCars.filter(c => c.id !== car.id));
    } else if (selectedCars.length < 8) {
      setSelectedCars([...selectedCars, car]);
    } else {
      Alert.alert('Max Cars', 'Maximum 8 cars per tournament');
    }
  };

  const createBracket = (cars: Car[]): TournamentBracket => {
    // Shuffle cars for random seeding
    const shuffled = [...cars].sort(() => Math.random() - 0.5);

    // Pad to power of 2 with byes
    const size = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
    const totalRounds = Math.log2(size);

    const rounds: TournamentRound[] = [];
    let currentCars: (Car | null)[] = shuffled;

    // Pad with nulls for byes
    while (currentCars.length < size) {
      currentCars.push(null);
    }

    // First, create all rounds with matches (so we can reference their IDs)
    const allRoundMatches: TournamentMatch[][] = [];

    // Create first round matches
    const firstRoundMatches: TournamentMatch[] = [];
    for (let i = 0; i < currentCars.length; i += 2) {
      const car1 = currentCars[i];
      const car2 = currentCars[i + 1];

      const match: TournamentMatch = {
        id: generateId(),
        car1,
        car2,
        car1Wins: 0,
        car2Wins: 0,
        races: [],
        winner: car2 === null ? car1 : car1 === null ? car2 : null,
        status: car1 === null || car2 === null ? 'bye' : 'pending',
      };
      firstRoundMatches.push(match);
    }
    allRoundMatches.push(firstRoundMatches);

    // Create subsequent rounds (empty, to be filled as tournament progresses)
    let matchCount = firstRoundMatches.length / 2;
    for (let round = 2; round <= totalRounds; round++) {
      const roundMatches: TournamentMatch[] = [];
      for (let i = 0; i < matchCount; i++) {
        roundMatches.push({
          id: generateId(),
          car1: null,
          car2: null,
          car1Wins: 0,
          car2Wins: 0,
          races: [],
          winner: null,
          status: 'pending',
        });
      }
      allRoundMatches.push(roundMatches);
      matchCount = matchCount / 2;
    }

    // Now link matches to their next matches
    for (let roundIndex = 0; roundIndex < allRoundMatches.length - 1; roundIndex++) {
      const currentRound = allRoundMatches[roundIndex];
      const nextRound = allRoundMatches[roundIndex + 1];

      for (let matchIndex = 0; matchIndex < currentRound.length; matchIndex++) {
        const match = currentRound[matchIndex];
        const nextMatchIndex = Math.floor(matchIndex / 2);
        match.nextMatchId = nextRound[nextMatchIndex].id;
        match.nextMatchSlot = matchIndex % 2 === 0 ? 'car1' : 'car2';
      }
    }

    // Build rounds array with proper names
    for (let i = 0; i < allRoundMatches.length; i++) {
      rounds.push({
        roundNumber: i + 1,
        name: getRoundName(i + 1, totalRounds),
        matches: allRoundMatches[i],
      });
    }

    // Auto-advance byes in first round
    for (const match of allRoundMatches[0]) {
      if (match.status === 'bye' && match.winner && match.nextMatchId) {
        // Place the winner in the next match
        for (let roundIdx = 1; roundIdx < allRoundMatches.length; roundIdx++) {
          const nextMatch = allRoundMatches[roundIdx].find(m => m.id === match.nextMatchId);
          if (nextMatch) {
            if (match.nextMatchSlot === 'car1') {
              nextMatch.car1 = match.winner;
            } else {
              nextMatch.car2 = match.winner;
            }
            break;
          }
        }
      }
    }

    return {rounds};
  };

  const getRoundName = (round: number, total: number): string => {
    const remaining = total - round;
    if (remaining === 0) return 'Finals';
    if (remaining === 1) return 'Semi-Finals';
    if (remaining === 2) return 'Quarter-Finals';
    return `Round ${round}`;
  };

  const handleCreateTournament = async () => {
    if (!tournamentName.trim()) {
      Alert.alert('Error', 'Please enter a tournament name');
      return;
    }
    if (selectedCars.length < 2) {
      Alert.alert('Error', 'Select at least 2 cars for the tournament');
      return;
    }

    const bracket = createBracket(selectedCars);

    const tournament: Tournament = {
      id: generateId(),
      name: tournamentName.trim(),
      cars: selectedCars,
      bracket,
      currentRound: 1,
      totalRounds: bracket.rounds.length,
      bestOf,
      status: 'in_progress',
      createdAt: Date.now(),
    };

    await addTournament(tournament);
    await loadData();
    setShowCreate(false);
    setTournamentName('');
    setSelectedCars([]);

    navigation.navigate('TournamentBracket', {tournament});
  };

  const handleDeleteTournament = (tournament: Tournament) => {
    Alert.alert(
      'Delete Tournament',
      `Delete "${tournament.name}"? This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTournament(tournament.id);
            await loadData();
          },
        },
      ],
    );
  };

  const renderTournament = ({item}: {item: Tournament}) => {
    const completedMatches = item.bracket.rounds.flatMap(r => r.matches).filter(m => m.status === 'completed').length;
    const totalMatches = item.bracket.rounds.flatMap(r => r.matches).filter(m => m.status !== 'bye').length;

    return (
      <TouchableOpacity
        style={styles.tournamentCard}
        onPress={() => navigation.navigate('TournamentBracket', {tournament: item})}
        onLongPress={() => handleDeleteTournament(item)}>
        <View style={styles.tournamentHeader}>
          <Text style={styles.tournamentName}>{item.name}</Text>
          <View style={[styles.statusBadge, item.status === 'completed' && styles.statusBadgeCompleted]}>
            <Text style={styles.statusText}>
              {item.status === 'completed' ? 'Completed' : 'In Progress'}
            </Text>
          </View>
        </View>

        <View style={styles.tournamentInfo}>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{item.cars.length}</Text>
            <Text style={styles.infoLabel}>Cars</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{completedMatches}/{totalMatches}</Text>
            <Text style={styles.infoLabel}>Matches</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>Bo{item.bestOf}</Text>
            <Text style={styles.infoLabel}>Format</Text>
          </View>
        </View>

        {item.winner && (
          <View style={styles.winnerBanner}>
            <Text style={styles.winnerText}>🏆 Winner: {item.winner.name}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (showCreate) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.createContainer}>
          <Text style={styles.createTitle}>Create Tournament</Text>

          <TextInput
            style={styles.nameInput}
            value={tournamentName}
            onChangeText={setTournamentName}
            placeholder="Tournament name"
            placeholderTextColor="#666"
          />

          <Text style={styles.sectionLabel}>Format (Best of):</Text>
          <View style={styles.formatButtons}>
            {[1, 3, 5].map(num => (
              <TouchableOpacity
                key={num}
                style={[styles.formatButton, bestOf === num && styles.formatButtonActive]}
                onPress={() => setBestOf(num)}>
                <Text style={[styles.formatButtonText, bestOf === num && styles.formatButtonTextActive]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>
            Select Cars ({selectedCars.length}/8):
          </Text>
          <View style={styles.carSelection}>
            {availableCars.map(car => (
              <TouchableOpacity
                key={car.id}
                style={[
                  styles.carOption,
                  selectedCars.find(c => c.id === car.id) && styles.carOptionSelected,
                ]}
                onPress={() => toggleCarSelection(car)}>
                <View style={[styles.carOptionColor, {backgroundColor: getColorHex(car.color.name)}]} />
                <Text style={styles.carOptionName}>{car.name}</Text>
                {selectedCars.find(c => c.id === car.id) && (
                  <Text style={styles.carOptionCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            {availableCars.length === 0 && (
              <View style={styles.noCarsMessage}>
                <Text style={styles.noCarsText}>No cars in garage</Text>
                <TouchableOpacity onPress={() => {
                  setShowCreate(false);
                  navigation.navigate('CarGarage');
                }}>
                  <Text style={styles.addCarsLink}>Add cars to garage →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.createButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCreate(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, selectedCars.length < 2 && styles.createButtonDisabled]}
              onPress={handleCreateTournament}
              disabled={selectedCars.length < 2}>
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.newTournamentButton}
        onPress={() => setShowCreate(true)}>
        <Text style={styles.newTournamentButtonText}>+ New Tournament</Text>
      </TouchableOpacity>

      <FlatList
        data={tournaments}
        renderItem={renderTournament}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyTitle}>No Tournaments</Text>
            <Text style={styles.emptyText}>
              Create a tournament to crown the ultimate champion!
            </Text>
          </View>
        }
      />
    </View>
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
  newTournamentButton: {
    backgroundColor: '#ff6b35', marginHorizontal: 20, marginTop: 20, padding: 15,
    borderRadius: 12, alignItems: 'center',
  },
  newTournamentButtonText: {fontSize: 16, fontWeight: 'bold', color: '#fff'},
  listContent: {padding: 20, paddingTop: 10},
  tournamentCard: {backgroundColor: '#1a1a2e', borderRadius: 12, marginBottom: 15, overflow: 'hidden'},
  tournamentHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15},
  tournamentName: {fontSize: 18, fontWeight: 'bold', color: '#fff'},
  statusBadge: {backgroundColor: '#ff6b35', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10},
  statusBadgeCompleted: {backgroundColor: '#4ecdc4'},
  statusText: {fontSize: 11, fontWeight: 'bold', color: '#fff'},
  tournamentInfo: {flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#2a2a4e'},
  infoItem: {flex: 1, alignItems: 'center', paddingVertical: 12},
  infoValue: {fontSize: 18, fontWeight: 'bold', color: '#4ecdc4'},
  infoLabel: {fontSize: 11, color: '#666', marginTop: 2},
  winnerBanner: {backgroundColor: '#ffd700', padding: 10, alignItems: 'center'},
  winnerText: {fontSize: 14, fontWeight: 'bold', color: '#000'},
  emptyContainer: {alignItems: 'center', paddingVertical: 60},
  emptyEmoji: {fontSize: 60, marginBottom: 20},
  emptyTitle: {fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 10},
  emptyText: {fontSize: 14, color: '#666', textAlign: 'center'},
  createContainer: {padding: 20},
  createTitle: {fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 20},
  nameInput: {backgroundColor: '#1a1a2e', borderRadius: 12, padding: 15, fontSize: 16, color: '#fff', marginBottom: 20},
  sectionLabel: {fontSize: 14, color: '#888', marginBottom: 10},
  formatButtons: {flexDirection: 'row', gap: 10, marginBottom: 20},
  formatButton: {flex: 1, padding: 15, backgroundColor: '#1a1a2e', borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#333'},
  formatButtonActive: {borderColor: '#4ecdc4', backgroundColor: '#1a2a2e'},
  formatButtonText: {fontSize: 20, fontWeight: 'bold', color: '#888'},
  formatButtonTextActive: {color: '#4ecdc4'},
  carSelection: {marginBottom: 20},
  carOption: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 2, borderColor: 'transparent'},
  carOptionSelected: {borderColor: '#4ecdc4'},
  carOptionColor: {width: 30, height: 30, borderRadius: 15, marginRight: 12},
  carOptionName: {flex: 1, fontSize: 16, color: '#fff'},
  carOptionCheck: {fontSize: 18, color: '#4ecdc4', fontWeight: 'bold'},
  noCarsMessage: {alignItems: 'center', padding: 20},
  noCarsText: {fontSize: 14, color: '#666'},
  addCarsLink: {fontSize: 14, color: '#4ecdc4', marginTop: 10},
  createButtons: {flexDirection: 'row', gap: 10},
  cancelButton: {flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#444'},
  cancelButtonText: {fontSize: 16, color: '#888'},
  createButton: {flex: 1, backgroundColor: '#ff6b35', padding: 15, borderRadius: 12, alignItems: 'center'},
  createButtonDisabled: {backgroundColor: '#444'},
  createButtonText: {fontSize: 16, fontWeight: 'bold', color: '#fff'},
});
