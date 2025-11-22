import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList, Car, ColorRange} from '../types';
import {HOT_WHEELS_COLORS} from '../types';
import {loadCars, addCar, deleteCar, createCar} from '../services/database';

type Props = NativeStackScreenProps<RootStackParamList, 'CarGarage'>;

export default function CarGarageScreen({navigation}: Props): React.JSX.Element {
  const [cars, setCars] = useState<Car[]>([]);
  const [showAddCar, setShowAddCar] = useState(false);
  const [newCarName, setNewCarName] = useState('');
  const [newCarColor, setNewCarColor] = useState<ColorRange>(HOT_WHEELS_COLORS[0]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const loadedCars = await loadCars();
    setCars(loadedCars);
  };

  const handleAddCar = async () => {
    if (!newCarName.trim()) {
      Alert.alert('Error', 'Please enter a car name');
      return;
    }

    const car = createCar(newCarName.trim(), newCarColor);
    await addCar(car);
    await loadData();
    setNewCarName('');
    setShowAddCar(false);
  };

  const handleDeleteCar = (car: Car) => {
    Alert.alert(
      'Delete Car',
      `Delete ${car.name}? This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCar(car.id);
            await loadData();
          },
        },
      ],
    );
  };

  const renderCar = ({item}: {item: Car}) => (
    <TouchableOpacity
      style={styles.carCard}
      onLongPress={() => handleDeleteCar(item)}>
      <View style={[styles.carColorBar, {backgroundColor: getColorHex(item.color.name)}]} />
      <View style={styles.carInfo}>
        <Text style={styles.carName}>{item.name}</Text>
        <Text style={styles.carColor}>{item.color.name}</Text>
      </View>
      <View style={styles.carStats}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Races:</Text>
          <Text style={styles.statValue}>{item.stats.totalRaces}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Wins:</Text>
          <Text style={[styles.statValue, styles.statWins]}>{item.stats.wins}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Best:</Text>
          <Text style={styles.statValue}>
            {item.stats.bestSpeed ? `${item.stats.bestSpeed.toFixed(1)} km/h` : '-'}
          </Text>
        </View>
      </View>
      <View style={styles.winRate}>
        <Text style={styles.winRateValue}>
          {item.stats.totalRaces > 0
            ? Math.round((item.stats.wins / item.stats.totalRaces) * 100)
            : 0}%
        </Text>
        <Text style={styles.winRateLabel}>Win Rate</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Add Car Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddCar(true)}>
        <Text style={styles.addButtonText}>+ Add New Car</Text>
      </TouchableOpacity>

      {/* Car List */}
      <FlatList
        data={cars}
        renderItem={renderCar}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🚗</Text>
            <Text style={styles.emptyTitle}>Your Garage is Empty</Text>
            <Text style={styles.emptyText}>
              Add your Hot Wheels cars to track their race history
            </Text>
          </View>
        }
      />

      {/* Add Car Modal */}
      {showAddCar && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Car</Text>

            <TextInput
              style={styles.nameInput}
              value={newCarName}
              onChangeText={setNewCarName}
              placeholder="Car name"
              placeholderTextColor="#666"
              autoFocus
            />

            <Text style={styles.colorLabel}>Select Color:</Text>
            <View style={styles.colorGrid}>
              {HOT_WHEELS_COLORS.filter(c => !c.name.includes('wrap')).map(color => (
                <TouchableOpacity
                  key={color.name}
                  style={[
                    styles.colorOption,
                    {backgroundColor: getColorHex(color.name)},
                    newCarColor.name === color.name && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNewCarColor(color)}>
                  {newCarColor.name === color.name && (
                    <Text style={styles.colorCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddCar(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddCar}>
                <Text style={styles.saveButtonText}>Add Car</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  addButton: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4ecdc4',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    color: '#4ecdc4',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  carCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  carColorBar: {
    width: 8,
  },
  carInfo: {
    flex: 1,
    padding: 15,
  },
  carName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  carColor: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  carStats: {
    padding: 15,
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    width: 45,
  },
  statValue: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  statWins: {
    color: '#4ecdc4',
  },
  winRate: {
    backgroundColor: '#2a2a4e',
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  winRateValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  winRateLabel: {
    fontSize: 10,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  nameInput: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  colorLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  colorOption: {
    width: 45,
    height: 45,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#fff',
  },
  colorCheck: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#888',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4ecdc4',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});
