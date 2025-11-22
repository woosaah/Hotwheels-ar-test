import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Vibration,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
} from 'react-native-vision-camera';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {
  RootStackParamList,
  RaceResult,
  LapResult,
  SpeedMeasurement,
} from '../types';
import {HOT_WHEELS_SCALE} from '../types';
import {addRaceResult, generateId, addSession} from '../services/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Recording'>;

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

type RaceState = 'ready' | 'countdown' | 'racing' | 'finished';

interface CarTrackingState {
  carId: string;
  carName: string;
  lane: number;
  color: string;
  hasStarted: boolean;
  hasCrossedFinish: boolean;
  startFrame: number | null;
  finishFrame: number | null;
  positions: {x: number; frame: number}[];
}

export default function RecordingScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const {calibration, raceConfig} = route.params;
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  const [raceState, setRaceState] = useState<RaceState>('ready');
  const [countdown, setCountdown] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [carStates, setCarStates] = useState<CarTrackingState[]>([]);
  const [winner, setWinner] = useState<CarTrackingState | null>(null);

  const frameCountRef = useRef(0);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const format = useCameraFormat(device, [
    {videoResolution: {width: 1920, height: 1080}},
    {fps: 60},
  ]);

  const fps = format?.maxFps || 60;

  useEffect(() => {
    // Initialize car tracking states
    const initialStates: CarTrackingState[] = raceConfig.cars.map(rc => ({
      carId: rc.car.id,
      carName: rc.car.name,
      lane: rc.lane,
      color: rc.color.name,
      hasStarted: false,
      hasCrossedFinish: false,
      startFrame: null,
      finishFrame: null,
      positions: [],
    }));
    setCarStates(initialStates);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [raceConfig]);

  const startCountdown = () => {
    setRaceState('countdown');
    setCountdown(3);

    let count = 3;
    const countdownInterval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      Vibration.vibrate(100);

      if (count <= 0) {
        clearInterval(countdownInterval);
        startRace();
      }
    }, 1000);
  };

  const startRace = async () => {
    setRaceState('racing');
    frameCountRef.current = 0;
    startTimeRef.current = Date.now();
    setRecordingTime(0);

    Vibration.vibrate([0, 200, 100, 200]); // Go signal!

    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime(t => t + 100);
      frameCountRef.current += 6; // ~60fps, update every 100ms = 6 frames

      // Simulate car tracking
      simulateCarTracking();
    }, 100);

    // Start recording
    if (cameraRef.current) {
      cameraRef.current.startRecording({
        onRecordingFinished: video => {
          console.log('Recording saved:', video.path);
        },
        onRecordingError: error => {
          console.error('Recording error:', error);
        },
      });
    }
  };

  const simulateCarTracking = useCallback(() => {
    setCarStates(prevStates => {
      const newStates = [...prevStates];
      let raceFinished = false;
      let raceWinner: CarTrackingState | null = null;

      newStates.forEach((state, index) => {
        if (state.hasCrossedFinish) return;

        // Simulate car movement (random speed variation per car)
        const baseSpeed = 0.015 + Math.random() * 0.01;
        const laneBonus = (index + 1) * 0.001; // Slight lane advantage
        const speed = baseSpeed + laneBonus + Math.random() * 0.005;

        const lastPos = state.positions.length > 0
          ? state.positions[state.positions.length - 1].x
          : calibration.markerStartX - 0.1;

        const newX = Math.min(lastPos + speed, 1);

        // Check if crossed start
        if (!state.hasStarted && newX >= calibration.markerStartX) {
          state.hasStarted = true;
          state.startFrame = frameCountRef.current;
        }

        // Check if crossed finish
        if (state.hasStarted && !state.hasCrossedFinish && newX >= calibration.finishLineX) {
          state.hasCrossedFinish = true;
          state.finishFrame = frameCountRef.current;

          if (!raceWinner) {
            raceWinner = state;
            raceFinished = true;
          }
        }

        state.positions.push({x: newX, frame: frameCountRef.current});
      });

      // Check if race should end
      const allFinished = newStates.every(s => s.hasCrossedFinish);
      const timeout = frameCountRef.current > fps * 10; // 10 second timeout

      if (raceFinished && raceWinner && !winner) {
        setWinner(raceWinner);
        Vibration.vibrate([0, 300, 100, 300, 100, 300]); // Winner celebration
      }

      if (allFinished || timeout) {
        finishRace(newStates);
      }

      return newStates;
    });
  }, [calibration, fps, winner]);

  const finishRace = async (finalStates: CarTrackingState[]) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (cameraRef.current) {
      await cameraRef.current.stopRecording();
    }

    setRaceState('finished');

    // Calculate results
    const sortedByFinish = [...finalStates]
      .filter(s => s.hasCrossedFinish)
      .sort((a, b) => (a.finishFrame || 999999) - (b.finishFrame || 999999));

    const lapResults: LapResult[] = finalStates.map((state, index) => {
      const finishOrder = sortedByFinish.findIndex(s => s.carId === state.carId) + 1;
      const frames = (state.finishFrame || frameCountRef.current) - (state.startFrame || 0);
      const timeMs = (frames / fps) * 1000;
      const speedKmh = (calibration.distanceMeters / (timeMs / 1000)) * 3.6;

      const measurement: SpeedMeasurement = {
        speedKmh: Math.round(speedKmh * 100) / 100,
        scaleSpeedKmh: Math.round(speedKmh * HOT_WHEELS_SCALE * 100) / 100,
        timeMs: Math.round(timeMs),
        distanceMeters: calibration.distanceMeters,
        startFrame: state.startFrame || 0,
        endFrame: state.finishFrame || frameCountRef.current,
        fps,
      };

      return {
        carId: state.carId,
        carName: state.carName,
        carColor: state.color,
        lane: state.lane,
        measurement,
        finishTime: state.finishFrame || 0,
        finishOrder: finishOrder || finalStates.length,
        didFinish: state.hasCrossedFinish,
        disqualified: false,
      };
    });

    const winnerResult = lapResults.find(l => l.finishOrder === 1) || null;
    const secondPlace = lapResults.find(l => l.finishOrder === 2);
    const winMargin = winnerResult && secondPlace
      ? secondPlace.measurement.timeMs - winnerResult.measurement.timeMs
      : undefined;

    const raceResult: RaceResult = {
      id: generateId(),
      mode: raceConfig.mode,
      calibrationId: calibration.id,
      laps: lapResults,
      winner: winnerResult,
      winMargin,
      createdAt: Date.now(),
    };

    await addRaceResult(raceResult);

    // Also add to legacy sessions for leaderboard compatibility
    for (const lap of lapResults) {
      if (lap.didFinish) {
        await addSession({
          id: generateId(),
          carName: lap.carName,
          carColor: lap.carColor,
          measurement: lap.measurement,
          calibrationId: calibration.id,
          createdAt: Date.now(),
          raceResultId: raceResult.id,
        });
      }
    }

    // Navigate to winner screen
    setTimeout(() => {
      navigation.replace('Winner', {raceResult});
    }, 1500);
  };

  const handleCancel = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (cameraRef.current && raceState === 'racing') {
      await cameraRef.current.stopRecording();
    }
    navigation.goBack();
  };

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No camera device available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        video={true}
        audio={false}
        format={format}
      />

      {/* Track Overlay */}
      <View style={styles.overlay}>
        {/* Start Line */}
        <View
          style={[
            styles.startLine,
            {left: calibration.markerStartX * SCREEN_WIDTH},
          ]}
        />

        {/* Finish Line */}
        <View
          style={[
            styles.finishLine,
            {left: calibration.finishLineX * SCREEN_WIDTH},
          ]}>
          <View style={styles.checkeredPattern} />
        </View>

        {/* Lane Lines */}
        {calibration.lanes.map(lane => (
          <View
            key={lane.id}
            style={[
              styles.laneLine,
              {
                top: lane.yPosition * SCREEN_HEIGHT * 0.6 + SCREEN_HEIGHT * 0.2,
                borderColor: lane.color,
              },
            ]}
          />
        ))}

        {/* Car Position Indicators */}
        {raceState === 'racing' && carStates.map(car => {
          const lastPos = car.positions[car.positions.length - 1];
          if (!lastPos) return null;
          const lane = calibration.lanes.find(l => l.id === car.lane);
          return (
            <View
              key={car.carId}
              style={[
                styles.carIndicator,
                {
                  left: lastPos.x * SCREEN_WIDTH - 15,
                  top: (lane?.yPosition || 0.5) * SCREEN_HEIGHT * 0.6 + SCREEN_HEIGHT * 0.2 - 15,
                  backgroundColor: getColorHex(car.color),
                  borderColor: car.hasCrossedFinish ? '#ffd700' : '#fff',
                },
              ]}>
              <Text style={styles.carIndicatorText}>{car.lane}</Text>
            </View>
          );
        })}
      </View>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>

        <View style={styles.modeContainer}>
          <Text style={styles.modeText}>
            {raceConfig.mode === 'time_trial' ? 'TIME TRIAL' : 'HEAD-TO-HEAD'}
          </Text>
        </View>

        <View style={styles.fpsContainer}>
          <Text style={styles.fpsText}>{fps} FPS</Text>
        </View>
      </View>

      {/* Countdown Overlay */}
      {raceState === 'countdown' && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownText}>
            {countdown > 0 ? countdown : 'GO!'}
          </Text>
        </View>
      )}

      {/* Race Status */}
      {raceState === 'racing' && (
        <View style={styles.raceStatus}>
          <View style={styles.timerContainer}>
            <View style={styles.recordingDot} />
            <Text style={styles.timerText}>
              {(recordingTime / 1000).toFixed(1)}s
            </Text>
          </View>

          {/* Car Status */}
          <View style={styles.carStatusContainer}>
            {carStates.map(car => (
              <View
                key={car.carId}
                style={[
                  styles.carStatus,
                  {borderLeftColor: getColorHex(car.color)},
                ]}>
                <Text style={styles.carStatusName}>{car.carName}</Text>
                <Text style={styles.carStatusState}>
                  {car.hasCrossedFinish
                    ? '🏁 FINISHED!'
                    : car.hasStarted
                    ? 'Racing...'
                    : 'Waiting...'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Winner Announcement */}
      {winner && raceState === 'finished' && (
        <View style={styles.winnerOverlay}>
          <Text style={styles.winnerLabel}>WINNER!</Text>
          <Text style={styles.winnerName}>{winner.carName}</Text>
          <Text style={styles.winnerLane}>Lane {winner.lane}</Text>
        </View>
      )}

      {/* Bottom Controls */}
      {raceState === 'ready' && (
        <View style={styles.bottomBar}>
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              Position cars at the start line, then press Start
            </Text>
          </View>

          <TouchableOpacity style={styles.startButton} onPress={startCountdown}>
            <Text style={styles.startButtonText}>START RACE</Text>
          </TouchableOpacity>
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
    backgroundColor: '#000',
  },
  errorText: {
    color: '#ff6b35',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  startLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#4ecdc4',
  },
  finishLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.5)',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#ff6b35',
  },
  checkeredPattern: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  laneLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  carIndicator: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  carIndicatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modeContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeText: {
    color: '#ff6b35',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fpsContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  fpsText: {
    color: '#4ecdc4',
    fontSize: 14,
    fontWeight: 'bold',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#fff',
  },
  raceStatus: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 15,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff0000',
    marginRight: 10,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  carStatusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  carStatus: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  carStatusName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  carStatusState: {
    fontSize: 10,
    color: '#888',
  },
  winnerOverlay: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 40,
    paddingVertical: 30,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffd700',
  },
  winnerLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 10,
  },
  winnerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  winnerLane: {
    fontSize: 16,
    color: '#888',
    marginTop: 5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 20,
    maxWidth: '80%',
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 50,
    paddingVertical: 18,
    borderRadius: 30,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
});
