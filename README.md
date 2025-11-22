# Hot Wheels Speed Camera

A React Native app for measuring Hot Wheels car speed using your phone's camera. Features multi-car racing, winner detection, and tournament brackets!

## Features

### Race Modes
- **Time Trial** - Single car speed measurement. Test your car's top speed!
- **Head-to-Head** - Race 2-4 cars side by side. First across the finish line wins!
- **Tournament** - Bracket-style competition with Best-of-1/3/5 format

### Core Features
- **Finish Line Detection** - Configurable start and finish line positions
- **Multi-Lane Support** - Up to 4 lanes for simultaneous racing
- **Winner Detection** - Automatic winner determination with podium display
- **Car Garage** - Store and track stats for all your Hot Wheels cars
- **Leaderboard** - Track fastest speeds across all races
- **Scale Speed** - Shows equivalent full-scale speed (1:64 ratio)

### Technical
- 1080p @ 60fps video capture
- Color-based car tracking
- Local data storage using AsyncStorage
- Haptic feedback for countdown and winner

## Requirements

- Android device (tested on Samsung A73 with Snapdragon 778G)
- Node.js 18+
- React Native development environment

## Setup

```bash
# Install dependencies
npm install

# Run on Android
npm run android
```

## How to Use

### 1. Add Cars to Garage
- Go to Garage from home screen
- Add your Hot Wheels cars with names and colors
- Track win/loss records and best speeds

### 2. Calibrate Track
- Place physical markers on your Hot Wheels track
- Enter the distance between start and finish (e.g., 50cm)
- Drag on-screen markers to match your track
- For head-to-head, configure number of lanes

### 3. Race!
- **Time Trial**: Select one car, record its run
- **Head-to-Head**: Select cars for each lane, press START RACE
- **Tournament**: Create bracket, race through rounds

### 4. View Results
- Winner announcement with celebration
- Podium display (1st, 2nd, 3rd place)
- Speed stats: actual km/h and scale speed
- Win margin in milliseconds
- Share results with friends

## Project Structure

```
src/
├── App.tsx                      # Navigation setup
├── screens/
│   ├── HomeScreen.tsx           # Mode selection & stats
│   ├── CalibrationScreen.tsx    # Track setup with finish line
│   ├── RaceSetupScreen.tsx      # Car selection per lane
│   ├── RecordingScreen.tsx      # Race view with tracking
│   ├── WinnerScreen.tsx         # Podium & results
│   ├── ResultsScreen.tsx        # Individual race stats
│   ├── LeaderboardScreen.tsx    # Speed rankings
│   ├── CarGarageScreen.tsx      # Car management
│   ├── TournamentScreen.tsx     # Tournament list & creation
│   └── TournamentBracketScreen.tsx # Bracket view
├── services/
│   └── database.ts              # AsyncStorage operations
├── utils/
│   └── speedCalculator.ts       # Speed & color detection
└── types/
    └── index.ts                 # TypeScript interfaces
```

## Speed Calculation

```
time (s) = frames_between_markers / fps
speed (m/s) = distance (m) / time (s)
speed (km/h) = speed (m/s) × 3.6
scale_speed = actual_speed × 64  // 1:64 Hot Wheels scale
```

## Winner Determination

In head-to-head mode, the winner is determined by:
1. First car to cross the finish line
2. Win margin calculated in milliseconds
3. DNF (Did Not Finish) for cars that don't complete

## Data Storage

All data is stored locally:
- **Cars**: Name, color, race statistics
- **Race Results**: Times, speeds, winner, positions
- **Tournaments**: Brackets, match results, champions
- **Calibration**: Track setup for consistent measurements

## Tech Stack

- React Native 0.79
- react-native-vision-camera v4
- @react-navigation/native v7
- AsyncStorage for persistence
- TypeScript

## License

MIT
