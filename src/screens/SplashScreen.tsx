import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import supabase from '@/lib/supabase';
import { colors, typography, spacing } from '@/theme';

type SplashNavProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashNavProp>();

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigation.replace('Main');
        } else {
          navigation.replace('Auth');
        }
      } catch {
        navigation.replace('Auth');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TakeTwo</Text>
      <Text style={styles.subtitle}>Record once. Stress none.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h1,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 17,
  },
});

export default SplashScreen;
