import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { Sentence } from '@/types/database';
import { useDemoStore } from '@/store/demoStore';
import { colors, spacing } from '@/theme';
import { countFillerWords } from '@/config/fillerWords';
import { detectPauses } from '@/utils/pauseDetection';
import { PauseSegment } from '@/types/database';

type RecordNavProp = NativeStackNavigationProp<RootStackParamList, 'Record'>;
type RecordRouteProp = RouteProp<RootStackParamList, 'Record'>;

type RecordingPhase = 'loading' | 'idle' | 'countdown' | 'recording' | 'processing' | 'done';

interface LocalTake {
  id: string;
  sentenceIndex: number;
  takeNumber: number;
  localPath: string;
  durationMs: number;
  fillerCount: number;
  pauseSegments: PauseSegment[];
}

const TAKES_DIR = `${FileSystem.documentDirectory}takes/`;
const MAX_RECORDING_DURATION = 30; // seconds — expo-camera hard limit
const COUNTDOWN_FROM = 3;

const RecordScreen: React.FC = () => {
  const navigation = useNavigation<RecordNavProp>();
  const route = useRoute<RecordRouteProp>();
  const { projectId, takesPerSentence } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const demoSentences = useDemoStore((s) => s.sentences);
  const addDemoTake = useDemoStore((s) => s.addTake);

  const [phase, setPhase] = useState<RecordingPhase>('loading');
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [takeCount, setTakeCount] = useState(0); // takes completed for current sentence
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [durationMs, setDurationMs] = useState(0);
  const [allTakes, setAllTakes] = useState<LocalTake[]>([]);

  const cameraRef = useRef<CameraView>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ─── Load sentences from demo store ─────────────────────────────────────────
  useEffect(() => {
    if (!demoSentences.length) {
      Alert.alert('Error', 'No sentences found.', [
        { text: 'Go back', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    // Cast demo sentences to the Sentence type (shapes are identical)
    setSentences(demoSentences as any);
    setPhase('idle');
  }, [navigation, demoSentences]);

  // ─── Recording duration timer ────────────────────────────────────────────────
  const startDurationTimer = useCallback(() => {
    setDurationMs(0);
    durationRef.current = setInterval(() => {
      setDurationMs((d) => d + 100);
    }, 100);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationRef.current) {
      clearInterval(durationRef.current);
      durationRef.current = null;
    }
  }, []);

  // ─── Pulsing REC dot ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'recording') {
      pulseAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [phase, pulseAnim]);

  // ─── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopDurationTimer();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [stopDurationTimer]);

  // ─── Countdown → start recording ────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_FROM);
    setPhase('countdown');
    let tick = COUNTDOWN_FROM;

    countdownRef.current = setInterval(async () => {
      tick -= 1;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (tick <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setPhase('recording');
        startDurationTimer();
        // Start camera recording — promise resolves when stopRecording() is called
        cameraRef.current
          ?.recordAsync({ maxDuration: MAX_RECORDING_DURATION })
          .then((result) => {
            if (result?.uri) handleTakeRecorded(result.uri);
          })
          .catch(() => {
            // Recording interrupted (e.g. app backgrounded) — silently discard
            setPhase('idle');
          });
      } else {
        setCountdown(tick);
      }
    }, 1000);
  }, [startDurationTimer]); // handleTakeRecorded defined below via ref

  // ─── Stop recording (manual) ─────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    stopDurationTimer();
    cameraRef.current?.stopRecording();
    setPhase('processing');
  }, [stopDurationTimer]);

  // ─── Process a completed take ────────────────────────────────────────────────
  const handleTakeRecorded = useCallback(
    async (tempUri: string) => {
      stopDurationTimer();
      setPhase('processing');

      const currentSentence = sentences[sentenceIndex];
      if (!currentSentence) return;

      const newTakeNumber = takeCount + 1;
      const takeId = `${currentSentence.id}_${newTakeNumber}_${Date.now()}`;
      const permanentPath = `${TAKES_DIR}${takeId}.mp4`;

      try {
        await FileSystem.makeDirectoryAsync(TAKES_DIR, { intermediates: true });
        await FileSystem.moveAsync({ from: tempUri, to: permanentPath });
      } catch {
        // If move fails, use original temp URI — file still accessible this session
      }

      // Filler count: count filler words in the target sentence text as a proxy.
      // TODO Phase 8: run cloud STT on the audio and count fillers in the transcript.
      const fillerCount = countFillerWords(currentSentence.text);

      // Pause detection via FFmpeg silencedetect — segments stored for removal at export time
      let pauseSegments: PauseSegment[] = [];
      try {
        pauseSegments = await detectPauses(permanentPath);
      } catch {
        // Non-fatal — proceed with empty segments
      }

      const compositeTier1 = fillerCount * -2 + pauseSegments.length * -1;

      const newTake: LocalTake = {
        id: takeId,
        sentenceIndex,
        takeNumber: newTakeNumber,
        localPath: permanentPath,
        durationMs,
        fillerCount,
        pauseSegments,
      };

      addDemoTake({
        id: takeId,
        sentence_id: currentSentence.id,
        local_file_path: permanentPath,
        duration_ms: durationMs,
        filler_count: fillerCount,
        pause_count: pauseSegments.length,
        pause_segments: pauseSegments,
        composite_score: compositeTier1,
        is_discarded: false,
        created_at: new Date().toISOString(),
      });

      setAllTakes((prev) => [...prev, newTake]);

      const sentenceDone = newTakeNumber >= takesPerSentence;
      const lastSentence = sentenceIndex >= sentences.length - 1;

      if (sentenceDone && lastSentence) {
        setPhase('done');
        navigation.navigate('Review', { projectId });
      } else if (sentenceDone) {
        setSentenceIndex((i) => i + 1);
        setTakeCount(0);
        setPhase('idle');
      } else {
        setTakeCount(newTakeNumber);
        setPhase('idle');
      }
    },
    [
      durationMs,
      navigation,
      projectId,
      sentenceIndex,
      sentences,
      stopDurationTimer,
      takeCount,
      takesPerSentence,
    ],
  );

  // ─── Redo: discard last take for current sentence ────────────────────────────
  const handleRedo = useCallback(async () => {
    if (takeCount === 0) return;
    const lastTake = [...allTakes].reverse().find((t) => t.sentenceIndex === sentenceIndex);
    if (lastTake) {
      await supabase.from('takes').update({ is_discarded: true }).eq('id', lastTake.id);
      setAllTakes((prev) => prev.filter((t) => t.id !== lastTake.id));
    }
    setTakeCount((c) => Math.max(0, c - 1));
  }, [allTakes, sentenceIndex, takeCount]);

  // ─── Done early: advance with fewer takes ────────────────────────────────────
  const handleDoneEarly = useCallback(() => {
    if (takeCount === 0) return;
    const lastSentence = sentenceIndex >= sentences.length - 1;
    if (lastSentence) {
      navigation.navigate('Review', { projectId });
    } else {
      setSentenceIndex((i) => i + 1);
      setTakeCount(0);
    }
  }, [navigation, projectId, sentenceIndex, sentences.length, takeCount]);

  // ─── Exit confirmation ───────────────────────────────────────────────────────
  const handleExit = useCallback(() => {
    if (phase === 'recording') cameraRef.current?.stopRecording();
    Alert.alert(
      'Exit recording?',
      'Your takes so far will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => navigation.navigate('Home'),
        },
      ],
    );
  }, [navigation, phase]);

  // ─── Permissions ────────────────────────────────────────────────────────────
  if (!permission) {
    return <View style={styles.centerFill} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          TakeTwo needs your camera and microphone to record your takes.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.permissionBack}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (phase === 'loading' || sentences.length === 0) {
    return (
      <View style={styles.centerFill}>
        <Text style={styles.loadingText}>Loading sentences…</Text>
      </View>
    );
  }

  const currentSentence = sentences[sentenceIndex];
  const prevSentence = sentenceIndex > 0 ? sentences[sentenceIndex - 1] : null;
  const nextSentence = sentenceIndex < sentences.length - 1 ? sentences[sentenceIndex + 1] : null;
  const takesForCurrentSentence = allTakes.filter((t) => t.sentenceIndex === sentenceIndex);
  const isRecording = phase === 'recording';
  const isProcessing = phase === 'processing';

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${s}.${tenths}s`;
  };

  return (
    <View style={styles.root}>
      {/* Camera full-bleed */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
        mode="video"
      />

      {/* Teleprompter overlay — top 38% */}
      <View style={styles.teleprompter}>
        {prevSentence && (
          <Text style={styles.prevSentence} numberOfLines={2}>
            {prevSentence.text}
          </Text>
        )}
        <Text style={styles.currentSentence}>{currentSentence.text}</Text>
        {nextSentence && (
          <Text style={styles.nextSentence} numberOfLines={2}>
            {nextSentence.text}
          </Text>
        )}
      </View>

      {/* Progress pill */}
      <View style={styles.progressPill}>
        <Text style={styles.progressText}>
          Sentence {sentenceIndex + 1} of {sentences.length}
          {'  ·  '}
          Take {takeCount + 1} of {takesPerSentence}
        </Text>
      </View>

      {/* Exit button */}
      <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
        <Text style={styles.exitText}>✕ Exit</Text>
      </TouchableOpacity>

      {/* Bottom controls */}
      <View style={styles.bottomGradient}>
        {/* Take thumbnails */}
        {takesForCurrentSentence.length > 0 && (
          <View style={styles.thumbnailRow}>
            {takesForCurrentSentence.map((t) => (
              <View key={t.id} style={styles.thumbnail}>
                <Text style={styles.thumbnailNum}>{t.takeNumber}</Text>
                <Text style={styles.thumbnailDur}>{formatDuration(t.durationMs)}</Text>
                {t.fillerCount > 0 && (
                  <Text style={styles.thumbnailFiller}>{t.fillerCount} filler{t.fillerCount !== 1 ? 's' : ''}</Text>
                )}
                {t.pauseSegments.length > 0 && (
                  <Text style={styles.thumbnailPause}>{t.pauseSegments.length} pause{t.pauseSegments.length !== 1 ? 's' : ''}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <View style={styles.recRow}>
            <Animated.View style={[styles.recDot, { opacity: pulseAnim }]} />
            <Text style={styles.recLabel}>REC  {formatDuration(durationMs)}</Text>
          </View>
        )}

        {/* Main controls */}
        <View style={styles.controls}>
          {/* Redo button */}
          <TouchableOpacity
            style={[styles.sideButton, (takeCount === 0 || isRecording || isProcessing) && styles.disabled]}
            onPress={handleRedo}
            disabled={takeCount === 0 || isRecording || isProcessing}
          >
            <Text style={styles.sideButtonIcon}>↩</Text>
            <Text style={styles.sideButtonLabel}>Redo</Text>
          </TouchableOpacity>

          {/* Record / Stop button */}
          {isRecording ? (
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording} activeOpacity={0.8}>
              <View style={styles.stopSquare} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.recordButton, (phase === 'countdown' || isProcessing) && styles.disabled]}
              onPress={startCountdown}
              disabled={phase === 'countdown' || isProcessing}
              activeOpacity={0.8}
            >
              <View style={styles.recordInner} />
            </TouchableOpacity>
          )}

          {/* Done early button */}
          <TouchableOpacity
            style={[styles.sideButton, (takeCount === 0 || isRecording || isProcessing) && styles.disabled]}
            onPress={handleDoneEarly}
            disabled={takeCount === 0 || isRecording || isProcessing}
          >
            <Text style={styles.sideButtonIcon}>→</Text>
            <Text style={styles.sideButtonLabel}>Done early</Text>
          </TouchableOpacity>
        </View>

        {/* Processing indicator */}
        {isProcessing && (
          <Text style={styles.processingText}>Saving take…</Text>
        )}
      </View>

      {/* Countdown overlay */}
      {phase === 'countdown' && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownNumber}>{countdown}</Text>
          <Text style={styles.countdownSub}>Get ready</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerFill: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
  },

  // ── Permissions ──────────────────────────────────────────────────────────────
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  permissionBody: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  permissionBack: {
    color: colors.accent,
    fontSize: 15,
  },

  // ── Exit button ──────────────────────────────────────────────────────────────
  exitButton: {
    position: 'absolute',
    top: 56,
    left: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  exitText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Progress pill ────────────────────────────────────────────────────────────
  progressPill: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  progressText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Teleprompter ─────────────────────────────────────────────────────────────
  teleprompter: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
  },
  prevSentence: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.28)',
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  currentSentence: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 34,
    marginVertical: spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  nextSentence: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.38)',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },

  // ── Bottom gradient area ─────────────────────────────────────────────────────
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 48,
    paddingTop: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
  },

  // ── Thumbnails ───────────────────────────────────────────────────────────────
  thumbnailRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  thumbnail: {
    width: 62,
    height: 82,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  thumbnailNum: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  thumbnailDur: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  thumbnailFiller: {
    fontSize: 9,
    color: colors.warning,
    marginTop: 2,
    textAlign: 'center',
  },
  thumbnailPause: {
    fontSize: 9,
    color: colors.accent,
    marginTop: 1,
    textAlign: 'center',
  },

  // ── Recording indicator ──────────────────────────────────────────────────────
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  recLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // ── Controls ─────────────────────────────────────────────────────────────────
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.sm,
  },
  recordButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  recordInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
  },
  stopButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  stopSquare: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  sideButton: {
    alignItems: 'center',
    gap: 4,
    width: 64,
  },
  sideButtonIcon: {
    fontSize: 24,
    color: '#fff',
  },
  sideButtonLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.3,
  },
  processingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: spacing.xs,
  },

  // ── Countdown overlay ────────────────────────────────────────────────────────
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    fontSize: 120,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 130,
  },
  countdownSub: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

export default RecordScreen;
