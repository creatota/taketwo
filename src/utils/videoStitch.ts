import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import * as FileSystem from 'expo-file-system';
import { PauseSegment } from '@/types/database';

export type AspectRatio = '9:16' | '1:1' | '16:9';

export interface TakeToStitch {
  localPath: string;
  durationMs: number;
  pauseSegments: PauseSegment[];
}

const CACHE_DIR = `${FileSystem.cacheDirectory}stitch/`;

function getKeptIntervals(
  pauseSegments: PauseSegment[],
  totalDurationMs: number,
): Array<{ start: number; end: number }> {
  const intervals: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const p of pauseSegments) {
    if (p.start_ms > cursor) intervals.push({ start: cursor, end: p.start_ms });
    cursor = p.end_ms;
  }
  if (cursor < totalDurationMs) intervals.push({ start: cursor, end: totalDurationMs });
  return intervals;
}

// Pass 1: remove pauses from a single take into a temp file.
// Returns the original path if nothing to trim.
async function cleanTake(take: TakeToStitch, index: number): Promise<string> {
  if (take.pauseSegments.length === 0) return take.localPath;

  await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  const outPath = `${CACHE_DIR}cleaned_${index}_${Date.now()}.mp4`;

  const intervals = getKeptIntervals(take.pauseSegments, take.durationMs);
  if (intervals.length === 0) return take.localPath;

  const selectExpr = intervals
    .map(({ start, end }) => `between(t,${start / 1000},${end / 1000})`)
    .join('+');

  const cmd =
    `-i "${take.localPath}"` +
    ` -vf "select='${selectExpr}',setpts=N/FRAME_RATE/TB"` +
    ` -af "aselect='${selectExpr}',asetpts=N/SR/TB"` +
    ` -y "${outPath}"`;

  const session = await FFmpegKit.execute(cmd);
  const rc = await session.getReturnCode();
  if (!ReturnCode.isSuccess(rc)) return take.localPath; // fallback to original
  return outPath;
}

// Pass 2: concat + loudness norm + optional aspect-ratio scale.
async function concatCleanedTakes(
  paths: string[],
  outputPath: string,
  aspectRatio?: AspectRatio,
): Promise<void> {
  const n = paths.length;
  const inputs = paths.map((p) => `-i "${p}"`).join(' ');
  const labels = paths.map((_, i) => `[${i}:v][${i}:a]`).join('');

  const scaleFilters: Record<AspectRatio, string> = {
    '9:16': 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
    '1:1': 'scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080',
    '16:9': 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
  };

  let filterComplex = `${labels}concat=n=${n}:v=1:a=1[vcat][acat]`;
  filterComplex += `;[acat]loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;

  let videoMap = '[vcat]';
  if (aspectRatio) {
    filterComplex += `;[vcat]${scaleFilters[aspectRatio]}[vout]`;
    videoMap = '[vout]';
  }

  const cmd =
    `${inputs}` +
    ` -filter_complex "${filterComplex}"` +
    ` -map "${videoMap}" -map "[aout]"` +
    ` -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 128k` +
    ` -y "${outputPath}"`;

  const session = await FFmpegKit.execute(cmd);
  const rc = await session.getReturnCode();
  if (!ReturnCode.isSuccess(rc)) {
    const logs = await session.getOutput();
    throw new Error(`FFmpeg stitch failed: ${logs?.slice(-300)}`);
  }
}

/**
 * Stitches takes into one video: removes pauses, concatenates, normalises
 * loudness, and optionally scales to a target aspect ratio.
 */
export async function stitchTakes(
  takes: TakeToStitch[],
  outputPath: string,
  aspectRatio?: AspectRatio,
): Promise<void> {
  if (takes.length === 0) throw new Error('No takes to stitch');
  await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });

  const cleanedPaths = await Promise.all(takes.map((t, i) => cleanTake(t, i)));
  try {
    await concatCleanedTakes(cleanedPaths, outputPath, aspectRatio);
  } finally {
    for (let i = 0; i < cleanedPaths.length; i++) {
      if (cleanedPaths[i] !== takes[i].localPath) {
        FileSystem.deleteAsync(cleanedPaths[i], { idempotent: true }).catch(() => {});
      }
    }
  }
}
