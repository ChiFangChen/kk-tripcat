import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  type Firestore,
} from "firebase/firestore";
import type { User, Trip, Template, TipNote, FavoriteItem } from "../types";
import type { SharedTripData, UserTripData } from "../context/AppContext";

export interface DatedTripDoc {
  updatedAt?: string;
  appVersion?: number;
}

export interface SharedTripSnapshot {
  data: SharedTripData;
  updatedAt?: string;
  appVersion?: number;
}

export interface UserTripSnapshot {
  data: UserTripData;
  updatedAt?: string;
  appVersion?: number;
}

export interface TipsSnapshot {
  tips: TipNote[];
  updatedAt?: string;
}

export interface FavoritesSnapshot {
  favorites: FavoriteItem[];
  updatedAt?: string;
}

export const APP_WRITE_VERSION = 2026041602;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function normalizeSharedTripData(
  data: Partial<SharedTripData> | undefined,
): SharedTripData {
  return {
    schedule: data?.schedule || [],
    scheduleNotes: data?.scheduleNotes || [],
    flights: data?.flights || [],
    hotels: data?.hotels || [],
    transport: data?.transport || [],
  };
}

export function normalizeUserTripData(
  data: Partial<UserTripData> | undefined,
): UserTripData {
  return {
    checklist: data?.checklist || [],
    shopping: data?.shopping || [],
    preparationNotes: data?.preparationNotes || "",
    setupComplete: data?.setupComplete,
    skipPreparation: data?.skipPreparation ?? false,
    gotReady: data?.gotReady ?? false,
  };
}

function getDocUpdatedAt(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const updatedAt = (data as DatedTripDoc).updatedAt;
  return typeof updatedAt === "string" ? updatedAt : undefined;
}

function getDocAppVersion(data: unknown): number | undefined {
  if (!data || typeof data !== "object") return undefined;
  const appVersion = (data as DatedTripDoc).appVersion;
  return typeof appVersion === "number" ? appVersion : undefined;
}

export function shouldApplyIncomingSnapshot(
  currentUpdatedAt?: string,
  incomingUpdatedAt?: string,
): boolean {
  if (!currentUpdatedAt) return true;
  if (!incomingUpdatedAt) return false;
  return incomingUpdatedAt >= currentUpdatedAt;
}

export function isClientVersionOutdated(incomingAppVersion?: number): boolean {
  if (!incomingAppVersion) return false;
  return incomingAppVersion > APP_WRITE_VERSION;
}

export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(
      ([, entryValue]) => entryValue !== undefined,
    );
    return Object.fromEntries(
      entries.map(([key, entryValue]) => [key, stripUndefinedDeep(entryValue)]),
    ) as T;
  }

  return value;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export async function initFirebase(): Promise<Firestore | null> {
  if (!isFirebaseConfigured()) return null;
  if (db) return db;
  try {
    app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    await signInAnonymously(auth);
    db = getFirestore(app);
    return db;
  } catch (error) {
    console.error("Firebase init failed:", error);
    return null;
  }
}

// --- Users (shared ccUsers collection) ---

export function subscribeToUsers(
  db: Firestore,
  callback: (users: User[]) => void,
): () => void {
  return onSnapshot(collection(db, "ccUsers"), (snapshot) => {
    const users = snapshot.docs.map((doc) => doc.data() as User);
    users.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    callback(users);
  });
}

export async function syncUser(db: Firestore, user: User): Promise<void> {
  await setDoc(doc(db, "ccUsers", user.id), user);
}

export async function findUserByUsername(
  db: Firestore,
  username: string,
): Promise<User | null> {
  const q = query(collection(db, "ccUsers"), where("username", "==", username));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as User;
}

// --- Trips ---

export function subscribeToTrips(
  db: Firestore,
  callback: (trips: Trip[]) => void,
): () => void {
  return onSnapshot(collection(db, "tcTrips"), (snapshot) => {
    const trips = snapshot.docs.map((doc) => doc.data() as Trip);
    trips.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    callback(trips);
  });
}

export async function syncTrip(db: Firestore, trip: Trip): Promise<void> {
  await setDoc(doc(db, "tcTrips", trip.id), trip, { merge: true });
}

export async function syncTripPartial(
  db: Firestore,
  tripId: string,
  fields: Partial<Trip>,
): Promise<void> {
  await updateDoc(doc(db, "tcTrips", tripId), fields);
}

export async function deleteTripFromFirestore(
  db: Firestore,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, "tcTrips", id));
}

// --- Shared trip data (schedule, flights, hotels, transport, scheduleNotes) ---

export function subscribeToSharedTripData(
  db: Firestore,
  tripId: string,
  callback: (snapshot: SharedTripSnapshot) => void,
): () => void {
  return onSnapshot(doc(db, "tcTripShared", tripId), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as Partial<SharedTripData> & DatedTripDoc;
      callback({
        data: normalizeSharedTripData(data),
        updatedAt: getDocUpdatedAt(data),
        appVersion: getDocAppVersion(data),
      });
    } else {
      callback({
        data: normalizeSharedTripData(undefined),
      });
    }
  });
}

export async function syncSharedTripData(
  db: Firestore,
  tripId: string,
  data: Partial<SharedTripData>,
  updatedAt: string,
): Promise<void> {
  const cleaned = stripUndefinedDeep(data);
  await setDoc(
    doc(db, "tcTripShared", tripId),
    { ...cleaned, updatedAt, appVersion: APP_WRITE_VERSION },
    {
      merge: true,
    },
  );
}

export async function deleteSharedTripData(
  db: Firestore,
  tripId: string,
): Promise<void> {
  await deleteDoc(doc(db, "tcTripShared", tripId));
}

// --- Per-user trip data (checklist, shopping, preparationNotes) ---

function userTripDocId(tripId: string, userId: string) {
  return `${tripId}_${userId}`;
}

export function subscribeToUserTripData(
  db: Firestore,
  tripId: string,
  userId: string,
  callback: (snapshot: UserTripSnapshot) => void,
): () => void {
  const docRef = doc(db, "tcTripUser", userTripDocId(tripId, userId));
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as Partial<UserTripData> & DatedTripDoc;
      const normalized = normalizeUserTripData(data);
      const updatedAt = getDocUpdatedAt(data);
      // Migrate old data: add setupComplete if user already has checklist data
      // and initialize skipPreparation for older documents.
      if (
        (!normalized.setupComplete && normalized.checklist.length > 0) ||
        data.skipPreparation === undefined ||
        data.gotReady === undefined
      ) {
        const migrated = {
          ...normalized,
          setupComplete:
            normalized.setupComplete || normalized.checklist.length > 0,
          skipPreparation: normalized.skipPreparation ?? false,
          gotReady: normalized.gotReady ?? false,
          updatedAt: updatedAt ?? new Date().toISOString(),
        };
        setDoc(docRef, migrated, { merge: true });
        callback({
          data: normalizeUserTripData(migrated),
          updatedAt: migrated.updatedAt,
          appVersion: APP_WRITE_VERSION,
        });
      } else {
        callback({
          data: normalized,
          updatedAt,
          appVersion: getDocAppVersion(data),
        });
      }
    } else {
      callback({
        data: normalizeUserTripData(undefined),
      });
    }
  });
}

export async function syncUserTripData(
  db: Firestore,
  tripId: string,
  userId: string,
  data: Partial<UserTripData>,
  updatedAt: string,
): Promise<void> {
  const cleaned = stripUndefinedDeep(data);
  await setDoc(
    doc(db, "tcTripUser", userTripDocId(tripId, userId)),
    { ...cleaned, updatedAt, appVersion: APP_WRITE_VERSION },
    {
      merge: true,
    },
  );
}

export async function deleteUserTripData(
  db: Firestore,
  tripId: string,
  userId: string,
): Promise<void> {
  await deleteDoc(doc(db, "tcTripUser", userTripDocId(tripId, userId)));
}

// --- Templates ---

export function subscribeToTemplate(
  db: Firestore,
  userId: string,
  callback: (template: Template | null) => void,
): () => void {
  return onSnapshot(doc(db, "tcTemplates", userId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as Template);
    } else {
      callback(null);
    }
  });
}

export async function syncTemplate(
  db: Firestore,
  userId: string,
  template: Template,
): Promise<void> {
  await setDoc(doc(db, "tcTemplates", userId), template);
}

// --- Tips per user ---

export function subscribeToTips(
  db: Firestore,
  userId: string,
  callback: (snapshot: TipsSnapshot) => void,
): () => void {
  return onSnapshot(doc(db, "tcTips", userId), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as { tips?: TipNote[]; updatedAt?: string };
      callback({
        tips: data.tips || [],
        updatedAt: getDocUpdatedAt(data),
      });
    } else {
      callback({ tips: [] });
    }
  });
}

export async function syncTips(
  db: Firestore,
  userId: string,
  tips: TipNote[],
  updatedAt: string,
): Promise<void> {
  await setDoc(doc(db, "tcTips", userId), { tips, updatedAt });
}

// --- Favorites per user ---

export function subscribeToFavorites(
  db: Firestore,
  userId: string,
  callback: (snapshot: FavoritesSnapshot) => void,
): () => void {
  return onSnapshot(doc(db, "tcFavorites", userId), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as {
        favorites?: FavoriteItem[];
        updatedAt?: string;
      };
      callback({
        favorites: data.favorites || [],
        updatedAt: getDocUpdatedAt(data),
      });
    } else {
      callback({ favorites: [] });
    }
  });
}

export async function syncFavorites(
  db: Firestore,
  userId: string,
  favorites: FavoriteItem[],
  updatedAt: string,
): Promise<void> {
  await setDoc(doc(db, "tcFavorites", userId), { favorites, updatedAt });
}

// --- Image Storage ---

export async function uploadImage(path: string, file: Blob): Promise<string> {
  if (!app) {
    await initFirebase();
  }
  if (!app) throw new Error("Firebase not initialized");
  const storage = getStorage(app);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteImage(path: string): Promise<void> {
  if (!app) {
    await initFirebase();
  }
  if (!app) throw new Error("Firebase not initialized");
  const storage = getStorage(app);
  const storageRef = ref(storage, path);
  try {
    await deleteObject(storageRef);
  } catch {
    // ignore if not found
  }
}
