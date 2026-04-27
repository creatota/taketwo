import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { useUserStore } from '@/store/userStore';
import { colors, spacing, typography } from '@/theme';

type PaywallNavProp = NativeStackNavigationProp<RootStackParamList, 'Paywall'>;
type PaywallRouteProp = RouteProp<RootStackParamList, 'Paywall'>;

type BillingCycle = 'monthly' | 'annual';
type TierKey = 'clean' | 'polished' | 'auto';

interface TierConfig {
  key: TierKey;
  name: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  badge?: string;
  bullets: string[];
}

const TIERS: TierConfig[] = [
  {
    key: 'clean',
    name: 'Clean',
    monthlyPrice: 8,
    annualMonthlyPrice: 6.67,
    bullets: [
      'Filler & pause detection',
      'Multi-take teleprompter',
      'Rules-based best take',
      'Basic export',
    ],
  },
  {
    key: 'polished',
    name: 'Polished',
    monthlyPrice: 15,
    annualMonthlyPrice: 12.5,
    badge: 'Most Popular',
    bullets: [
      'Everything in Clean',
      'Eye contact scoring',
      'Body language & tone scoring',
      'Background music',
      'Cloud backup',
    ],
  },
  {
    key: 'auto',
    name: 'Auto',
    monthlyPrice: 25,
    annualMonthlyPrice: 20.83,
    bullets: [
      'Everything in Polished',
      'AI best-take selection',
      'Auto-captions',
      'One-tap export',
    ],
  },
];

const PaywallScreen: React.FC = () => {
  const navigation = useNavigation<PaywallNavProp>();
  const route = useRoute<PaywallRouteProp>();
  const setTier = useUserStore((s) => s.setTier);
  const setUser = useUserStore((s) => s.setUser);

  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [selectedTier, setSelectedTier] = useState<TierKey>('polished');

  const handleStartTrial = () => {
    // DEMO: instantly apply the selected tier — no real payment
    setTier(selectedTier);
    const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setUser({ trial_ends_at: trialEnds });
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Home');
    }
  };

  const handleRestorePurchases = () => {
    // DEMO: no-op
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose your plan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Billing toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[styles.billingTab, billing === 'monthly' && styles.billingTabActive]}
            onPress={() => setBilling('monthly')}
          >
            <Text
              style={[
                styles.billingTabText,
                billing === 'monthly' && styles.billingTabTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingTab, billing === 'annual' && styles.billingTabActive]}
            onPress={() => setBilling('annual')}
          >
            <Text
              style={[
                styles.billingTabText,
                billing === 'annual' && styles.billingTabTextActive,
              ]}
            >
              Annual
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>2 months free</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tier cards */}
        {TIERS.map((tier) => {
          const isSelected = selectedTier === tier.key;
          const price =
            billing === 'monthly' ? tier.monthlyPrice : tier.annualMonthlyPrice;
          const priceStr =
            billing === 'annual'
              ? `$${price.toFixed(2)}/mo`
              : `$${price}/mo`;

          return (
            <TouchableOpacity
              key={tier.key}
              style={[styles.tierCard, isSelected && styles.tierCardSelected]}
              onPress={() => setSelectedTier(tier.key)}
              activeOpacity={0.8}
            >
              {/* Selected indicator */}
              <View style={styles.tierCardTopRow}>
                <View style={styles.tierCardLeft}>
                  {tier.badge && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>{tier.badge}</Text>
                    </View>
                  )}
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <Text style={styles.tierPrice}>{priceStr}</Text>
                </View>
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </View>

              <View style={styles.bulletList}>
                {tier.bullets.map((bullet, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bulletCheck}>✓</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleStartTrial}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaButtonText}>Start 7-day free trial</Text>
        </TouchableOpacity>
        <Text style={styles.ctaSubtext}>Cancel anytime. No charge during trial.</Text>
        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>DEMO MODE — no real payment is processed</Text>
        </View>

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
        >
          <Text style={styles.restoreText}>Restore purchases</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  headerTitle: {
    ...typography.h3,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.lg,
  },
  billingTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: 10,
    gap: spacing.xs,
  },
  billingTabActive: {
    backgroundColor: colors.surfaceElevated,
  },
  billingTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  billingTabTextActive: {
    color: colors.textPrimary,
  },
  saveBadge: {
    backgroundColor: colors.success + '33',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  saveBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  tierCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  tierCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  tierCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  tierCardLeft: {
    flex: 1,
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
    fontSize: 15,
    fontWeight: '500',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  bulletList: {
    gap: spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletCheck: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
    width: 16,
  },
  bulletText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaButtonText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  ctaSubtext: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
    color: colors.textMuted,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  restoreText: {
    color: colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  demoBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoBadgeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default PaywallScreen;
