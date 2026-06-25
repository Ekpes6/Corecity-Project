export const COLORS = {
  primary:       '#2D5016',
  primaryMed:    '#4a7a23',
  primaryLight:  '#7CB342',
  primaryFaint:  '#EEF6EE',
  accent:        '#E8824A',
  accentDark:    '#C0621A',
  accentFaint:   '#FFF7ED',
  blue:          '#3B82F6',
  blueFaint:     '#EFF6FF',
  white:         '#FFFFFF',
  background:    '#F8FAFC',
  card:          '#FFFFFF',
  border:        '#E5E7EB',
  divider:       '#F3F4F6',
  text:          '#111827',
  textSecondary: '#374151',
  textMuted:     '#9CA3AF',
  textLight:     '#D1D5DB',
  success:       '#10B981',
  successFaint:  '#ECFDF5',
  error:         '#EF4444',
  errorFaint:    '#FEF2F2',
  warning:       '#F59E0B',
  overlay:       'rgba(0,0,0,0.48)',
} as const;

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const RADIUS = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  full: 999,
} as const;

export const FONT = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   16,
  lg:   18,
  xl:   22,
  xxl:  26,
  xxxl: 32,
} as const;

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const LISTING_COLORS: Record<string, string> = {
  FOR_SALE:  COLORS.primary,
  FOR_RENT:  COLORS.accent,
  SHORT_LET: COLORS.blue,
};

export const LISTING_LABELS: Record<string, string> = {
  FOR_SALE:  'For Sale',
  FOR_RENT:  'For Rent',
  SHORT_LET: 'Short Let',
};
