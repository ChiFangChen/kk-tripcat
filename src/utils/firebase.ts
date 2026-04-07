import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, type Unsubscribe } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

const googleProvider = new GoogleAuthProvider()

export async function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider)
}

export async function logout() {
  return signOut(auth)
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

function userCollection(userId: string, name: string) {
  return collection(db, 'users', userId, name)
}

export async function loadCollection<T>(userId: string, name: string): Promise<T[]> {
  const snap = await getDocs(userCollection(userId, name))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as T)
}

export async function saveDoc(userId: string, collectionName: string, id: string, data: Record<string, unknown>) {
  await setDoc(doc(db, 'users', userId, collectionName, id), data)
}

export async function deleteDocument(userId: string, collectionName: string, id: string) {
  await deleteDoc(doc(db, 'users', userId, collectionName, id))
}

export function subscribeCollection(userId: string, name: string, callback: (docs: Record<string, unknown>[]) => void): Unsubscribe {
  return onSnapshot(query(userCollection(userId, name)), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}
