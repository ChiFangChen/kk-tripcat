export const FIREBASE_STORAGE_IMAGE_CACHE_NAME =
  "firebase-storage-images-v1";
export const FIREBASE_STORAGE_IMAGE_CACHE_MAX_ENTRIES = 200;
export const FIREBASE_STORAGE_IMAGE_CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function isFirebaseStorageImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.protocol === "https:" &&
      parsedUrl.hostname === "firebasestorage.googleapis.com" &&
      parsedUrl.pathname.startsWith("/v0/b/") &&
      parsedUrl.pathname.includes("/o/")
    );
  } catch {
    return false;
  }
}
