import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { colors, spacing, typography } from '@/theme';

type ExportNavProp = NativeStackNavigationProp<RootStackParamList, 'Export'>;
type ExportRouteProp = RouteProp<RootStackParamList, 'Export'>;

const ExportScreen: React.FC = () => {
  const navigation = useNavigation<ExportNavProp>();
  const route = useRoute<ExportRouteProp>();
  const { projectId } = route.params;

  const handleDone = () => {
    // Navigate all the way back to Home
    navigation.navigate('Home');
  };

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
        <Text style={styles.headerTitle}>Export</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Placeholder content */}
      <View style={styles.content}>
        <Text style={styles.placeholderIcon}>📤</Text>
        <Text style={styles.placeholderTitle}>Export</Text>
        <Text style={styles.placeholderBody}>Coming in Phase 5</Text>
        <View style={styles.projectIdBadge}>
          <Text style={styles.projectIdText}>Project: {projectId}</Text>
        </View>
      </View>

      {/* Mock CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleDone}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Done ✓</Text>
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
    backgroundColor: colors.success,
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

export default ExportScreen;
