export const APP_NAME =
  (typeof process !== 'undefined' &&
    (process.env?.NEXT_PUBLIC_APP_NAME || process.env?.APP_NAME)) ||
  'Chukta';

export const APP_DESCRIPTION =
  'Smart group expense splitter for trips, flatmates, and events with India-first UPI settlement.';

export const GROUP_TYPES = ['TRIP', 'FLATMATES', 'EVENT', 'OFFICE', 'CUSTOM'] as const;
export type GroupType = (typeof GROUP_TYPES)[number];

export const SPLIT_MODES = [
  'EQUAL',
  'EXACT',
  'PERCENTAGE',
  'SHARES',
  'ITEMIZED',
  'DAYS_STAYED'
] as const;
export type SplitMode = (typeof SPLIT_MODES)[number];

export const MEMBER_ROLES = ['ADMIN', 'MEMBER', 'VIEWER'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const PAYMENT_METHODS = ['UPI', 'CASH', 'BANK_TRANSFER', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'CONFIRMED', 'DISPUTED', 'REJECTED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DISPUTE_STATUSES = ['OPEN', 'RESOLVED', 'REJECTED'] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const NUDGE_TONES = ['FRIENDLY', 'FUNNY', 'FORMAL'] as const;
export type NudgeTone = (typeof NUDGE_TONES)[number];

export const SUPPORTED_LOCALES = [
  'en',
  'hi',
  'bn',
  'mr',
  'ta',
  'te',
  'kn',
  'ml',
  'gu',
  'pa'
] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, { name: string; native: string }> = {
  en: { name: 'English', native: 'English' },
  hi: { name: 'Hindi', native: 'हिन्दी' },
  bn: { name: 'Bengali', native: 'বাংলা' },
  mr: { name: 'Marathi', native: 'मराठी' },
  ta: { name: 'Tamil', native: 'தமிழ்' },
  te: { name: 'Telugu', native: 'తెలుగు' },
  kn: { name: 'Kannada', native: 'ಕನ್ನಡ' },
  ml: { name: 'Malayalam', native: 'മലയാളം' },
  gu: { name: 'Gujarati', native: 'ગુજરાતી' },
  pa: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ' }
};

export const DEFAULT_CATEGORIES = [
  { id: 'general', label: 'General', icon: 'Tag' },
  { id: 'food', label: 'Food & Drinks', icon: 'Utensils' },
  { id: 'travel', label: 'Travel & Transport', icon: 'Plane' },
  { id: 'rent', label: 'Rent & Maintenance', icon: 'Home' },
  { id: 'groceries', label: 'Groceries', icon: 'ShoppingCart' },
  { id: 'shopping', label: 'Shopping', icon: 'ShoppingBag' },
  { id: 'entertainment', label: 'Entertainment', icon: 'Film' },
  { id: 'utilities', label: 'Utilities & Bills', icon: 'Zap' },
  { id: 'stays', label: 'Stays & Hotels', icon: 'Bed' },
  { id: 'health', label: 'Health & Medical', icon: 'HeartPulse' }
] as const;

export const DEFAULT_CURRENCY = 'INR';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  SGD: 'S$',
  THB: '฿'
};
