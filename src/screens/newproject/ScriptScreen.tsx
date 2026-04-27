import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { colors, spacing, typography } from '@/theme';

type ScriptNavProp = NativeStackNavigationProp<RootStackParamList, 'Script'>;
type ScriptRouteProp = RouteProp<RootStackParamList, 'Script'>;

// Abbreviations that should NOT trigger a sentence split
const ABBR_PATTERN = /\b(Mr|Dr|Mrs|Ms|Prof|Sr|Jr|vs|etc|e\.g|i\.e|St|Ave|Blvd|Fig|No)\./gi;
const ABBR_PLACEHOLDER = '\x00';

function splitIntoSentences(text: string): string[] {
  if (!text.trim()) return [];

  // Replace abbreviation periods with a placeholder
  let processed = text.replace(ABBR_PATTERN, (match) =>
    match.replace('.', ABBR_PLACEHOLDER)
  );

  // Split on sentence-ending punctuation followed by whitespace
  const raw = processed.split(/(?<=[.!?])\s+/);

  return raw
    .map((s) => s.replace(new RegExp(ABBR_PLACEHOLDER, 'g'), '.').trim())
    .filter((s) => s.length > 0);
}

const ScriptScreen: React.FC = () => {
  const navigation = useNavigation<ScriptNavProp>();
  const route = useRoute<ScriptRouteProp>();

  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [takes, setTakes] = useState<2 | 3 | 4>(3);
  const [sentences, setSentences] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSentences(splitIntoSentences(script));
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [script]);

  const canStart = title.trim().length > 0 && script.trim().length > 0;

  const handleGenerateAI = () => {
    Alert.alert('Coming soon', 'AI script generation coming soon.');
  };

  const handleStartRecording = () => {
    console.log('TODO: save to Supabase');
    navigation.navigate('Record', { projectId: route.params?.projectId ?? 'mock-project-1' });
  };

  return (
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
          <Text style={styles.headerTitle}>New Project</Text>
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

          {/* Bottom padding for the fixed button */}
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
            <Text style={styles.startButtonText}>Start Recording →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
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
});

export default ScriptScreen;
