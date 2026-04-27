import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';

import SplashScreen from '@/screens/SplashScreen';
import AuthScreen from '@/screens/auth/AuthScreen';
import OnboardingScreen from '@/screens/onboarding/OnboardingScreen';
import HomeScreen from '@/screens/home/HomeScreen';
import ScriptScreen from '@/screens/newproject/ScriptScreen';
import RecordScreen from '@/screens/newproject/RecordScreen';
import ReviewScreen from '@/screens/newproject/ReviewScreen';
import ExportScreen from '@/screens/newproject/ExportScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import PaywallScreen from '@/screens/PaywallScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0A0A0A',
    card: '#0A0A0A',
    text: '#FFFFFF',
    border: '#2A2A2A',
    primary: '#FF3B5C',
    notification: '#FF3B5C',
  },
};

const Navigator: React.FC = () => {
  return (
    <NavigationContainer theme={customDarkTheme}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        {/* "Main" maps directly to HomeScreen for Phase 1 */}
        <Stack.Screen name="Main" component={HomeScreen} />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Script"
          component={ScriptScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Record"
          component={RecordScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Review"
          component={ReviewScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Export"
          component={ExportScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigator;
