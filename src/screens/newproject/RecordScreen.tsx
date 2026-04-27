import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { colors, spacing, typography } from '@/theme';

type RecordNavProp = NativeStackNavigationProp<RootStackParamList, 'Record'>;
type RecordRouteProp = RouteProp<RootStackParamList, 'Record'>;

const RecordScreen: React.FC = () => {
  const navigation = useNavigation<RecordNavProp>();
  const route = useRoute<RecordRouteProp>();
  const { projectId } = route.params;

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
        <Text style={styles.headerTitle}>Record</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Placeholder content */}
      <View style={styles.content}>
        <Text style={styles.placeholderIcon}>🎥</Text>
        <Text style={styles.placeholderTitle}>Recording screen</Text>
        <Text style={styles.placeholderBody}>Coming in Phase 3</Text>
        <View style={styles.projectIdBadge}>
          <Text style={styles.projectIdText}>Project: {projectId}</Text>
        </View>
      </View>

      {/* Mock CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Review', { projectId })}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Complete Recording →</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  placeholderIcon: {
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  placeholderTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  placeholderBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  projectIdBadge: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  projectIdText: {
    ...typography.caption,
    fontFamily: 'monospace',
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
});

export default RecordScreen;
