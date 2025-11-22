import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {StatusBar} from 'react-native';

import type {RootStackParamList} from './types';
import HomeScreen from './screens/HomeScreen';
import CalibrationScreen from './screens/CalibrationScreen';
import RaceSetupScreen from './screens/RaceSetupScreen';
import RecordingScreen from './screens/RecordingScreen';
import ResultsScreen from './screens/ResultsScreen';
import WinnerScreen from './screens/WinnerScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import CarGarageScreen from './screens/CarGarageScreen';
import TournamentScreen from './screens/TournamentScreen';
import TournamentBracketScreen from './screens/TournamentBracketScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#0f0f23',
          },
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{title: 'Hot Wheels Speed Camera'}}
        />
        <Stack.Screen
          name="Calibration"
          component={CalibrationScreen}
          options={{title: 'Track Setup'}}
        />
        <Stack.Screen
          name="RaceSetup"
          component={RaceSetupScreen}
          options={{title: 'Race Setup'}}
        />
        <Stack.Screen
          name="Recording"
          component={RecordingScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Results"
          component={ResultsScreen}
          options={{title: 'Race Results'}}
        />
        <Stack.Screen
          name="Winner"
          component={WinnerScreen}
          options={{title: 'Race Complete', headerBackVisible: false}}
        />
        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{title: 'Leaderboard'}}
        />
        <Stack.Screen
          name="CarGarage"
          component={CarGarageScreen}
          options={{title: 'My Garage'}}
        />
        <Stack.Screen
          name="Tournament"
          component={TournamentScreen}
          options={{title: 'Tournaments'}}
        />
        <Stack.Screen
          name="TournamentBracket"
          component={TournamentBracketScreen}
          options={{title: 'Bracket'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
