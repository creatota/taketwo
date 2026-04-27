export const colors = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  primary: '#FF3B5C',
  primaryMuted: '#FF3B5C33',
  accent: '#7B61FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#606060',
  success: '#30D158',
  warning: '#FFD60A',
  error: '#FF453A',
  border: '#2A2A2A',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const, color: colors.textPrimary },
  h2: { fontSize: 24, fontWeight: '700' as const, color: colors.textPrimary },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.textPrimary },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.textPrimary },
  caption: { fontSize: 13, fontWeight: '400' as const, color: colors.textSecondary },
};
