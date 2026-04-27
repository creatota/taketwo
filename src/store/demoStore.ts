import { create } from 'zustand';
import { PauseSegment } from '@/types/database';

export interface DemoSentence {
  id: string;
  project_id: string;
  order_index: number;
  text: string;
  selected_take_id: string | null;
}

export interface DemoTake {
  id: string;
  sentence_id: string;
  local_file_path: string;
  duration_ms: number;
  filler_count: number;
  pause_count: number;
  pause_segments: PauseSegment[];
  composite_score: number;
  is_discarded: boolean;
  created_at: string;
}

interface DemoState {
  projectId: string;
  projectTitle: string;
  sentences: DemoSentence[];
  takes: DemoTake[];
}

interface DemoActions {
  setProject: (projectId: string, title: string, sentenceTexts: string[]) => void;
  addTake: (take: DemoTake) => void;
  selectTake: (sentenceId: string, takeId: string) => void;
  setDiscarded: (takeId: string, discarded: boolean) => void;
  reset: () => void;
}

const defaultState: DemoState = {
  projectId: '',
  projectTitle: '',
  sentences: [],
  takes: [],
};

export const useDemoStore = create<DemoState & DemoActions>((set) => ({
  ...defaultState,

  setProject: (projectId, title, sentenceTexts) =>
    set({
      projectId,
      projectTitle: title,
      sentences: sentenceTexts.map((text, i) => ({
        id: `s-${projectId}-${i}`,
        project_id: projectId,
        order_index: i,
        text,
        selected_take_id: null,
      })),
      takes: [],
    }),

  addTake: (take) => set((s) => ({ takes: [...s.takes, take] })),

  selectTake: (sentenceId, takeId) =>
    set((s) => ({
      sentences: s.sentences.map((sen) =>
        sen.id === sentenceId ? { ...sen, selected_take_id: takeId } : sen,
      ),
    })),

  setDiscarded: (takeId, discarded) =>
    set((s) => ({
      takes: s.takes.map((t) => (t.id === takeId ? { ...t, is_discarded: discarded } : t)),
    })),

  reset: () => set({ ...defaultState }),
}));
