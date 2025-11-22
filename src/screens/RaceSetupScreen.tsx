import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {
  RootStackParamList,
  Car,
  RaceCar,
  RaceConfig,
  ColorRange,
} from '../types';
import {HOT_WHEELS_COLORS, LANE_COLORS} from '../types';
import {loadCars, addCar, createCar} from '../services/database';

type Props = NativeStackScreenProps<RootStackParamList, 'RaceSetup'>;

export default function RaceSetupScreen({navigation, route}: Props): React.JSX.Element {
  const {calibration, mode} = route.params;
  const laneCount = calibration.lanes.length;

  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCars, setSelectedCars] = useState<(Car | null)[]>(
    Array(laneCount).fill(null),
  );
  const [showAddCar, setShowAddCar] = useState(false);
  const [newCarName, setNewCarName] = useState('');
  const [newCarColor, setNewCarColor] = useState<ColorRange>(HOT_WHEELS_COLORS[0]);
  const [selectingLane, setSelectingLane] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

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
    setCars(prev => [car, ...prev]);
    setNewCarName('');
    setShowAddCar(false);

    if (selectingLane !== null) {
      const newSelected = [...selectedCars];
      newSelected[selectingLane] = car;
      setSelectedCars(newSelected);
      setSelectingLane(null);
    }
  };

  const handleSelectCar = (car: Car) => {
    if (selectingLane === null) return;

    // Check if car is already selected in another lane
    const existingLane = selectedCars.findIndex(c => c?.id === car.id);
    if (existingLane !== -1 && existingLane !== selectingLane) {
      Alert.alert('Already Selected', 'This car is already in another lane');
      return;
    }

    const newSelected = [...selectedCars];
    newSelected[selectingLane] = car;
    setSelectedCars(newSelected);
    setSelectingLane(null);
  };

  const handleStartRace = () => {
    const filledLanes = selectedCars.filter(c => c !== null);

    if (mode === 'head_to_head' && filledLanes.length < 2) {
      Alert.alert('Select Cars', 'Please select at least 2 cars for head-to-head racing');
      return;
    }

    if (mode === 'time_trial' && filledLanes.length < 1) {
      Alert.alert('Select Car', 'Please select a car for time trial');
      return;
    }

    const raceCars: RaceCar[] = selectedCars
      .map((car, index) => {
        if (!car) return null;
        return {
          car,
          lane: index + 1,
          color: car.color,
        };
      })
      .filter((rc): rc is RaceCar => rc !== null);

    const raceConfig: RaceConfig = {
      mode,
      calibrationId: calibration.id,
      cars: raceCars,
      laneCount,
    };

    navigation.navigate('Recording', {calibration, raceConfig});
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {mode === 'time_trial' ? 'Time Trial Setup' : 'Head-to-Head Setup'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'time_trial'
            ? 'Select a car to race'
            : `Select cars for ${laneCount} lanes`}
        </Text>
      </View>

      {/* Lane Selection */}
      <View style={styles.lanesContainer}>
        {calibration.lanes.map((lane, index) => (
          <TouchableOpacity
            key={lane.id}
            style={[
              styles.laneCard,
              selectingLane === index && styles.laneCardActive,
              {borderColor: lane.color},
            ]}
            onPress={() => setSelectingLane(index)}>
            <View style={[styles.laneIndicator, {backgroundColor: lane.color}]}>
              <Text style={styles.laneNumber}>{index + 1}</Text>
            </View>
            <View style={styles.laneInfo}>
              <Text style={styles.laneName}>{lane.name}</Text>
              {selectedCars[index] ? (
                <View style={styles.selectedCarInfo}>
                  <View
                    style={[
                      styles.carColorDot,
                      {backgroundColor: getColorHex(selectedCars[index]!.color.name)},
                    ]}
                  />
                  <Text style={styles.selectedCarName}>
                    {selectedCars[index]!.name}
                  </Text>
                </View>
              ) : (
                <Text style={styles.tapToSelect}>Tap to select car</Text>
              )}
            </View>
            {selectedCars[index] && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  const newSelected = [...selectedCars];
                  newSelected[index] = null;
                  setSelectedCars(newSelected);
                }}>
                <Text style={styles.clearButtonText}>×</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Car Selection (when a lane is selected) */}
      {selectingLane !== null && (
        <View style={styles.carSelectionContainer}>
          <View style={styles.selectionHeader}>
            <Text style={styles.selectionTitle}>
              Select car for Lane {selectingLane + 1}
            </Text>
            <TouchableOpacity onPress={() => setSelectingLane(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Add New Car Button */}
          <TouchableOpacity
            style={styles.addCarButton}
            onPress={() => setShowAddCar(true)}>
            <Text style={styles.addCarButtonText}>+ Add New Car</Text>
          </TouchableOpacity>

          {/* Existing Cars */}
          {cars.length > 0 ? (
            <View style={styles.carGrid}>
              {cars.map(car => (
                <TouchableOpacity
                  key={car.id}
                  style={[
                    styles.carCard,
                    selectedCars.some(c => c?.id === car.id) && styles.carCardDisabled,
                  ]}
                  onPress={() => handleSelectCar(car)}
                  disabled={selectedCars.some(c => c?.id === car.id)}>
                  <View
                    style={[
                      styles.carCardColor,
                      {backgroundColor: getColorHex(car.color.name)},
                    ]}
                  />
                  <Text style={styles.carCardName}>{car.name}</Text>
                  <Text style={styles.carCardStats}>
                    {car.stats.totalRaces} races • {car.stats.wins}W
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noCarsContainer}>
              <Text style={styles.noCarsText}>No cars in garage</Text>
              <Text style={styles.noCarsSubtext}>Add your first car above</Text>
            </View>
          )}
        </View>
      )}

      {/* Add Car Modal */}
      {showAddCar && (
        <View style={styles.addCarModal}>
          <View style={styles.addCarContent}>
            <Text style={styles.addCarTitle}>Add New Car</Text>

            <TextInput
              style={styles.carNameInput}
              value={newCarName}
              onChangeText={setNewCarName}
              placeholder="Car name (e.g., Blue Blazer)"
              placeholderTextColor="#666"
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

            <View style={styles.addCarButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddCar(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveCarButton} onPress={handleAddCar}>
                <Text style={styles.saveCarButtonText}>Add Car</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Start Race Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.startButton,
            selectedCars.filter(c => c !== null).length < (mode === 'head_to_head' ? 2 : 1) &&
              styles.startButtonDisabled,
          ]}
          onPress={handleStartRace}
          disabled={
            selectedCars.filter(c => c !== null).length < (mode === 'head_to_head' ? 2 : 1)
          }>
          <Text style={styles.startButtonText}>Start Race!</Text>
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
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  lanesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  laneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#333',
  },
  laneCardActive: {
    backgroundColor: '#1a2a2e',
  },
  laneIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laneNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  laneInfo: {
    flex: 1,
    marginLeft: 15,
  },
  laneName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  selectedCarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  carColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  selectedCarName: {
    fontSize: 14,
    color: '#4ecdc4',
  },
  tapToSelect: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  clearButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff6b35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  carSelectionContainer: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  cancelText: {
    fontSize: 14,
    color: '#ff6b35',
  },
  addCarButton: {
    backgroundColor: '#2a2a4e',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4ecdc4',
    borderStyle: 'dashed',
  },
  addCarButtonText: {
    fontSize: 16,
    color: '#4ecdc4',
    fontWeight: 'bold',
  },
  carGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  carCard: {
    width: '48%',
    backgroundColor: '#2a2a4e',
    padding: 12,
    borderRadius: 10,
  },
  carCardDisabled: {
    opacity: 0.5,
  },
  carCardColor: {
    width: '100%',
    height: 40,
    borderRadius: 8,
    marginBottom: 10,
  },
  carCardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  carCardStats: {
    fontSize: 11,
    color: '#888',
    marginTop: 3,
  },
  noCarsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noCarsText: {
    fontSize: 16,
    color: '#fff',
  },
  noCarsSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  addCarModal: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: 20,
  },
  addCarContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
  },
  addCarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  carNameInput: {
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
  addCarButtons: {
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
  saveCarButton: {
    flex: 1,
    backgroundColor: '#4ecdc4',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveCarButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  bottomContainer: {
    padding: 20,
  },
  startButton: {
    backgroundColor: '#ff6b35',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#444',
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
});
