export type Tier = 'free' | 'clean' | 'polished' | 'auto';

const TIER_LEVEL: Record<Tier, number> = {
  free: 0,
  clean: 1,
  polished: 2,
  auto: 3,
};

export const FEATURES: Record<string, Tier[]> = {
  teleprompter_multi_take: ['clean', 'polished', 'auto', 'free'],
  filler_pause_detection: ['clean', 'polished', 'auto', 'free'],
  best_take_rules: ['clean', 'polished', 'auto', 'free'],
  eye_contact_scoring: ['polished', 'auto'],
  body_language_scoring: ['polished', 'auto'],
  tone_scoring: ['polished', 'auto'],
  llm_tiebreaker: ['auto'],
  auto_captions: ['auto'],
  ai_script_generator_unlimited: ['polished', 'auto'],
  ai_script_generator_limited: ['clean', 'polished', 'auto', 'free'],
  export_background_music: ['polished', 'auto'],
  cloud_backup: ['polished', 'auto'],
};

export function hasFeature(key: string, userTier: Tier): boolean {
  const allowedTiers = FEATURES[key];
  if (!allowedTiers) return false;
  const userLevel = TIER_LEVEL[userTier];
  return allowedTiers.some((t) => TIER_LEVEL[t] <= userLevel);
}
