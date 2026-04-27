import { create } from 'zustand';
import { Tier } from '@/config/features';

export interface UserState {
  id: string | null;
  email: string | null;
  tier: Tier;
  trial_ends_at: string | null;
  onboarding_completed: boolean;
}

interface UserActions {
  setUser: (user: Partial<UserState>) => void;
  clearUser: () => void;
  setTier: (tier: Tier) => void;
}

const defaultState: UserState = {
  id: null,
  email: null,
  tier: 'free',
  trial_ends_at: null,
  onboarding_completed: false,
};

export const useUserStore = create<UserState & UserActions>((set) => ({
  ...defaultState,

  setUser: (user) =>
    set((state) => ({
      ...state,
      ...user,
    })),

  clearUser: () => set({ ...defaultState }),

  setTier: (tier) => set({ tier }),
}));
