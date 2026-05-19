export const FIREBASE_STORAGE_IMAGE_CACHE_NAME =
  "firebase-storage-images-v1";
export const FIREBASE_STORAGE_IMAGE_CACHE_MAX_ENTRIES = 200;
export const FIREBASE_STORAGE_IMAGE_CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const FIREBASE_STORAGE_IMAGE_URL_PATTERN =
  /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/.+/;

export function isFirebaseStorageImageUrl(url: string): boolean {
  return FIREBASE_STORAGE_IMAGE_URL_PATTERN.test(url);
}
