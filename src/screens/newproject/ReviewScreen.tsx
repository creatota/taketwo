import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { Take } from '@/types/database';
import { useUserStore } from '@/store/userStore';
import { useDemoStore } from '@/store/demoStore';
import { stitchTakes } from '@/utils/videoStitch';
import { colors, spacing, typography } from '@/theme';

type ReviewNavProp = NativeStackNavigationProp<RootStackParamList, 'Review'>;
type ReviewRouteProp = RouteProp<RootStackParamList, 'Review'>;

interface SentenceReview {
  sentence: Sentence;
  takes: Take[];
  selectedTakeId: string | null;
  autoSelectedTakeId: string | null;
}

function pickBestTake(takes: Take[]): string | null {
  const valid = takes.filter((t) => !t.is_discarded);
  if (valid.length === 0) return null;
  return valid.reduce((best, t) =>
    (t.composite_score ?? -Infinity) > (best.composite_score ?? -Infinity) ? t : best,
  ).id;
}

function scoreLabel(take: Take): string {
  const issues: string[] = [];
  if (take.filler_count > 0)
    issues.push(`${take.filler_count} filler${take.filler_count !== 1 ? 's' : ''}`);
  if (take.pause_count > 0)
    issues.push(`${take.pause_count} pause${take.pause_count !== 1 ? 's' : ''}`);
  return issues.length === 0 ? '✓ Clean' : issues.join(', ');
}

function scoreColor(take: Take): string {
  if (take.filler_count === 0 && take.pause_count === 0) return colors.success;
  if ((take.filler_count ?? 0) + (take.pause_count ?? 0) <= 2) return colors.warning;
  return colors.error;
}

const PREVIEW_PATH = `${FileSystem.cacheDirectory}preview_stitch.mp4`;

const ReviewScreen: React.FC = () => {
  const navigation = useNavigation<ReviewNavProp>();
  const route = useRoute<ReviewRouteProp>();
  const { projectId } = route.params;
  const tier = useUserStore((s) => s.tier);

  const demoSentences = useDemoStore((s) => s.sentences);
  const demoTakes = useDemoStore((s) => s.takes);
  const demoSelectTake = useDemoStore((s) => s.selectTake);
  const demoSetDiscarded = useDemoStore((s) => s.setDiscarded);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SentenceReview[]>([]);
  const [stitching, setStitching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // ─── Load from demo store ────────────────────────────────────────────────────
  useEffect(() => {
    const takesBySentence: Record<string, Take[]> = {};
    for (const t of demoTakes) {
      if (!takesBySentence[t.sentence_id]) takesBySentence[t.sentence_id] = [];
      takesBySentence[t.sentence_id].push(t as unknown as Take);
    }
    const reviewRows: SentenceReview[] = demoSentences.map((s) => {
      const st = takesBySentence[s.id] ?? [];
      const autoId = pickBestTake(st);
      return {
        sentence: s as any,
        takes: st,
        selectedTakeId: s.selected_take_id ?? autoId,
        autoSelectedTakeId: autoId,
      };
    });
    setRows(reviewRows);
    setLoading(false);
  }, [demoSentences, demoTakes]);

  // ─── Select a take ───────────────────────────────────────────────────────────
  const selectTake = useCallback((sentenceId: string, takeId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.sentence.id === sentenceId ? { ...r, selectedTakeId: takeId } : r,
      ),
    );
  }, []);

  // ─── Discard / restore ──────────────────────────────────────────────────────
  const toggleDiscard = useCallback((take: Take) => {
    const nowDiscarded = !take.is_discarded;
    demoSetDiscarded(take.id, nowDiscarded);
    setRows((prev) =>
      prev.map((r) => {
        if (r.sentence.id !== take.sentence_id) return r;
        const updatedTakes = r.takes.map((t) =>
          t.id === take.id ? { ...t, is_discarded: nowDiscarded } : t,
        );
        const newAuto = pickBestTake(updatedTakes.filter((t) => !t.is_discarded));
        return {
          ...r,
          takes: updatedTakes,
          autoSelectedTakeId: newAuto,
          selectedTakeId:
            r.selectedTakeId === take.id && nowDiscarded ? newAuto : r.selectedTakeId,
        };
      }),
    );
  }, []);

  // ─── Preview stitch ──────────────────────────────────────────────────────────
  const handlePreview = useCallback(async () => {
    const selected = rows
      .map((r) => r.takes.find((t) => t.id === r.selectedTakeId))
      .filter(Boolean) as Take[];

    if (selected.length === 0) {
      Alert.alert('Nothing selected', 'Select at least one take to preview.');
      return;
    }
    setStitching(true);
    try {
      await stitchTakes(
        selected.map((t) => ({
          localPath: t.local_file_path,
          durationMs: t.duration_ms,
          pauseSegments: t.pause_segments ?? [],
        })),
        PREVIEW_PATH,
      );
      setPreviewUri(PREVIEW_PATH + `?ts=${Date.now()}`); // cache-bust
      setPreviewVisible(true);
    } catch (err) {
      Alert.alert('Preview failed', err instanceof Error ? err.message : 'Stitch error');
    } finally {
      setStitching(false);
    }
  }, [rows]);

  // ─── Save + continue ─────────────────────────────────────────────────────────
  const handleContinue = useCallback(() => {
    setSaving(true);
    rows.forEach((r) => {
      if (r.selectedTakeId) demoSelectTake(r.sentence.id, r.selectedTakeId);
    });
    navigation.navigate('Export', { projectId });
    setSaving(false);
  }, [demoSelectTake, navigation, projectId, rows]);

  const handleExit = useCallback(() => {
    Alert.alert('Exit review?', 'Selections will not be saved.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: () => navigation.navigate('Home') },
    ]);
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleExit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Takes</Text>
          <TouchableOpacity
            style={[styles.previewBtn, stitching && styles.dimmed]}
            onPress={handlePreview}
            disabled={stitching}
          >
            {stitching ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Text style={styles.previewBtnText}>▶ Preview</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {rows.map((row, si) => (
            <View key={row.sentence.id} style={styles.sentenceCard}>
              {/* Sentence label */}
              <View style={styles.sentenceHeader}>
                <View style={styles.numBadge}>
                  <Text style={styles.numBadgeText}>{si + 1}</Text>
                </View>
                <Text style={styles.sentenceText} numberOfLines={3}>
                  {row.sentence.text}
                </Text>
              </View>

              {row.takes.length === 0 ? (
                <Text style={styles.noTakes}>No takes recorded for this sentence.</Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.takesRow}
                >
                  {row.takes.map((take, ti) => {
                    const isSelected = take.id === row.selectedTakeId;
                    const isAuto = take.id === row.autoSelectedTakeId;
                    return (
                      <TouchableOpacity
                        key={take.id}
                        style={[
                          styles.takeCard,
                          isSelected && styles.takeCardSelected,
                          take.is_discarded && styles.takeCardDiscarded,
                        ]}
                        onPress={() => !take.is_discarded && selectTake(row.sentence.id, take.id)}
                        onLongPress={() => toggleDiscard(take)}
                        activeOpacity={0.75}
                      >
                        {isSelected && (
                          <View style={styles.bestBadge}>
                            <Text style={styles.bestBadgeText}>{isAuto ? 'BEST' : 'PICK'}</Text>
                          </View>
                        )}
                        <Text style={styles.takeNum}>Take {ti + 1}</Text>
                        <Text style={styles.takeDur}>
                          {(take.duration_ms / 1000).toFixed(1)}s
                        </Text>
                        <Text style={[styles.takeScore, { color: scoreColor(take) }]} numberOfLines={2}>
                          {scoreLabel(take)}
                        </Text>
                        {take.is_discarded && (
                          <View style={styles.discardOverlay}>
                            <Text style={styles.discardX}>✕</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <Text style={styles.hint}>
                Tap to select · Long-press to discard ·{' '}
                {tier === 'auto'
                  ? 'AI + delivery scored'
                  : tier === 'polished'
                  ? 'Fillers, pauses & delivery scored'
                  : 'Fillers & pauses scored'}
              </Text>
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Continue */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.continueBtn, saving && styles.dimmed]}
            onPress={handleContinue}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueBtnText}>Continue to Export →</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Preview modal */}
      <Modal
        visible={previewVisible}
        animationType="slide"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewModal}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewVisible(false)}>
            <Text style={styles.previewCloseText}>✕ Close</Text>
          </TouchableOpacity>
          {previewUri && (
            <Video
              source={{ uri: previewUri }}
              style={styles.previewVideo}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay
            />
          )}
        </View>
      </Modal>
    </>
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
  previewBtn: {
    backgroundColor: colors.surfaceElevated, borderRadius: 20,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderWidth: 1, borderColor: colors.accent, minWidth: 88, alignItems: 'center',
  },
  previewBtnText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  dimmed: { opacity: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.lg },

  sentenceCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  sentenceHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: spacing.sm, marginBottom: spacing.md,
  },
  numBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  numBadgeText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  sentenceText: { ...typography.body, flex: 1, lineHeight: 22 },
  noTakes: { ...typography.caption, fontStyle: 'italic', textAlign: 'center', padding: spacing.md },

  takesRow: { gap: spacing.sm, paddingBottom: spacing.xs },
  takeCard: {
    width: 82, minHeight: 104, borderRadius: 12,
    backgroundColor: colors.surfaceElevated, borderWidth: 2, borderColor: colors.border,
    padding: spacing.xs, alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative',
  },
  takeCardSelected: { borderColor: colors.success, backgroundColor: 'rgba(48,209,88,0.08)' },
  takeCardDiscarded: { opacity: 0.38 },
  bestBadge: {
    position: 'absolute', top: -9, alignSelf: 'center',
    backgroundColor: colors.success, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  bestBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  takeNum: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  takeDur: { fontSize: 11, color: colors.textMuted },
  takeScore: { fontSize: 10, fontWeight: '600', textAlign: 'center', lineHeight: 14 },
  discardOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  discardX: { fontSize: 24, color: colors.error },

  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.background, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, paddingBottom: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  continueBtn: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: spacing.md, alignItems: 'center',
  },
  continueBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  previewModal: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  previewClose: {
    position: 'absolute', top: 56, right: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  previewCloseText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  previewVideo: { width: '100%', height: '80%' },
});

export default ReviewScreen;
