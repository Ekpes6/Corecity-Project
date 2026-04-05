// ─── Naira formatter ─────────────────────────────────────────
export const formatNaira = (amount, compact = false) => {
  if (amount == null) return '₦0';
  const num = Number(amount);
  if (compact) {
    if (num >= 1_000_000_000) return `₦${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000)     return `₦${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000)         return `₦${(num / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(num);
};

export const formatPricePeriod = (price, period, listingType) => {
  const p = formatNaira(price);
  if (!period || period === 'OUTRIGHT') return p;
  const labels = { PER_YEAR: '/yr', PER_MONTH: '/mo', PER_NIGHT: '/night' };
  return `${p}${labels[period] || ''}`;
};

// ─── Listing type badge ───────────────────────────────────────
export const listingLabel = (type) => {
  const map = { FOR_SALE: 'For Sale', FOR_RENT: 'For Rent', SHORT_LET: 'Short Let' };
  return map[type] || type;
};

export const listingBadgeClass = (type) => {
  const map = { FOR_SALE: 'badge-sale', FOR_RENT: 'badge-rent', SHORT_LET: 'badge-shortlet' };
  return `badge ${map[type] || 'badge-sale'}`;
};

// ─── Property type label ──────────────────────────────────────
export const propertyTypeLabel = (type) => {
  const map = {
    APARTMENT: 'Apartment', BUNGALOW: 'Bungalow', DUPLEX: 'Duplex',
    TERRACED: 'Terraced', SEMI_DETACHED: 'Semi-Detached', DETACHED: 'Detached House',
    LAND: 'Land', COMMERCIAL: 'Commercial',
  };
  return map[type] || type;
};

// ─── Nigerian amenities ───────────────────────────────────────
export const AMENITY_LABELS = {
  BOREHOLE: '💧 Borehole', GENERATOR: '⚡ Generator', PREPAID_METER: '🔌 Prepaid Meter',
  CCTV: '📷 CCTV', SECURITY: '👮 Security', GATED: '🚪 Gated Estate',
  SWIMMING_POOL: '🏊 Swimming Pool', GYM: '🏋️ Gym', PARKING: '🚗 Parking',
  BOYS_QUARTERS: '🏠 BQ', POP_CEILING: '✨ POP Ceiling', TILED_FLOOR: '🪨 Tiled Floor',
  INTERNET: '📶 Fibre Internet', AC: '❄️ Air Conditioning', KITCHEN_CABINET: '🪵 Kitchen Cabinet',
  WARDROBE: '👔 Wardrobe', BALCONY: '🌿 Balcony',
};

export const ALL_AMENITIES = Object.keys(AMENITY_LABELS);

// ─── Nigerian property types ──────────────────────────────────
export const PROPERTY_TYPES = [
  { value: 'APARTMENT',     label: 'Apartment' },
  { value: 'BUNGALOW',      label: 'Bungalow' },
  { value: 'DUPLEX',        label: 'Duplex' },
  { value: 'TERRACED',      label: 'Terraced' },
  { value: 'SEMI_DETACHED', label: 'Semi-Detached' },
  { value: 'DETACHED',      label: 'Detached House' },
  { value: 'LAND',          label: 'Land' },
  { value: 'COMMERCIAL',    label: 'Commercial' },
];

export const LISTING_TYPES = [
  { value: 'FOR_SALE', label: 'For Sale' },
  { value: 'FOR_RENT', label: 'For Rent' },
  { value: 'SHORT_LET', label: 'Short Let' },
];

export const PRICE_PERIODS = [
  { value: 'OUTRIGHT',  label: 'Outright' },
  { value: 'PER_YEAR',  label: 'Per Year' },
  { value: 'PER_MONTH', label: 'Per Month' },
  { value: 'PER_NIGHT', label: 'Per Night' },
];

export const BEDROOM_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 1,  label: '1 Bed' },
  { value: 2,  label: '2 Beds' },
  { value: 3,  label: '3 Beds' },
  { value: 4,  label: '4 Beds' },
  { value: 5,  label: '5+ Beds' },
];

// ─── Phone validator ──────────────────────────────────────────
export const isValidNigerianPhone = (phone) =>
  /^\+234[0-9]{10}$/.test(phone);

export const normalizePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234')) return '+' + digits;
  if (digits.startsWith('0'))   return '+234' + digits.slice(1);
  return '+234' + digits;
};

// ─── Date ─────────────────────────────────────────────────────
export const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
};
