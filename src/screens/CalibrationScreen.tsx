import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList, CalibrationData, ColorRange} from '../types';
import {HOT_WHEELS_COLORS} from '../types';
import {saveCalibration} from '../services/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Calibration'>;

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const PREVIEW_HEIGHT = 300;

export default function CalibrationScreen({navigation}: Props): React.JSX.Element {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  const [step, setStep] = useState(1); // 1: distance, 2: markers, 3: color
  const [distanceCm, setDistanceCm] = useState('50');
  const [markerStart, setMarkerStart] = useState(0.2);
  const [markerEnd, setMarkerEnd] = useState(0.8);
  const [selectedColor, setSelectedColor] = useState<ColorRange>(HOT_WHEELS_COLORS[0]);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);

  const handleMarkerDrag = useCallback(
    (x: number) => {
      const normalizedX = Math.max(0, Math.min(1, x / SCREEN_WIDTH));
      if (isDragging === 'start') {
        setMarkerStart(Math.min(normalizedX, markerEnd - 0.1));
      } else if (isDragging === 'end') {
        setMarkerEnd(Math.max(normalizedX, markerStart + 0.1));
      }
    },
    [isDragging, markerStart, markerEnd],
  );

  const handleSaveCalibration = async () => {
    const distance = parseFloat(distanceCm);
    if (isNaN(distance) || distance <= 0) {
      Alert.alert('Invalid Distance', 'Please enter a valid distance in cm');
      return;
    }

    const calibration: CalibrationData = {
      distanceMeters: distance / 100,
      pixelDistance: (markerEnd - markerStart) * SCREEN_WIDTH,
      markerStartX: markerStart,
      markerEndX: markerEnd,
      frameWidth: 1920,
      frameHeight: 1080,
      createdAt: Date.now(),
    };

    await saveCalibration(calibration);
    navigation.navigate('Recording', {calibration, selectedColor});
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera permission is required for calibration
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No camera device found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
        <View style={styles.stepLine} />
        <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
        <View style={styles.stepLine} />
        <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
      </View>

      {step === 1 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 1: Set Distance</Text>
          <Text style={styles.stepDescription}>
            Place two markers on your track at a known distance apart.
            Measure the exact distance between them.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Distance between markers (cm)</Text>
            <TextInput
              style={styles.input}
              value={distanceCm}
              onChangeText={setDistanceCm}
              keyboardType="numeric"
              placeholder="50"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.presetContainer}>
            <Text style={styles.presetLabel}>Quick select:</Text>
            <View style={styles.presetButtons}>
              {['30', '50', '100'].map(preset => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetButton,
                    distanceCm === preset && styles.presetButtonActive,
                  ]}
                  onPress={() => setDistanceCm(preset)}>
                  <Text
                    style={[
                      styles.presetButtonText,
                      distanceCm === preset && styles.presetButtonTextActive,
                    ]}>
                    {preset} cm
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => setStep(2)}>
            <Text style={styles.nextButtonText}>Next: Set Markers</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 2: Position Markers</Text>
          <Text style={styles.stepDescription}>
            Align the markers below with your physical markers on the track.
            Drag them to match your setup.
          </Text>

          {/* Camera Preview with Markers */}
          <View style={styles.cameraContainer}>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              device={device}
              isActive={true}
              video={false}
              photo={false}
            />

            {/* Marker Overlay */}
            <View
              style={styles.markerOverlay}
              onTouchStart={e => {
                const x = e.nativeEvent.locationX;
                const startDist = Math.abs(x - markerStart * SCREEN_WIDTH);
                const endDist = Math.abs(x - markerEnd * SCREEN_WIDTH);
                setIsDragging(startDist < endDist ? 'start' : 'end');
              }}
              onTouchMove={e => handleMarkerDrag(e.nativeEvent.locationX)}
              onTouchEnd={() => setIsDragging(null)}>
              {/* Start Marker */}
              <View
                style={[
                  styles.marker,
                  styles.markerStart,
                  {left: markerStart * SCREEN_WIDTH - 2},
                ]}>
                <Text style={styles.markerLabel}>START</Text>
              </View>

              {/* End Marker */}
              <View
                style={[
                  styles.marker,
                  styles.markerEnd,
                  {left: markerEnd * SCREEN_WIDTH - 2},
                ]}>
                <Text style={styles.markerLabel}>END</Text>
              </View>

              {/* Distance Line */}
              <View
                style={[
                  styles.distanceLine,
                  {
                    left: markerStart * SCREEN_WIDTH,
                    width: (markerEnd - markerStart) * SCREEN_WIDTH,
                  },
                ]}
              />
            </View>
          </View>

          <Text style={styles.markerInfo}>
            Marker positions: {Math.round(markerStart * 100)}% -{' '}
            {Math.round(markerEnd * 100)}%
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(1)}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setStep(3)}>
              <Text style={styles.nextButtonText}>Next: Select Color</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 3: Select Car Color</Text>
          <Text style={styles.stepDescription}>
            Choose the primary color of your Hot Wheels car for tracking.
          </Text>

          <View style={styles.colorGrid}>
            {HOT_WHEELS_COLORS.filter(c => !c.name.includes('wrap')).map(
              color => (
                <TouchableOpacity
                  key={color.name}
                  style={[
                    styles.colorButton,
                    {backgroundColor: getColorPreview(color)},
                    selectedColor.name === color.name && styles.colorButtonSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}>
                  <Text style={styles.colorButtonText}>{color.name}</Text>
                </TouchableOpacity>
              ),
            )}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Calibration Summary</Text>
            <Text style={styles.summaryText}>
              Distance: {distanceCm} cm
            </Text>
            <Text style={styles.summaryText}>
              Markers: {Math.round(markerStart * 100)}% -{' '}
              {Math.round(markerEnd * 100)}%
            </Text>
            <Text style={styles.summaryText}>
              Tracking Color: {selectedColor.name}
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(2)}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveCalibration}>
              <Text style={styles.saveButtonText}>Start Recording</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function getColorPreview(color: ColorRange): string {
  const hue = (color.hueMin + color.hueMax) / 2;
  return `hsl(${hue}, 70%, 50%)`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ff6b35',
    textAlign: 'center',
    marginTop: 50,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  stepDotActive: {
    backgroundColor: '#4ecdc4',
  },
  stepLine: {
    width: 50,
    height: 2,
    backgroundColor: '#333',
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  stepDescription: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 15,
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  presetContainer: {
    marginBottom: 30,
  },
  presetLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  presetButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  presetButtonActive: {
    borderColor: '#4ecdc4',
    backgroundColor: '#1a2a2e',
  },
  presetButtonText: {
    color: '#888',
    fontSize: 14,
  },
  presetButtonTextActive: {
    color: '#4ecdc4',
    fontWeight: 'bold',
  },
  cameraContainer: {
    height: PREVIEW_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
  },
  camera: {
    flex: 1,
  },
  markerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  marker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
  },
  markerStart: {
    backgroundColor: '#4ecdc4',
  },
  markerEnd: {
    backgroundColor: '#ff6b35',
  },
  markerLabel: {
    position: 'absolute',
    top: 10,
    left: 8,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  distanceLine: {
    position: 'absolute',
    top: PREVIEW_HEIGHT / 2,
    height: 2,
    backgroundColor: '#fff',
  },
  markerInfo: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  colorButton: {
    width: '30%',
    aspectRatio: 1.5,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: '#fff',
  },
  colorButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  summaryCard: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    backgroundColor: '#4ecdc4',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#4ecdc4',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  backButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  backButtonText: {
    fontSize: 16,
    color: '#888',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#ff6b35',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
