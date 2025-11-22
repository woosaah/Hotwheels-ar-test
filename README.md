# Hot Wheels Speed Camera

A React Native app for measuring Hot Wheels car speed using your phone's camera.

## Features

- **Camera-based speed measurement** - Record your Hot Wheels cars racing through markers
- **Color tracking** - Detects cars based on their primary color
- **Real speed & scale speed** - Shows actual speed and equivalent full-scale speed (1:64 ratio)
- **Calibration system** - Set up distance markers for accurate measurements
- **Leaderboard** - Track your fastest cars across sessions
- **Local storage** - All data stored on device using AsyncStorage

## Requirements

- Android device (tested on Samsung A73)
- Node.js 18+
- React Native development environment

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Install pods (if building for iOS):**
```bash
cd ios && pod install && cd ..
```

3. **Run on Android:**
```bash
npm run android
```

## How to Use

### 1. Calibration
- Place two markers on your Hot Wheels track at a known distance (e.g., 50cm)
- Open the app and go to Calibration
- Enter the exact distance between markers
- Position the on-screen markers to match your physical markers
- Select your car's primary color

### 2. Recording
- Position your phone so both markers are visible
- Press Record and let your car race through the markers
- Press Stop when the car has passed through

### 3. Results
- View actual speed in km/h
- View scale speed (what the speed would be at 1:64 scale)
- Share results with friends
- Results are automatically saved to the leaderboard

## Technical Details

- **Framework:** React Native 0.79
- **Camera:** react-native-vision-camera v4
- **Video:** 1080p @ 60fps
- **Tracking:** Color-based blob detection
- **Storage:** AsyncStorage
- **Scale factor:** 64x (1:64 Hot Wheels scale)

## Speed Calculation

Speed is calculated using:
```
speed (m/s) = distance (m) / time (s)
time (s) = frames / fps
scale_speed = actual_speed × 64
```

## Project Structure

```
src/
├── App.tsx              # Main app with navigation
├── screens/
│   ├── HomeScreen.tsx       # Home with stats and quick actions
│   ├── CalibrationScreen.tsx # Distance and color setup
│   ├── RecordingScreen.tsx   # Camera recording with markers
│   ├── ResultsScreen.tsx     # Speed results display
│   └── LeaderboardScreen.tsx # Race history and rankings
├── services/
│   └── database.ts      # AsyncStorage operations
├── utils/
│   └── speedCalculator.ts # Speed and color detection logic
└── types/
    └── index.ts         # TypeScript interfaces
```

## Future Improvements

- [ ] Real-time frame processor for live car tracking
- [ ] Video playback with tracking overlay
- [ ] Multiple car detection
- [ ] Export race videos with speed overlay
- [ ] Custom car profiles with photos
- [ ] Track templates for different Hot Wheels sets

## License

MIT
