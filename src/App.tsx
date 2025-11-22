import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {StatusBar} from 'react-native';

import type {RootStackParamList} from './types';
import HomeScreen from './screens/HomeScreen';
import CalibrationScreen from './screens/CalibrationScreen';
import RecordingScreen from './screens/RecordingScreen';
import ResultsScreen from './screens/ResultsScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';

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
          options={{title: 'Calibration'}}
        />
        <Stack.Screen
          name="Recording"
          component={RecordingScreen}
          options={{title: 'Record Race', headerShown: false}}
        />
        <Stack.Screen
          name="Results"
          component={ResultsScreen}
          options={{title: 'Race Results'}}
        />
        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{title: 'Leaderboard'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
