import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import supabase from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { colors, spacing, typography } from '@/theme';

type OnboardingNavProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const TOTAL_SCREENS = 4;

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingNavProp>();
  const setUser = useUserStore((s) => s.setUser);
  const [index, setIndex] = useState(0);

  const markOnboardingComplete = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', data.user.id);
        setUser({ onboarding_completed: true });
      }
    } catch {
      // Non-blocking
    }
  };

  const handleNext = async () => {
    if (index < TOTAL_SCREENS - 1) {
      setIndex(index + 1);
    } else {
      await markOnboardingComplete();
      navigation.replace('Main');
    }
  };

  const handleSkip = () => {
    navigation.replace('Main');
  };

  const handleGrantPermissions = () => {
    Alert.alert('Permissions', 'Camera & microphone permission request coming soon.');
  };

  const handleStartTrial = async () => {
    await markOnboardingComplete();
    navigation.navigate('Paywall');
  };

  const handleMaybeLater = async () => {
    await markOnboardingComplete();
    navigation.replace('Main');
  };

  const renderScreen = () => {
    switch (index) {
      case 0:
        return (
          <View style={styles.screenContent}>
            <Text style={styles.headline}>Record once,{'\n'}stress none.</Text>
            <Text style={styles.body}>
              AI picks your best take from every sentence you record.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 1:
        return (
          <View style={styles.screenContent}>
            <Text style={styles.headline}>How it works</Text>
            <View style={styles.stepsList}>
              <View style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <Text style={styles.stepText}>Write your script</Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <Text style={styles.stepText}>Record 2–4 takes per sentence</Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>3</Text>
                </View>
                <Text style={styles.stepText}>AI picks the best take — you export</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View style={styles.screenContent}>
            <Text style={styles.headline}>Allow camera{'\n'}& microphone</Text>
            <Text style={styles.body}>
              TakeTwo needs camera access to record your takes and microphone access
              to capture clear audio. Your recordings are private and never shared
              without your permission.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleGrantPermissions}>
              <Text style={styles.primaryButtonText}>Grant permissions</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNext} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        );

      case 3:
        return (
          <View style={styles.screenContent}>
            <Text style={styles.headline}>Choose your plan</Text>
            <Text style={[styles.body, { marginBottom: spacing.lg }]}>
              Start with a 7-day free trial. Cancel anytime.
            </Text>

            <View style={styles.tierCard}>
              <Text style={styles.tierName}>Clean</Text>
              <Text style={styles.tierPrice}>$8 / month</Text>
              <Text style={styles.tierBullet}>• Filler & pause detection</Text>
              <Text style={styles.tierBullet}>• Multi-take teleprompter</Text>
              <Text style={styles.tierBullet}>• Rules-based best take</Text>
            </View>

            <View style={[styles.tierCard, styles.tierCardHighlight]}>
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>Most Popular</Text>
              </View>
              <Text style={styles.tierName}>Polished</Text>
              <Text style={styles.tierPrice}>$15 / month</Text>
              <Text style={styles.tierBullet}>• Everything in Clean</Text>
              <Text style={styles.tierBullet}>• Eye contact scoring</Text>
              <Text style={styles.tierBullet}>• Body language & tone scoring</Text>
              <Text style={styles.tierBullet}>• Cloud backup</Text>
            </View>

            <View style={styles.tierCard}>
              <Text style={styles.tierName}>Auto</Text>
              <Text style={styles.tierPrice}>$25 / month</Text>
              <Text style={styles.tierBullet}>• Everything in Polished</Text>
              <Text style={styles.tierBullet}>• AI best-take selection</Text>
              <Text style={styles.tierBullet}>• One-tap export</Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleStartTrial}>
              <Text style={styles.primaryButtonText}>Start 7-day free trial</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleMaybeLater} style={styles.skipButton}>
              <Text style={styles.skipText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      {/* Skip button (screens 1+) */}
      {index > 0 && index < 3 && (
        <TouchableOpacity style={styles.topSkip} onPress={handleSkip}>
          <Text style={styles.topSkipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {renderScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xxl,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  topSkip: {
    position: 'absolute',
    top: spacing.xxl + spacing.lg,
    right: spacing.lg,
  },
  topSkipText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  screenContent: {
    flex: 1,
    justifyContent: 'center',
  },
  headline: {
    ...typography.h1,
    marginBottom: spacing.md,
    lineHeight: 40,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  stepsList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  stepText: {
    ...typography.body,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  tierCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierCardHighlight: {
    borderColor: colors.primary,
  },
  popularBadge: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  popularBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  tierName: {
    ...typography.h3,
    marginBottom: 2,
  },
  tierPrice: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  tierBullet: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
});

export default OnboardingScreen;
