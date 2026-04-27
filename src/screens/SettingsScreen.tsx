import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import supabase from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { colors, spacing, typography } from '@/theme';

type SettingsNavProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const Row: React.FC<{
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  rightIcon?: string;
}> = ({ label, value, onPress, destructive, rightIcon }) => (
  <TouchableOpacity
    style={styles.row}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>
      {label}
    </Text>
    <View style={styles.rowRight}>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress && <Text style={styles.rowChevron}>{rightIcon ?? '›'}</Text>}
    </View>
  </TouchableOpacity>
);

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsNavProp>();
  const { email, tier, clearUser } = useUserStore((s) => ({
    email: s.email,
    tier: s.tier,
    clearUser: s.clearUser,
  }));

  const handleSignOut = async () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
          } catch {
            // Best effort
          }
          clearUser();
          navigation.navigate('Auth');
        },
      },
    ]);
  };

  const handleUpgrade = () => {
    navigation.navigate('Paywall');
  };

  const handleLegalStub = (name: string) => {
    Alert.alert(name, `${name} content coming soon.`);
  };

  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <Row label="Email" value={email ?? '—'} />
          <View style={styles.rowDivider} />
          <Row
            label="Sign out"
            onPress={handleSignOut}
            destructive
            rightIcon=""
          />
        </View>

        {/* Subscription */}
        <SectionHeader title="Subscription" />
        <View style={styles.section}>
          <Row label="Current plan" value={tierLabel} />
          <View style={styles.rowDivider} />
          <Row label="Upgrade plan" onPress={handleUpgrade} />
        </View>

        {/* Recording Preferences */}
        <SectionHeader title="Recording preferences" />
        <View style={styles.section}>
          <Row label="Default takes per sentence" value="3" />
          <View style={styles.rowDivider} />
          <Row label="Aspect ratio" value="9:16 (Portrait)" />
        </View>

        {/* Legal */}
        <SectionHeader title="Legal" />
        <View style={styles.section}>
          <Row label="Terms of Service" onPress={() => handleLegalStub('Terms of Service')} />
          <View style={styles.rowDivider} />
          <Row label="Privacy Policy" onPress={() => handleLegalStub('Privacy Policy')} />
          <View style={styles.rowDivider} />
          <Row label="Support" onPress={() => handleLegalStub('Support')} />
        </View>

        <View style={styles.versionRow}>
          <Text style={styles.versionText}>TakeTwo v1.0.0</Text>
        </View>
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
  backButton: {
    color: colors.accent,
    fontSize: 16,
  },
  headerTitle: {
    ...typography.h3,
  },
  headerSpacer: {
    width: 60,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  section: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    minHeight: 52,
  },
  rowLabel: {
    ...typography.body,
    flex: 1,
  },
  rowLabelDestructive: {
    color: colors.error,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowValue: {
    ...typography.body,
    color: colors.textSecondary,
  },
  rowChevron: {
    fontSize: 20,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
  versionRow: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  versionText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

export default SettingsScreen;
