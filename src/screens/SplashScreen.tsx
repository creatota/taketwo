import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { useUserStore } from '@/store/userStore';
import { colors, typography, spacing } from '@/theme';

type SplashNavProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashNavProp>();
  const setUser = useUserStore((s) => s.setUser);

  useEffect(() => {
    const timer = setTimeout(() => {
      // DEMO: skip auth and go straight to Home with a demo user
      setUser({ id: 'demo-user', email: 'demo@taketwo.app', tier: 'polished' });
      navigation.replace('Home');
    }, 1500);
    return () => clearTimeout(timer);
  }, [navigation, setUser]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TakeTwo</Text>
      <Text style={styles.subtitle}>Record once. Stress none.</Text>
      <View style={styles.demoBadge}>
        <Text style={styles.demoText}>DEMO</Text>
      </View>
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
  demoBadge: {
    position: 'absolute',
    bottom: 48,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
});

export default SplashScreen;
