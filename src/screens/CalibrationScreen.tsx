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
import type {RootStackParamList, CalibrationData, LaneConfig, RaceMode} from '../types';
import {LANE_COLORS} from '../types';
import {saveCalibration, generateId} from '../services/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Calibration'>;

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const PREVIEW_HEIGHT = 280;

export default function CalibrationScreen({navigation, route}: Props): React.JSX.Element {
  const raceMode: RaceMode = route.params?.mode || 'time_trial';
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  const [step, setStep] = useState(1);
  const [distanceCm, setDistanceCm] = useState('50');
  const [markerStart, setMarkerStart] = useState(0.15);
  const [markerEnd, setMarkerEnd] = useState(0.85);
  const [finishLine, setFinishLine] = useState(0.85);
  const [laneCount, setLaneCount] = useState(raceMode === 'head_to_head' ? 2 : 1);
  const [lanes, setLanes] = useState<LaneConfig[]>([]);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'finish' | null>(null);

  // Initialize lanes based on count
  React.useEffect(() => {
    const newLanes: LaneConfig[] = [];
    for (let i = 0; i < laneCount; i++) {
      const yPos = laneCount === 1 ? 0.5 : 0.3 + (i * 0.4) / (laneCount - 1 || 1);
      newLanes.push({
        id: i + 1,
        yPosition: yPos,
        name: `Lane ${i + 1}`,
        color: LANE_COLORS[i % LANE_COLORS.length],
      });
    }
    setLanes(newLanes);
  }, [laneCount]);

  const handleMarkerDrag = useCallback(
    (x: number) => {
      const normalizedX = Math.max(0.05, Math.min(0.95, x / SCREEN_WIDTH));
      if (isDragging === 'start') {
        setMarkerStart(Math.min(normalizedX, finishLine - 0.1));
      } else if (isDragging === 'finish') {
        setFinishLine(Math.max(normalizedX, markerStart + 0.1));
        setMarkerEnd(Math.max(normalizedX, markerStart + 0.1));
      }
    },
    [isDragging, markerStart, finishLine],
  );

  const handleSaveCalibration = async () => {
    const distance = parseFloat(distanceCm);
    if (isNaN(distance) || distance <= 0) {
      Alert.alert('Invalid Distance', 'Please enter a valid distance in cm');
      return;
    }

    const calibration: CalibrationData = {
      id: generateId(),
      distanceMeters: distance / 100,
      pixelDistance: (finishLine - markerStart) * SCREEN_WIDTH,
      markerStartX: markerStart,
      markerEndX: finishLine,
      finishLineX: finishLine,
      frameWidth: 1920,
      frameHeight: 1080,
      lanes,
      createdAt: Date.now(),
    };

    await saveCalibration(calibration);
    navigation.navigate('RaceSetup', {calibration, mode: raceMode});
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

  const totalSteps = raceMode === 'head_to_head' ? 4 : 3;

  return (
    <ScrollView style={styles.container}>
      {/* Mode Badge */}
      <View style={styles.modeBadge}>
        <Text style={styles.modeBadgeText}>
          {raceMode === 'time_trial' ? '⏱️ Time Trial' : '🏁 Head-to-Head'}
        </Text>
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {Array.from({length: totalSteps}).map((_, i) => (
          <React.Fragment key={i}>
            <View style={[styles.stepDot, step > i && styles.stepDotActive]} />
            {i < totalSteps - 1 && <View style={styles.stepLine} />}
          </React.Fragment>
        ))}
      </View>

      {/* Step 1: Distance */}
      {step === 1 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 1: Set Track Distance</Text>
          <Text style={styles.stepDescription}>
            Measure the distance from the start to the finish line on your track.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Track length (cm)</Text>
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
              {['30', '50', '100', '150'].map(preset => (
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
                    {preset}cm
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={() => setStep(2)}>
            <Text style={styles.nextButtonText}>Next: Position Markers</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Position Start & Finish Lines */}
      {step === 2 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 2: Position Start & Finish</Text>
          <Text style={styles.stepDescription}>
            Drag the markers to align with your track's start and finish lines.
          </Text>

          <View style={styles.cameraContainer}>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              device={device}
              isActive={true}
            />

            <View
              style={styles.markerOverlay}
              onTouchStart={e => {
                const x = e.nativeEvent.locationX;
                const startDist = Math.abs(x - markerStart * SCREEN_WIDTH);
                const finishDist = Math.abs(x - finishLine * SCREEN_WIDTH);
                setIsDragging(startDist < finishDist ? 'start' : 'finish');
              }}
              onTouchMove={e => handleMarkerDrag(e.nativeEvent.locationX)}
              onTouchEnd={() => setIsDragging(null)}>
              {/* Start Line */}
              <View
                style={[styles.marker, styles.markerStart, {left: markerStart * SCREEN_WIDTH - 2}]}>
                <View style={styles.markerLabelContainer}>
                  <Text style={styles.markerLabel}>START</Text>
                </View>
              </View>

              {/* Finish Line */}
              <View
                style={[styles.marker, styles.markerFinish, {left: finishLine * SCREEN_WIDTH - 2}]}>
                <View style={[styles.markerLabelContainer, {backgroundColor: '#ff6b35'}]}>
                  <Text style={styles.markerLabel}>FINISH</Text>
                </View>
              </View>

              {/* Track Zone */}
              <View
                style={[
                  styles.trackZone,
                  {
                    left: markerStart * SCREEN_WIDTH,
                    width: (finishLine - markerStart) * SCREEN_WIDTH,
                  },
                ]}
              />

              {/* Checkered pattern on finish */}
              <View
                style={[
                  styles.checkeredFinish,
                  {left: finishLine * SCREEN_WIDTH - 15},
                ]}
              />
            </View>
          </View>

          <Text style={styles.markerInfo}>
            Start: {Math.round(markerStart * 100)}% | Finish:{' '}
            {Math.round(finishLine * 100)}%
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextButton} onPress={() => setStep(3)}>
              <Text style={styles.nextButtonText}>
                {raceMode === 'head_to_head' ? 'Next: Set Lanes' : 'Next: Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 3: Lane Setup (Head-to-Head only) */}
      {step === 3 && raceMode === 'head_to_head' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 3: Configure Lanes</Text>
          <Text style={styles.stepDescription}>
            Set up lanes for head-to-head racing. Each car will race in its own lane.
          </Text>

          <View style={styles.laneCountContainer}>
            <Text style={styles.laneCountLabel}>Number of lanes:</Text>
            <View style={styles.laneCountButtons}>
              {[2, 3, 4].map(count => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.laneCountButton,
                    laneCount === count && styles.laneCountButtonActive,
                  ]}
                  onPress={() => setLaneCount(count)}>
                  <Text
                    style={[
                      styles.laneCountButtonText,
                      laneCount === count && styles.laneCountButtonTextActive,
                    ]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.cameraContainer}>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              device={device}
              isActive={true}
            />

            <View style={styles.laneOverlay}>
              {/* Lane indicators */}
              {lanes.map((lane, index) => (
                <View
                  key={lane.id}
                  style={[
                    styles.laneIndicator,
                    {
                      top: lane.yPosition * PREVIEW_HEIGHT - 15,
                      backgroundColor: lane.color,
                    },
                  ]}>
                  <Text style={styles.laneIndicatorText}>{lane.name}</Text>
                </View>
              ))}

              {/* Lane lines */}
              {lanes.map(lane => (
                <View
                  key={`line-${lane.id}`}
                  style={[
                    styles.laneLine,
                    {
                      top: lane.yPosition * PREVIEW_HEIGHT,
                      borderColor: lane.color,
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextButton} onPress={() => setStep(4)}>
              <Text style={styles.nextButtonText}>Next: Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Final Step: Confirmation */}
      {((step === 3 && raceMode === 'time_trial') ||
        (step === 4 && raceMode === 'head_to_head')) && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>
            Step {step}: Confirm Calibration
          </Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Track Setup</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Mode:</Text>
              <Text style={styles.summaryValue}>
                {raceMode === 'time_trial' ? 'Time Trial' : 'Head-to-Head'}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Track Length:</Text>
              <Text style={styles.summaryValue}>{distanceCm} cm</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Lanes:</Text>
              <Text style={styles.summaryValue}>{laneCount}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Start Position:</Text>
              <Text style={styles.summaryValue}>{Math.round(markerStart * 100)}%</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Finish Line:</Text>
              <Text style={styles.summaryValue}>{Math.round(finishLine * 100)}%</Text>
            </View>
          </View>

          {/* Mini preview */}
          <View style={styles.miniPreview}>
            <View
              style={[
                styles.miniStart,
                {left: `${markerStart * 100}%`},
              ]}
            />
            <View
              style={[
                styles.miniFinish,
                {left: `${finishLine * 100}%`},
              ]}
            />
            <View
              style={[
                styles.miniTrack,
                {
                  left: `${markerStart * 100}%`,
                  width: `${(finishLine - markerStart) * 100}%`,
                },
              ]}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(step - 1)}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveCalibration}>
              <Text style={styles.saveButtonText}>Start Racing!</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
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
  modeBadge: {
    alignSelf: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 15,
  },
  modeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
    width: 40,
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
  markerFinish: {
    backgroundColor: '#ff6b35',
  },
  markerLabelContainer: {
    position: 'absolute',
    top: 10,
    left: 8,
    backgroundColor: '#4ecdc4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  markerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  trackZone: {
    position: 'absolute',
    top: '35%',
    height: '30%',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.3)',
  },
  checkeredFinish: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 30,
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#ff6b35',
  },
  markerInfo: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    marginBottom: 20,
  },
  laneCountContainer: {
    marginBottom: 20,
  },
  laneCountLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 10,
  },
  laneCountButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  laneCountButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  laneCountButtonActive: {
    borderColor: '#4ecdc4',
    backgroundColor: '#1a2a2e',
  },
  laneCountButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#888',
  },
  laneCountButtonTextActive: {
    color: '#4ecdc4',
  },
  laneOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  laneIndicator: {
    position: 'absolute',
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  laneIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  laneLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  summaryCard: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#888',
  },
  summaryValue: {
    fontSize: 14,
    color: '#4ecdc4',
    fontWeight: 'bold',
  },
  miniPreview: {
    height: 40,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    marginBottom: 20,
    position: 'relative',
  },
  miniStart: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#4ecdc4',
  },
  miniFinish: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#ff6b35',
  },
  miniTrack: {
    position: 'absolute',
    top: 15,
    height: 10,
    backgroundColor: 'rgba(78, 205, 196, 0.3)',
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
