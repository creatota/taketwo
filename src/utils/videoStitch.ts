import { PauseSegment } from '@/types/database';

export type AspectRatio = '9:16' | '1:1' | '16:9';

export interface TakeToStitch {
  localPath: string;
  durationMs: number;
  pauseSegments: PauseSegment[];
}

// DEMO: FFmpeg is not available in Expo Go.
// Simulates stitching with a 2-second delay so the UI flow is fully
// demonstrable. Replace with the real ffmpeg-kit-react-native
// implementation (see git history) for production builds.
export async function stitchTakes(
  _takes: TakeToStitch[],
  _outputPath: string,
  _aspectRatio?: AspectRatio,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
