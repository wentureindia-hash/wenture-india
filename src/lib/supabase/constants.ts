/**
 * Supabase Storage Buckets and Constraints Configuration
 * Wenture India International
 */

export const STORAGE_BUCKETS = {
  PUBLIC: "wenture-public",
  PRIVATE: "wenture-private",
} as const;

export const STORAGE_FOLDERS = {
  LISTINGS: "listings",
  INVESTOR_PROFILES: "investors",
  PITCH_DECKS: "pitch-decks",
  VERIFICATIONS: "verifications",
  CERTIFICATES: "certificates",
} as const;

export const STORAGE_LIMITS = {
  MAX_IMAGE_BYTES: 5 * 1024 * 1024, // 5 MB
  MAX_PITCH_DECK_BYTES: 20 * 1024 * 1024, // 20 MB
  MAX_VERIFICATION_BYTES: 15 * 1024 * 1024, // 15 MB
  SIGNED_URL_EXPIRY_SECONDS: 900, // 15 Minutes
} as const;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const ALLOWED_PITCH_DECK_MIME_TYPES = [
  "application/pdf",
];

export const ALLOWED_VERIFICATION_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

