export const DEFAULT_FILLER_WORDS = [
  'um', 'uh', 'like', 'you know', 'so', 'basically', 'literally',
  'actually', 'right', 'okay so', 'i mean', 'kind of', 'sort of',
];

export function countFillerWords(
  transcript: string,
  fillerWords: string[] = DEFAULT_FILLER_WORDS,
): number {
  const lower = transcript.toLowerCase();
  return fillerWords.reduce((count, filler) => {
    const regex = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    const matches = lower.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}
