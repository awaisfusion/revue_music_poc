// Colours taken from the live RSM web app (revive-soul-music-copy-0349a440.base44.app):
// black/zinc surfaces with an amber → orange accent gradient.
export const colors = {
  background: '#000000',
  surface: '#09090b', // zinc-950
  card: '#18181b', // zinc-900
  cardBorder: '#27272a', // zinc-800
  elevated: '#27272a',
  text: '#ffffff',
  textSecondary: '#d4d4d8', // zinc-300
  textMuted: '#a1a1aa', // zinc-400
  textFaint: '#71717a', // zinc-500
  primary: '#f59e0b', // amber-500
  primaryLight: '#fbbf24', // amber-400
  accent: '#f97316', // orange-500
  primaryTint: 'rgba(245, 158, 11, 0.15)',
  onPrimary: '#000000',
  success: '#22c55e',
  danger: '#ef4444',
};

export const gradient = {
  // Buttons on the web app: amber-500 → orange-500
  button: [colors.primary, colors.accent] as const,
  // Headline text: amber-400 → orange-500
  headline: [colors.primaryLight, colors.accent] as const,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
};

export const spacing = (n: number) => n * 4;
