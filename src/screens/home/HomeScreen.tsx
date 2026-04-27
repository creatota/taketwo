import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { useUserStore } from '@/store/userStore';
import { colors, spacing, typography } from '@/theme';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type ProjectStatus = 'exported' | 'reviewing' | 'recording' | 'draft';

interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  updated_at: string;
}

const MOCK_PROJECTS: Project[] = [
  { id: '1', title: 'Product demo walkthrough', status: 'exported', updated_at: '2 hours ago' },
  { id: '2', title: 'Team intro video', status: 'reviewing', updated_at: 'Yesterday' },
  { id: '3', title: 'Weekly update #12', status: 'draft', updated_at: '3 days ago' },
];

const STATUS_COLORS: Record<ProjectStatus, string> = {
  exported: colors.success,
  reviewing: colors.warning,
  recording: colors.accent,
  draft: colors.textMuted,
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  exported: 'Exported',
  reviewing: 'Reviewing',
  recording: 'Recording',
  draft: 'Draft',
};

const TIER_COLORS: Record<string, string> = {
  free: colors.textMuted,
  clean: colors.accent,
  polished: colors.primary,
  auto: colors.success,
};

const ProjectCard: React.FC<{ project: Project; onPress: () => void }> = ({
  project,
  onPress,
}) => {
  const statusColor = STATUS_COLORS[project.status] ?? colors.textMuted;
  const statusLabel = STATUS_LABELS[project.status] ?? project.status;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {project.title}
        </Text>
        <View style={[styles.statusChip, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>{project.updated_at}</Text>
    </TouchableOpacity>
  );
};

const EmptyState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyIcon}>🎬</Text>
    <Text style={styles.emptyTitle}>No projects yet</Text>
    <Text style={styles.emptyBody}>Tap + to create your first video project.</Text>
    <TouchableOpacity style={styles.emptyButton} onPress={onCreate}>
      <Text style={styles.emptyButtonText}>Create project</Text>
    </TouchableOpacity>
  </View>
);

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavProp>();
  const tier = useUserStore((s) => s.tier);
  const [refreshing, setRefreshing] = useState(false);
  const [projects] = useState<Project[]>(MOCK_PROJECTS);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleProjectPress = (project: Project) => {
    switch (project.status) {
      case 'draft':
        navigation.navigate('Script', { projectId: project.id });
        break;
      case 'recording':
        navigation.navigate('Record', { projectId: project.id });
        break;
      case 'reviewing':
        navigation.navigate('Review', { projectId: project.id });
        break;
      case 'exported':
        navigation.navigate('Export', { projectId: project.id });
        break;
    }
  };

  const handleNewProject = () => {
    navigation.navigate('Script', {});
  };

  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const tierColor = TIER_COLORS[tier] ?? colors.textMuted;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>TakeTwo</Text>
          <View style={[styles.tierBadge, { backgroundColor: tierColor + '22' }]}>
            <Text style={[styles.tierBadgeText, { color: tierColor }]}>{tierLabel}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Project list */}
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          projects.length === 0 && styles.listContentEmpty,
        ]}
        renderItem={({ item }) => (
          <ProjectCard project={item} onPress={() => handleProjectPress(item)} />
        )}
        ListEmptyComponent={<EmptyState onCreate={handleNewProject} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewProject}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.h2,
    letterSpacing: -0.5,
  },
  tierBadge: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  settingsButton: {
    padding: spacing.xs,
  },
  settingsIcon: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
  },
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardMeta: {
    ...typography.caption,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: colors.textPrimary,
    lineHeight: 36,
  },
});

export default HomeScreen;
