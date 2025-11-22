import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList, RaceSession} from '../types';
import {
  getLeaderboard,
  getStats,
  deleteSession,
  clearAllSessions,
} from '../services/database';
import {HOT_WHEELS_SCALE} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

export default function LeaderboardScreen({navigation}: Props): React.JSX.Element {
  const [sessions, setSessions] = useState<RaceSession[]>([]);
  const [stats, setStats] = useState({
    totalRaces: 0,
    avgSpeed: 0,
    topSpeed: 0,
    avgScaleSpeed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [leaderboard, statsData] = await Promise.all([
      getLeaderboard(50),
      getStats(),
    ]);
    setSessions(leaderboard);
    setStats(statsData);
    setLoading(false);
  };

  const handleDeleteSession = (session: RaceSession) => {
    Alert.alert(
      'Delete Race',
      `Delete ${session.carName}'s race result?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(session.id);
            loadData();
          },
        },
      ],
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all race results? This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllSessions();
            loadData();
          },
        },
      ],
    );
  };

  const renderItem = ({item, index}: {item: RaceSession; index: number}) => {
    const isTopThree = index < 3;
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

    return (
      <TouchableOpacity
        style={[styles.itemContainer, isTopThree && styles.itemContainerTop]}
        onLongPress={() => handleDeleteSession(item)}
        onPress={() => navigation.navigate('Results', {session: item})}>
        <View style={styles.rankContainer}>
          {medal ? (
            <Text style={styles.medal}>{medal}</Text>
          ) : (
            <Text style={styles.rank}>#{index + 1}</Text>
          )}
        </View>

        <View style={styles.carInfo}>
          <Text style={styles.carName}>{item.carName}</Text>
          <View style={styles.carMeta}>
            <View
              style={[styles.colorDot, {backgroundColor: getColorHex(item.carColor)}]}
            />
            <Text style={styles.carDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.speedInfo}>
          <Text style={styles.speedValue}>
            {item.measurement.speedKmh.toFixed(2)}
          </Text>
          <Text style={styles.speedLabel}>km/h</Text>
          <Text style={styles.scaleSpeed}>
            Scale: {Math.round(item.measurement.scaleSpeedKmh)} km/h
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalRaces}</Text>
          <Text style={styles.statLabel}>Total Races</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {stats.topSpeed > 0 ? stats.topSpeed.toFixed(2) : '-'}
          </Text>
          <Text style={styles.statLabel}>Top Speed (km/h)</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {stats.avgSpeed > 0 ? stats.avgSpeed.toFixed(2) : '-'}
          </Text>
          <Text style={styles.statLabel}>Avg Speed (km/h)</Text>
        </View>
      </View>

      {/* Scale Info */}
      <View style={styles.scaleInfo}>
        <Text style={styles.scaleInfoText}>
          Scale speeds calculated at 1:{HOT_WHEELS_SCALE} ratio
        </Text>
      </View>

      {sessions.length > 0 && (
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Leaderboard</Text>
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No races yet!</Text>
      <Text style={styles.emptyText}>
        Start racing to see your results on the leaderboard
      </Text>
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => navigation.navigate('Calibration')}>
        <Text style={styles.startButtonText}>Start Racing</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadData}
      />
    </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  listContent: {
    paddingBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  statBox: {
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  statLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 5,
    textAlign: 'center',
  },
  scaleInfo: {
    alignItems: 'center',
    paddingBottom: 15,
  },
  scaleInfoText: {
    fontSize: 12,
    color: '#666',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearText: {
    fontSize: 14,
    color: '#ff6b35',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    marginHorizontal: 15,
    marginVertical: 5,
    padding: 15,
    borderRadius: 12,
  },
  itemContainerTop: {
    borderWidth: 1,
    borderColor: '#4ecdc4',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  medal: {
    fontSize: 24,
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
  },
  carInfo: {
    flex: 1,
    marginLeft: 10,
  },
  carName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  carMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  carDate: {
    fontSize: 12,
    color: '#666',
  },
  speedInfo: {
    alignItems: 'flex-end',
  },
  speedValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  speedLabel: {
    fontSize: 10,
    color: '#888',
  },
  scaleSpeed: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
