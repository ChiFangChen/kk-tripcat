import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore'
import type { User, Trip, Template, TipNote, FavoriteItem } from '../types'
import type { SharedTripData, UserTripData } from '../context/AppContext'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app: FirebaseApp | null = null
let db: Firestore | null = null

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)
}

export async function initFirebase(): Promise<Firestore | null> {
  if (!isFirebaseConfigured()) return null
  if (db) return db
  try {
    app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    await signInAnonymously(auth)
    db = getFirestore(app)
    return db
  } catch (error) {
    console.error('Firebase init failed:', error)
    return null
  }
}

// --- Users (shared ccUsers collection) ---

export function subscribeToUsers(
  db: Firestore,
  callback: (users: User[]) => void
): () => void {
  return onSnapshot(collection(db, 'ccUsers'), (snapshot) => {
    const users = snapshot.docs.map((doc) => doc.data() as User)
    users.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    callback(users)
  })
}

export async function syncUser(db: Firestore, user: User): Promise<void> {
  await setDoc(doc(db, 'ccUsers', user.id), user)
}

export async function findUserByUsername(db: Firestore, username: string): Promise<User | null> {
  const q = query(collection(db, 'ccUsers'), where('username', '==', username))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  return snapshot.docs[0].data() as User
}

// --- Trips ---

export function subscribeToTrips(
  db: Firestore,
  callback: (trips: Trip[]) => void
): () => void {
  return onSnapshot(collection(db, 'tcTrips'), (snapshot) => {
    const trips = snapshot.docs.map((doc) => doc.data() as Trip)
    trips.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    callback(trips)
  })
}

export async function syncTrip(db: Firestore, trip: Trip): Promise<void> {
  await setDoc(doc(db, 'tcTrips', trip.id), trip, { merge: true })
}

export async function syncTripPartial(db: Firestore, tripId: string, fields: Record<string, any>): Promise<void> {
  await updateDoc(doc(db, 'tcTrips', tripId), fields)
}

export async function deleteTripFromFirestore(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'tcTrips', id))
}

// --- Shared trip data (schedule, flights, hotels, transport, scheduleNotes) ---

export function subscribeToSharedTripData(
  db: Firestore,
  tripId: string,
  callback: (data: SharedTripData) => void
): () => void {
  return onSnapshot(doc(db, 'tcTripShared', tripId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as SharedTripData)
    } else {
      callback({ schedule: [], scheduleNotes: [], flights: [], hotels: [], transport: [] })
    }
  })
}

export async function syncSharedTripData(db: Firestore, tripId: string, data: SharedTripData): Promise<void> {
  await setDoc(doc(db, 'tcTripShared', tripId), data)
}

export async function deleteSharedTripData(db: Firestore, tripId: string): Promise<void> {
  await deleteDoc(doc(db, 'tcTripShared', tripId))
}

// --- Per-user trip data (checklist, shopping, preparationNotes) ---

function userTripDocId(tripId: string, userId: string) {
  return `${tripId}_${userId}`
}

export function subscribeToUserTripData(
  db: Firestore,
  tripId: string,
  userId: string,
  callback: (data: UserTripData) => void
): () => void {
  const docRef = doc(db, 'tcTripUser', userTripDocId(tripId, userId))
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as UserTripData
      // Migrate old data: add setupComplete if user already has checklist data
      if (!data.setupComplete && data.checklist?.length > 0) {
        const migrated = { ...data, setupComplete: true }
        setDoc(docRef, migrated)
        callback(migrated)
      } else {
        callback(data)
      }
    } else {
      callback({ checklist: [], shopping: [], preparationNotes: '' })
    }
  })
}

export async function syncUserTripData(db: Firestore, tripId: string, userId: string, data: UserTripData): Promise<void> {
  await setDoc(doc(db, 'tcTripUser', userTripDocId(tripId, userId)), data)
}

export async function deleteUserTripData(db: Firestore, tripId: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, 'tcTripUser', userTripDocId(tripId, userId)))
}

// --- Templates ---

export function subscribeToTemplate(
  db: Firestore,
  userId: string,
  callback: (template: Template | null) => void
): () => void {
  return onSnapshot(doc(db, 'tcTemplates', userId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as Template)
    } else {
      callback(null)
    }
  })
}

export async function syncTemplate(db: Firestore, userId: string, template: Template): Promise<void> {
  await setDoc(doc(db, 'tcTemplates', userId), template)
}

// --- Tips per user ---

export function subscribeToTips(
  db: Firestore,
  userId: string,
  callback: (tips: TipNote[]) => void
): () => void {
  return onSnapshot(doc(db, 'tcTips', userId), (snapshot) => {
    if (snapshot.exists()) {
      callback((snapshot.data() as { tips: TipNote[] }).tips || [])
    } else {
      callback([])
    }
  })
}

export async function syncTips(db: Firestore, userId: string, tips: TipNote[]): Promise<void> {
  await setDoc(doc(db, 'tcTips', userId), { tips })
}

// --- Favorites per user ---

export function subscribeToFavorites(
  db: Firestore,
  userId: string,
  callback: (favorites: FavoriteItem[]) => void
): () => void {
  return onSnapshot(doc(db, 'tcFavorites', userId), (snapshot) => {
    if (snapshot.exists()) {
      callback((snapshot.data() as { favorites: FavoriteItem[] }).favorites || [])
    } else {
      callback([])
    }
  })
}

export async function syncFavorites(db: Firestore, userId: string, favorites: FavoriteItem[]): Promise<void> {
  await setDoc(doc(db, 'tcFavorites', userId), { favorites })
}

// --- Image Storage ---

export async function uploadImage(path: string, file: Blob): Promise<string> {
  if (!app) throw new Error('Firebase not initialized')
  const storage = getStorage(app)
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function deleteImage(path: string): Promise<void> {
  if (!app) throw new Error('Firebase not initialized')
  const storage = getStorage(app)
  const storageRef = ref(storage, path)
  try {
    await deleteObject(storageRef)
  } catch {
    // ignore if not found
  }
}
