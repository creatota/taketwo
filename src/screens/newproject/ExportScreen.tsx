import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { Sentence, Take } from '@/types/database';
import supabase from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { hasFeature } from '@/config/features';
import { stitchTakes, AspectRatio } from '@/utils/videoStitch';
import { colors, spacing, typography } from '@/theme';

type ExportNavProp = NativeStackNavigationProp<RootStackParamList, 'Export'>;
type ExportRouteProp = RouteProp<RootStackParamList, 'Export'>;

type ExportPhase = 'idle' | 'exporting' | 'done';

const ASPECT_RATIOS: { value: AspectRatio; label: string; sublabel: string }[] = [
  { value: '9:16', label: '9:16', sublabel: 'Reels / TikTok / Shorts' },
  { value: '1:1', label: '1:1', sublabel: 'Feed' },
  { value: '16:9', label: '16:9', sublabel: 'YouTube' },
];

const EXPORTS_DIR = `${FileSystem.documentDirectory}exports/`;

const ExportScreen: React.FC = () => {
  const navigation = useNavigation<ExportNavProp>();
  const route = useRoute<ExportRouteProp>();
  const { projectId } = route.params;
  const tier = useUserStore((s) => s.tier);

  const [loading, setLoading] = useState(true);
  const [selectedTakes, setSelectedTakes] = useState<Take[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [phase, setPhase] = useState<ExportPhase>('idle');
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const canCaptions = hasFeature('auto_captions', tier);
  const canMusic = hasFeature('export_background_music', tier);

  // ─── Load selected takes ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: sentences } = await supabase
          .from('sentences')
          .select('*')
          .eq('project_id', projectId)
          .order('order_index', { ascending: true });

        if (!sentences?.length) throw new Error('No sentences');

        const takeIds = (sentences as Sentence[])
          .map((s) => s.selected_take_id)
          .filter(Boolean) as string[];

        if (takeIds.length === 0) throw new Error('No takes selected');

        const { data: takes } = await supabase
          .from('takes')
          .select('*')
          .in('id', takeIds);

        // Restore original sentence order
        const takesById: Record<string, Take> = {};
        for (const t of (takes as Take[]) ?? []) takesById[t.id] = t;

        const ordered = (sentences as Sentence[])
          .map((s) => (s.selected_take_id ? takesById[s.selected_take_id] : null))
          .filter(Boolean) as Take[];

        setSelectedTakes(ordered);
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Could not load takes.', [
          { text: 'Go back', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation, projectId]);

  // ─── Export ──────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (selectedTakes.length === 0) return;
    setPhase('exporting');

    try {
      await FileSystem.makeDirectoryAsync(EXPORTS_DIR, { intermediates: true });
      const outPath = `${EXPORTS_DIR}${projectId}_${Date.now()}.mp4`;

      await stitchTakes(
        selectedTakes.map((t) => ({
          localPath: t.local_file_path,
          durationMs: t.duration_ms,
          pauseSegments: t.pause_segments ?? [],
        })),
        outPath,
        aspectRatio,
      );

      // TODO Phase 8: burn captions via FFmpeg subtitles filter if captionsEnabled

      // Record export in Supabase
      const totalDuration = selectedTakes.reduce((sum, t) => sum + t.duration_ms, 0);
      await supabase.from('exports').insert({
        project_id: projectId,
        output_path: outPath,
        format: aspectRatio,
        duration_ms: totalDuration,
      });

      await supabase
        .from('projects')
        .update({ status: 'exported', updated_at: new Date().toISOString() })
        .eq('id', projectId);

      setOutputPath(outPath);
      setPhase('done');
    } catch (err) {
      setPhase('idle');
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Unknown error');
    }
  }, [aspectRatio, projectId, selectedTakes]);

  // ─── Save to camera roll ─────────────────────────────────────────────────────
  const handleSaveToCameraRoll = useCallback(async () => {
    if (!outputPath) return;

    if (!mediaPermission?.granted) {
      const { granted } = await requestMediaPermission();
      if (!granted) {
        Alert.alert('Permission denied', 'Allow photo library access in Settings to save the video.');
        return;
      }
    }
    try {
      await MediaLibrary.saveToLibraryAsync(outputPath);
      Alert.alert('Saved!', 'Video saved to your camera roll.');
    } catch {
      Alert.alert('Error', 'Could not save to camera roll.');
    }
  }, [mediaPermission, outputPath, requestMediaPermission]);

  // ─── Share ───────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!outputPath) return;
    try {
      await Share.share({ url: outputPath, title: 'My TakeTwo video' });
    } catch {
      // User cancelled share sheet
    }
  }, [outputPath]);

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={phase === 'exporting'}
        >
          <Text style={[styles.backBtn, phase === 'exporting' && styles.dimmed]}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Ready to export</Text>
          <Text style={styles.summaryBody}>
            {selectedTakes.length} take{selectedTakes.length !== 1 ? 's' : ''} · pauses removed · loudness normalised
          </Text>
        </View>

        {/* Aspect ratio */}
        <Text style={styles.sectionLabel}>Format</Text>
        <View style={styles.aspectRow}>
          {ASPECT_RATIOS.map((ar) => (
            <TouchableOpacity
              key={ar.value}
              style={[styles.aspectCard, aspectRatio === ar.value && styles.aspectCardActive]}
              onPress={() => setAspectRatio(ar.value)}
              disabled={phase !== 'idle'}
            >
              <Text style={[styles.aspectLabel, aspectRatio === ar.value && styles.aspectLabelActive]}>
                {ar.label}
              </Text>
              <Text style={styles.aspectSub}>{ar.sublabel}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Captions toggle */}
        <Text style={styles.sectionLabel}>Captions</Text>
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => {
            if (!canCaptions) {
              navigation.navigate('Paywall', { featureKey: 'auto_captions' });
              return;
            }
            setCaptionsEnabled((v) => !v);
          }}
          disabled={phase !== 'idle'}
        >
          <View>
            <Text style={styles.toggleLabel}>Auto-captions</Text>
            <Text style={styles.toggleSub}>
              {canCaptions ? 'Word-level captions burned into the video' : 'Auto plan — upgrade to unlock'}
            </Text>
          </View>
          <View style={[styles.toggleSwitch, captionsEnabled && canCaptions && styles.toggleSwitchOn]}>
            <View style={styles.toggleKnob} />
          </View>
        </TouchableOpacity>

        {/* Background music */}
        <Text style={styles.sectionLabel}>Background music</Text>
        <TouchableOpacity
          style={[styles.toggleRow, styles.lockedRow]}
          onPress={() => !canMusic && navigation.navigate('Paywall', { featureKey: 'export_background_music' })}
          disabled={phase !== 'idle'}
        >
          <View>
            <Text style={styles.toggleLabel}>Add music</Text>
            <Text style={styles.toggleSub}>
              {canMusic ? 'Royalty-free library (coming soon)' : 'Polished plan — upgrade to unlock'}
            </Text>
          </View>
          {!canMusic && <Text style={styles.lockIcon}>🔒</Text>}
        </TouchableOpacity>

        {/* Done state actions */}
        {phase === 'done' && (
          <View style={styles.doneCard}>
            <Text style={styles.doneTitle}>Export complete!</Text>
            <TouchableOpacity style={styles.doneAction} onPress={handleSaveToCameraRoll}>
              <Text style={styles.doneActionText}>⬇ Save to Camera Roll</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneAction} onPress={handleShare}>
              <Text style={styles.doneActionText}>↗ Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doneHome}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.doneHomeText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Export / processing CTA */}
      {phase !== 'done' && (
        <View style={styles.bottomBar}>
          {phase === 'exporting' ? (
            <View style={styles.exportingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.exportingText}>
                Stitching takes, removing pauses, normalising audio…
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExport}
              activeOpacity={0.8}
            >
              <Text style={styles.exportBtnText}>Export Video</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerFill: {
    flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.xxl,
    paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.accent, fontSize: 16 },
  headerTitle: { ...typography.h3 },
  headerSpacer: { width: 60 },
  dimmed: { opacity: 0.4 },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },

  summaryCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
  },
  summaryTitle: { ...typography.h3, marginBottom: 4 },
  summaryBody: { ...typography.caption },

  sectionLabel: {
    ...typography.caption, fontWeight: '600', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.lg,
  },

  aspectRow: { flexDirection: 'row', gap: spacing.sm },
  aspectCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 2, borderColor: colors.border, padding: spacing.md, alignItems: 'center',
  },
  aspectCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  aspectLabel: { fontSize: 18, fontWeight: '800', color: colors.textSecondary, marginBottom: 2 },
  aspectLabelActive: { color: colors.primary },
  aspectSub: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm,
  },
  lockedRow: { opacity: 0.7 },
  toggleLabel: { ...typography.body, fontWeight: '600' },
  toggleSub: { ...typography.caption, marginTop: 2 },
  toggleSwitch: {
    width: 44, height: 26, borderRadius: 13, backgroundColor: colors.border,
    justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleSwitchOn: { backgroundColor: colors.success },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  lockIcon: { fontSize: 16 },

  doneCard: {
    backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1,
    borderColor: colors.success, padding: spacing.lg, marginTop: spacing.lg, alignItems: 'center',
  },
  doneTitle: { ...typography.h3, color: colors.success, marginBottom: spacing.lg },
  doneAction: {
    width: '100%', backgroundColor: colors.surfaceElevated, borderRadius: 12,
    paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  doneActionText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  doneHome: { paddingVertical: spacing.md },
  doneHomeText: { color: colors.textSecondary, fontSize: 15 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.background, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, paddingBottom: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  exportBtn: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: spacing.md, alignItems: 'center',
  },
  exportBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  exportingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, justifyContent: 'center' },
  exportingText: { color: colors.textSecondary, fontSize: 14, flex: 1 },
});

export default ExportScreen;
