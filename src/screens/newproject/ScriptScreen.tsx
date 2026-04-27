import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import supabase from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { colors, spacing, typography } from '@/theme';

type ScriptNavProp = NativeStackNavigationProp<RootStackParamList, 'Script'>;
type ScriptRouteProp = RouteProp<RootStackParamList, 'Script'>;

const ABBR_PATTERN = /\b(Mr|Dr|Mrs|Ms|Prof|Sr|Jr|vs|etc|e\.g|i\.e|St|Ave|Blvd|Fig|No)\./gi;
const ABBR_PLACEHOLDER = '\x00';
const LONG_SCRIPT_WORD_THRESHOLD = 500;

function splitIntoSentences(text: string): string[] {
  if (!text.trim()) return [];
  let processed = text.replace(ABBR_PATTERN, (match) =>
    match.replace('.', ABBR_PLACEHOLDER)
  );
  const raw = processed.split(/(?<=[.!?])\s+/);
  return raw
    .map((s) => s.replace(new RegExp(ABBR_PLACEHOLDER, 'g'), '.').trim())
    .filter((s) => s.length > 0);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const ScriptScreen: React.FC = () => {
  const navigation = useNavigation<ScriptNavProp>();
  const route = useRoute<ScriptRouteProp>();
  const userId = useUserStore((s) => s.id);

  const existingProjectId = route.params?.projectId;

  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [takes, setTakes] = useState<2 | 3 | 4>(3);
  const [sentences, setSentences] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!existingProjectId);

  // AI modal state
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing project if editing
  useEffect(() => {
    if (!existingProjectId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('title, script_text')
          .eq('id', existingProjectId)
          .single();
        if (error) throw error;
        if (data) {
          setTitle(data.title);
          setScript(data.script_text);
        }
      } catch {
        Alert.alert('Error', 'Could not load project.');
      } finally {
        setLoading(false);
      }
    })();
  }, [existingProjectId]);

  // Debounced sentence splitting
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSentences(splitIntoSentences(script));
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [script]);

  const canStart = title.trim().length > 0 && script.trim().length > 0 && !saving;
  const words = wordCount(script);
  const isLongScript = words > LONG_SCRIPT_WORD_THRESHOLD;

  const handleGenerateAI = useCallback(() => {
    setAiModalVisible(true);
  }, []);

  const handleAIGenerate = useCallback(() => {
    if (!aiTopic.trim()) {
      Alert.alert('Topic required', 'Enter a topic for the script.');
      return;
    }
    // TODO: call GPT-4o-mini with topic + tone + target platform
    Alert.alert('Coming soon', 'AI script generation will be wired up in Phase 8.');
    setAiModalVisible(false);
  }, [aiTopic]);

  const handleStartRecording = useCallback(async () => {
    if (!canStart) return;

    if (isLongScript) {
      await new Promise<void>((resolve) =>
        Alert.alert(
          'Long script',
          `Your script is ${words} words. Recording may take a while. Continue?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
            { text: 'Continue', onPress: () => resolve() },
          ]
        )
      );
      // If user cancelled the alert the sentences are still valid; we just re-check canStart
      if (!canStart) return;
    }

    setSaving(true);
    try {
      let projectId = existingProjectId;

      if (projectId) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update({
            title: title.trim(),
            script_text: script.trim(),
            status: 'recording',
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId);
        if (error) throw error;

        // Delete old sentences and re-insert
        await supabase.from('sentences').delete().eq('project_id', projectId);
      } else {
        // Create new project
        const { data, error } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            title: title.trim(),
            script_text: script.trim(),
            status: 'recording',
          })
          .select('id')
          .single();
        if (error) throw error;
        projectId = data.id;
      }

      // Insert sentences
      const sentenceRows = sentences.map((text, i) => ({
        project_id: projectId,
        order_index: i,
        text,
        selected_take_id: null,
      }));

      const { error: sentenceError } = await supabase
        .from('sentences')
        .insert(sentenceRows);
      if (sentenceError) throw sentenceError;

      navigation.navigate('Record', { projectId: projectId! });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not save project.';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  }, [canStart, existingProjectId, isLongScript, navigation, script, sentences, title, userId, words]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {existingProjectId ? 'Edit Script' : 'New Project'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title input */}
            <Text style={styles.label}>Project title</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="e.g. Product demo walkthrough"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />

            {/* Script input */}
            <View style={styles.scriptHeader}>
              <Text style={styles.label}>Script</Text>
              <TouchableOpacity style={styles.aiButton} onPress={handleGenerateAI}>
                <Text style={styles.aiButtonText}>✦ Generate with AI</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.scriptInput}
              placeholder="Write or paste your script here..."
              placeholderTextColor={colors.textMuted}
              value={script}
              onChangeText={setScript}
              multiline
              textAlignVertical="top"
            />

            {/* Word count + long script warning */}
            {script.length > 0 && (
              <View style={styles.wordCountRow}>
                <Text style={[styles.wordCount, isLongScript && styles.wordCountWarning]}>
                  {words} words{isLongScript ? ' — long script, recording may take a while' : ''}
                </Text>
              </View>
            )}

            {/* Takes per sentence */}
            <Text style={styles.label}>Takes per sentence</Text>
            <View style={styles.takesRow}>
              {([2, 3, 4] as const).map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.takesButton, takes === n && styles.takesButtonActive]}
                  onPress={() => setTakes(n)}
                >
                  <Text
                    style={[styles.takesButtonText, takes === n && styles.takesButtonTextActive]}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.takesHint}>takes / sentence</Text>
            </View>

            {/* Sentence preview */}
            {sentences.length > 0 && (
              <View style={styles.sentencePreview}>
                <Text style={styles.sentencePreviewTitle}>
                  {sentences.length} sentence{sentences.length !== 1 ? 's' : ''} detected
                </Text>
                {sentences.map((s, i) => (
                  <View key={i} style={styles.sentenceRow}>
                    <View style={styles.sentenceNum}>
                      <Text style={styles.sentenceNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.sentenceText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 90 }} />
          </ScrollView>

          {/* Start Recording button */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.startButton, !canStart && styles.startButtonDisabled]}
              onPress={handleStartRecording}
              disabled={!canStart}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={styles.startButtonText}>Start Recording →</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* AI Script Generation Modal */}
      <Modal
        visible={aiModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAiModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Generate script with AI</Text>
            <Text style={styles.modalSubtitle}>
              Describe your topic and we'll write a first draft.
            </Text>

            <Text style={styles.modalLabel}>Topic</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. How our product saves teams 3 hours a week"
              placeholderTextColor={colors.textMuted}
              value={aiTopic}
              onChangeText={setAiTopic}
              multiline
            />

            <Text style={styles.modalLabel}>Tone (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. conversational, professional, enthusiastic"
              placeholderTextColor={colors.textMuted}
              value={aiTone}
              onChangeText={setAiTone}
            />

            <TouchableOpacity style={styles.modalPrimary} onPress={handleAIGenerate}>
              <Text style={styles.modalPrimaryText}>✦ Generate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setAiModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  titleInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
  },
  scriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  aiButton: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  aiButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  scriptInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
    minHeight: 200,
    lineHeight: 24,
  },
  wordCountRow: {
    marginTop: spacing.xs,
    alignItems: 'flex-end',
  },
  wordCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  wordCountWarning: {
    color: colors.warning,
  },
  takesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  takesButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  takesButtonActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  takesButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  takesButtonTextActive: {
    color: colors.primary,
  },
  takesHint: {
    ...typography.caption,
    marginLeft: spacing.xs,
  },
  sentencePreview: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sentencePreviewTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  sentenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sentenceNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  sentenceNumText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sentenceText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  startButtonDisabled: {
    opacity: 0.4,
  },
  startButtonText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  modalLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  modalInput: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
  },
  modalPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  modalPrimaryText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  modalCancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
});

export default ScriptScreen;
