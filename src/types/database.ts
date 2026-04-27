export type ProjectStatus = 'draft' | 'recording' | 'reviewing' | 'exported';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  script_text: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Sentence {
  id: string;
  project_id: string;
  order_index: number;
  text: string;
  selected_take_id: string | null;
}

// A detected silence segment within a take — used by FFmpeg at stitch time to cut pauses out
export interface PauseSegment {
  start_ms: number;
  end_ms: number;
}

export interface Take {
  id: string;
  sentence_id: string;
  local_file_path: string;
  duration_ms: number;
  filler_count: number;
  pause_count: number;
  pause_segments: PauseSegment[]; // stored as JSONB; FFmpeg uses these to cut pauses during export
  eye_contact_score: number | null;
  body_language_score: number | null;
  tone_score: number | null;
  composite_score: number | null;
  is_discarded: boolean;
  created_at: string;
}

export interface Export {
  id: string;
  project_id: string;
  output_path: string;
  format: '9:16' | '1:1' | '16:9';
  duration_ms: number;
  created_at: string;
}
