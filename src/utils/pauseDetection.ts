import { FFmpegKit } from 'ffmpeg-kit-react-native';
import { PauseSegment } from '@/types/database';

// Silence threshold and minimum duration that counts as a pause worth removing
const SILENCE_NOISE_DB = -35;
const SILENCE_MIN_DURATION_S = 0.5; // 500 ms

/**
 * Runs FFmpeg silencedetect on a recorded take and returns the list of
 * silence segments. These are stored on the take row and used at export
 * time so FFmpeg can cut them out of the final stitched video.
 */
export async function detectPauses(filePath: string): Promise<PauseSegment[]> {
  const cmd = `-i "${filePath}" -af silencedetect=noise=${SILENCE_NOISE_DB}dB:d=${SILENCE_MIN_DURATION_S} -f null -`;

  const session = await FFmpegKit.execute(cmd);
  const output = await session.getOutput();

  return parseSilenceDetectOutput(output ?? '');
}

function parseSilenceDetectOutput(output: string): PauseSegment[] {
  const segments: PauseSegment[] = [];
  const startRegex = /silence_start:\s*([\d.]+)/g;
  const endRegex = /silence_end:\s*([\d.]+)/g;

  const starts: number[] = [];
  const ends: number[] = [];

  let m: RegExpExecArray | null;
  while ((m = startRegex.exec(output)) !== null) {
    starts.push(parseFloat(m[1]) * 1000); // convert s → ms
  }
  while ((m = endRegex.exec(output)) !== null) {
    ends.push(parseFloat(m[1]) * 1000);
  }

  // Pair up starts and ends; ignore a trailing start with no end (silence at EOF)
  const count = Math.min(starts.length, ends.length);
  for (let i = 0; i < count; i++) {
    segments.push({ start_ms: Math.round(starts[i]), end_ms: Math.round(ends[i]) });
  }

  return segments;
}

/**
 * Builds an FFmpeg filter_complex string that cuts the pause segments out
 * of a single video stream. Used during stitching in the Export phase.
 *
 * Returns the atrim/trim chains and a concat instruction ready to be
 * inserted into a larger filter_complex.
 */
export function buildPauseRemovalFilter(
  pauseSegments: PauseSegment[],
  totalDurationMs: number,
  inputLabel = '0',
): string {
  if (pauseSegments.length === 0) {
    return `[${inputLabel}:v][${inputLabel}:a]`;
  }

  // Build kept intervals (the non-silent parts)
  const kept: Array<{ start: number; end: number }> = [];
  let cursor = 0;

  for (const p of pauseSegments) {
    if (p.start_ms > cursor) {
      kept.push({ start: cursor, end: p.start_ms });
    }
    cursor = p.end_ms;
  }
  if (cursor < totalDurationMs) {
    kept.push({ start: cursor, end: totalDurationMs });
  }

  const vParts = kept
    .map(
      ({ start, end }, i) =>
        `[${inputLabel}:v]trim=start=${start / 1000}:end=${end / 1000},setpts=PTS-STARTPTS[v${i}]`,
    )
    .join('; ');

  const aParts = kept
    .map(
      ({ start, end }, i) =>
        `[${inputLabel}:a]atrim=start=${start / 1000}:end=${end / 1000},asetpts=PTS-STARTPTS[a${i}]`,
    )
    .join('; ');

  const vConcat = kept.map((_, i) => `[v${i}]`).join('');
  const aConcat = kept.map((_, i) => `[a${i}]`).join('');
  const concatLine = `${vConcat}${aConcat}concat=n=${kept.length}:v=1:a=1[vout][aout]`;

  return [vParts, aParts, concatLine].filter(Boolean).join('; ');
}
