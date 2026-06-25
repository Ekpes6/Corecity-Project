export const formatNaira = (amount: number | string): string => {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '₦0';
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString('en-NG')}`;
};

export const formatNairaFull = (amount: number | string): string => {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '₦0';
  return `₦${n.toLocaleString('en-NG')}`;
};

export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('0')   && digits.length === 11) return `+234${digits.slice(1)}`;
  return phone;
};

export const pricePeriodLabel: Record<string, string> = {
  OUTRIGHT:  '',
  PER_YEAR:  '/yr',
  PER_MONTH: '/mo',
  PER_NIGHT: '/night',
};

export const propertyTypeLabel: Record<string, string> = {
  APARTMENT:     'Apartment',
  BUNGALOW:      'Bungalow',
  DUPLEX:        'Duplex',
  TERRACED:      'Terraced',
  SEMI_DETACHED: 'Semi-Detached',
  DETACHED:      'Detached',
  LAND:          'Land',
  COMMERCIAL:    'Commercial',
};

export const amenityEmoji: Record<string, string> = {
  BOREHOLE:     '💧',
  GENERATOR:    '⚡',
  CCTV:         '📹',
  GYM:          '💪',
  POOL:         '🏊',
  SECURITY:     '🛡️',
  PARKING:      '🚗',
  INTERNET:     '📡',
  SOLAR:        '☀️',
  BOYS_QUARTER: '🏠',
  FENCE:        '🧱',
  AIR_CONDITION:'❄️',
};

export const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
};
