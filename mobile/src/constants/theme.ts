/**
 * Palette alignée sur le frontend web (frontend/tailwind.config.js) :
 * chick-yellow #FFD700 et dark #1a1a1a.
 */
export const colors = {
  primary: '#FFD700',
  primaryDim: '#E6C200',
  dark: '#1a1a1a',
  background: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  textOnDark: '#F9FAFB',
  success: '#16A34A',
  danger: '#DC2626',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
