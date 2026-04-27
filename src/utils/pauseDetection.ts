import { PauseSegment } from '@/types/database';

// DEMO: FFmpeg silencedetect is not available in Expo Go.
// Returns empty segments — pause removal is a no-op in this build.
// Replace with the real ffmpeg-kit-react-native implementation for production.
export async function detectPauses(_filePath: string): Promise<PauseSegment[]> {
  return [];
}

export function buildPauseRemovalFilter(
  _pauseSegments: PauseSegment[],
  _totalDurationMs: number,
  inputLabel = '0',
): string {
  return `[${inputLabel}:v][${inputLabel}:a]`;
}
