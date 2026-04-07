import { createContext, useContext, useReducer, useEffect, useRef, useCallback, type ReactNode } from 'react'
import type { User, Trip, Template, TipNote, FavoriteItem, ChecklistItem, FlightInfo, Hotel, ScheduleDay, ScheduleNote, TransportItem, ShoppingItem } from '../types'
import { USER_COLORS } from '../types'
import * as storage from '../utils/storage'
import { generateId } from '../utils/id'
import {
  initFirebase,
  isFirebaseConfigured,
  subscribeToUsers,
  subscribeToTrips,
  subscribeToSharedTripData,
  subscribeToUserTripData,
  subscribeToTemplate,
  syncUser,
  syncTrip,
  deleteTripFromFirestore,
  syncSharedTripData,
  deleteSharedTripData,
  syncUserTripData,
  deleteUserTripData,
  syncTemplate,
} from '../utils/firebase'
import { defaultTemplate } from '../data/seed'
import type { Firestore } from 'firebase/firestore'

// Shared data (visible to all trip members)
export interface SharedTripData {
  schedule: ScheduleDay[]
  scheduleNotes: ScheduleNote[]
  flights: FlightInfo[]
  hotels: Hotel[]
  transport: TransportItem[]
}

// Per-user data (private to each user)
export interface UserTripData {
  checklist: ChecklistItem[]
  shopping: ShoppingItem[]
  preparationNotes: string
}

// Combined for backward compat
export interface TripData extends SharedTripData, UserTripData {}

interface AppState {
  auth: { currentUser: User | null }
  users: User[]
  trips: Trip[]
  template: Template
  tips: TipNote[]
  favorites: FavoriteItem[]
  sharedTripData: Record<string, SharedTripData>
  userTripData: Record<string, UserTripData>  // keyed by tripId
}

type Action =
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_USERS'; users: User[] }
  | { type: 'ADD_USER'; user: User }
  | { type: 'UPDATE_USER'; user: User }
  | { type: 'SET_TRIPS'; trips: Trip[] }
  | { type: 'ADD_TRIP'; trip: Trip }
  | { type: 'UPDATE_TRIP'; trip: Trip }
  | { type: 'DELETE_TRIP'; tripId: string }
  | { type: 'SET_SHARED_TRIP_DATA'; tripId: string; data: SharedTripData }
  | { type: 'UPDATE_SHARED_TRIP_DATA'; tripId: string; data: Partial<SharedTripData> }
  | { type: 'SET_USER_TRIP_DATA'; tripId: string; data: UserTripData }
  | { type: 'UPDATE_USER_TRIP_DATA'; tripId: string; data: Partial<UserTripData> }
  | { type: 'SET_TEMPLATE'; template: Template }
  | { type: 'ADD_TIP'; tip: TipNote }
  | { type: 'UPDATE_TIP'; tip: TipNote }
  | { type: 'DELETE_TIP'; tipId: string }
  | { type: 'SET_FAVORITES'; favorites: FavoriteItem[] }
  | { type: 'ADD_FAVORITE'; favorite: FavoriteItem }
  | { type: 'UPDATE_FAVORITE'; favorite: FavoriteItem }
  | { type: 'DELETE_FAVORITE'; favoriteId: string }

const emptyShared: SharedTripData = { schedule: [], scheduleNotes: [], flights: [], hotels: [], transport: [] }
const emptyUser: UserTripData = { checklist: [], shopping: [], preparationNotes: '' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, auth: { currentUser: action.user } }
    case 'LOGOUT':
      return { ...state, auth: { currentUser: null } }
    case 'SET_USERS': {
      const users = action.users.map((u, i) =>
        u.color ? u : { ...u, color: USER_COLORS[i % USER_COLORS.length] }
      )
      return { ...state, users }
    }
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.user] }
    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(u => u.id === action.user.id ? action.user : u),
        auth: state.auth.currentUser?.id === action.user.id
          ? { currentUser: action.user }
          : state.auth,
      }
    case 'SET_TRIPS':
      return { ...state, trips: action.trips }
    case 'ADD_TRIP':
      return { ...state, trips: [action.trip, ...state.trips] }
    case 'UPDATE_TRIP':
      return { ...state, trips: state.trips.map(t => t.id === action.trip.id ? action.trip : t) }
    case 'DELETE_TRIP': {
      const { [action.tripId]: _s, ...restShared } = state.sharedTripData
      const { [action.tripId]: _u, ...restUser } = state.userTripData
      void _s; void _u
      return {
        ...state,
        trips: state.trips.filter(t => t.id !== action.tripId),
        sharedTripData: restShared,
        userTripData: restUser,
      }
    }
    case 'SET_SHARED_TRIP_DATA':
      return { ...state, sharedTripData: { ...state.sharedTripData, [action.tripId]: action.data } }
    case 'UPDATE_SHARED_TRIP_DATA':
      return {
        ...state,
        sharedTripData: {
          ...state.sharedTripData,
          [action.tripId]: { ...(state.sharedTripData[action.tripId] || emptyShared), ...action.data },
        },
      }
    case 'SET_USER_TRIP_DATA':
      return { ...state, userTripData: { ...state.userTripData, [action.tripId]: action.data } }
    case 'UPDATE_USER_TRIP_DATA':
      return {
        ...state,
        userTripData: {
          ...state.userTripData,
          [action.tripId]: { ...(state.userTripData[action.tripId] || emptyUser), ...action.data },
        },
      }
    case 'SET_TEMPLATE':
      return { ...state, template: action.template }
    case 'ADD_TIP':
      return { ...state, tips: [action.tip, ...state.tips] }
    case 'UPDATE_TIP':
      return { ...state, tips: state.tips.map(t => t.id === action.tip.id ? action.tip : t) }
    case 'DELETE_TIP':
      return { ...state, tips: state.tips.filter(t => t.id !== action.tipId) }
    case 'SET_FAVORITES':
      return { ...state, favorites: action.favorites }
    case 'ADD_FAVORITE':
      return { ...state, favorites: [action.favorite, ...state.favorites] }
    case 'UPDATE_FAVORITE':
      return { ...state, favorites: state.favorites.map(f => f.id === action.favorite.id ? action.favorite : f) }
    case 'DELETE_FAVORITE':
      return { ...state, favorites: state.favorites.filter(f => f.id !== action.favoriteId) }
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<Action>
  login: (user: User) => void
  logout: () => void
  register: (username: string, password: string, displayName: string) => Promise<User>
  updateUser: (user: User) => void
  getTripData: (tripId: string) => TripData
  setSharedTripData: (tripId: string, data: Partial<SharedTripData>) => void
  setUserTripData: (tripId: string, data: Partial<UserTripData>) => void
  getUserName: (userId: string) => string
  getUserColor: (userId: string) => string
  isCurrentUserAdmin: () => boolean
  isTripAdmin: (trip: Trip) => boolean
}

const AppContext = createContext<AppContextType | null>(null)

function loadInitialState(): AppState {
  const currentUser = storage.loadAuth()
  const trips = storage.getItem<Trip[]>('trips') || []
  const template = storage.getItem<Template>('template') || defaultTemplate
  const tips = storage.getItem<TipNote[]>('tips') || []
  const favorites = storage.getItem<FavoriteItem[]>('favorites') || []
  const users = storage.getItem<User[]>('users') || []

  // Migrate old tripData format to split format
  const oldTripData = storage.getItem<Record<string, Record<string, unknown>>>('tripData')
  let sharedTripData = storage.getItem<Record<string, SharedTripData>>('sharedTripData') || {}
  let userTripData = storage.getItem<Record<string, UserTripData>>('userTripData') || {}

  if (oldTripData && Object.keys(sharedTripData).length === 0) {
    for (const [tripId, data] of Object.entries(oldTripData)) {
      sharedTripData[tripId] = {
        schedule: (data.schedule as ScheduleDay[]) || [],
        scheduleNotes: (data.scheduleNotes as ScheduleNote[]) || [],
        flights: (data.flights as FlightInfo[]) || [],
        hotels: (data.hotels as Hotel[]) || [],
        transport: (data.transport as TransportItem[]) || [],
      }
      userTripData[tripId] = {
        checklist: (data.checklist as ChecklistItem[]) || [],
        shopping: (data.shopping as ShoppingItem[]) || [],
        preparationNotes: (data.preparationNotes as string) || '',
      }
    }
  }

  return { auth: { currentUser }, users, trips, template, tips, favorites, sharedTripData, userTripData }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadInitialState)
  const dbRef = useRef<Firestore | null>(null)
  const firebaseListeningRef = useRef(false)
  const tripSubsRef = useRef<Record<string, () => void>>({})
  const skipFirstSave = useRef(true)

  // Initialize Firebase
  useEffect(() => {
    if (isFirebaseConfigured() && !firebaseListeningRef.current) {
      let cleanups: (() => void)[] = []
      initFirebase().then((db) => {
        dbRef.current = db
        if (db) {
          firebaseListeningRef.current = true
          const unsub1 = subscribeToUsers(db, (users) => dispatch({ type: 'SET_USERS', users }))
          const unsub2 = subscribeToTrips(db, (trips) => dispatch({ type: 'SET_TRIPS', trips }))
          cleanups = [unsub1, unsub2]
        }
      })
      return () => {
        cleanups.forEach(fn => fn())
        firebaseListeningRef.current = false
      }
    }
  }, [])

  // Subscribe to template when user logs in
  useEffect(() => {
    if (!state.auth.currentUser || !dbRef.current) return
    const unsub = subscribeToTemplate(dbRef.current, state.auth.currentUser.id, (template) => {
      if (template) dispatch({ type: 'SET_TEMPLATE', template })
    })
    return unsub
  }, [state.auth.currentUser?.id])

  // Subscribe to trip data for trips user is a member of
  useEffect(() => {
    const db = dbRef.current
    const userId = state.auth.currentUser?.id
    if (!db || !userId) return

    const currentTripIds = new Set(state.trips.filter(t => t.members.includes(userId)).map(t => t.id))

    // Unsubscribe from trips user is no longer a member of
    for (const [tripId, unsub] of Object.entries(tripSubsRef.current)) {
      if (!currentTripIds.has(tripId)) {
        unsub()
        delete tripSubsRef.current[tripId]
      }
    }

    // Subscribe to new trips
    for (const tripId of currentTripIds) {
      if (!tripSubsRef.current[tripId]) {
        const unsub1 = subscribeToSharedTripData(db, tripId, (data) => {
          dispatch({ type: 'SET_SHARED_TRIP_DATA', tripId, data })
        })
        const unsub2 = subscribeToUserTripData(db, tripId, userId, (data) => {
          dispatch({ type: 'SET_USER_TRIP_DATA', tripId, data })
        })
        tripSubsRef.current[tripId] = () => { unsub1(); unsub2() }
      }
    }

    return () => {
      Object.values(tripSubsRef.current).forEach(fn => fn())
      tripSubsRef.current = {}
    }
  }, [state.trips, state.auth.currentUser?.id])

  // Save to localStorage
  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false
      return
    }
    storage.setItem('users', state.users)
    storage.setItem('trips', state.trips)
    storage.setItem('template', state.template)
    storage.setItem('tips', state.tips)
    storage.setItem('favorites', state.favorites)
    storage.setItem('sharedTripData', state.sharedTripData)
    storage.setItem('userTripData', state.userTripData)
  }, [state.users, state.trips, state.template, state.tips, state.favorites, state.sharedTripData, state.userTripData])

  const login = useCallback((user: User) => {
    dispatch({ type: 'LOGIN', user })
    storage.saveAuth(user)
  }, [])

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' })
    storage.saveAuth(null)
  }, [])

  const register = useCallback(async (username: string, password: string, displayName: string): Promise<User> => {
    const isFirstUser = state.users.length === 0
    const usedColors = state.users.map(u => u.color)
    const available = USER_COLORS.filter(c => !usedColors.includes(c))
    const colorPool = available.length > 0 ? available : USER_COLORS
    const color = colorPool[Math.floor(Math.random() * colorPool.length)]
    const user: User = {
      id: generateId(),
      username,
      password,
      displayName,
      color,
      isAdmin: isFirstUser,
      createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_USER', user })
    if (dbRef.current) await syncUser(dbRef.current, user)
    return user
  }, [state.users])

  const updateUser = useCallback((user: User) => {
    dispatch({ type: 'UPDATE_USER', user })
    if (user.id === state.auth.currentUser?.id) storage.saveAuth(user)
    if (dbRef.current) syncUser(dbRef.current, user)
  }, [state.auth.currentUser])

  function getTripData(tripId: string): TripData {
    const shared = state.sharedTripData[tripId] || emptyShared
    const user = state.userTripData[tripId] || emptyUser
    return { ...shared, ...user }
  }

  function setSharedTripData(tripId: string, data: Partial<SharedTripData>) {
    dispatch({ type: 'UPDATE_SHARED_TRIP_DATA', tripId, data })
    if (dbRef.current) {
      const current = state.sharedTripData[tripId] || emptyShared
      syncSharedTripData(dbRef.current, tripId, { ...current, ...data })
    }
  }

  function setUserTripData(tripId: string, data: Partial<UserTripData>) {
    dispatch({ type: 'UPDATE_USER_TRIP_DATA', tripId, data })
    if (dbRef.current && state.auth.currentUser) {
      const current = state.userTripData[tripId] || emptyUser
      syncUserTripData(dbRef.current, tripId, state.auth.currentUser.id, { ...current, ...data })
    }
  }

  const getUserName = useCallback((userId: string): string => {
    return state.users.find(u => u.id === userId)?.displayName || '未知'
  }, [state.users])

  const getUserColor = useCallback((userId: string): string => {
    return state.users.find(u => u.id === userId)?.color || '#888'
  }, [state.users])

  const isCurrentUserAdmin = useCallback((): boolean => {
    const user = state.auth.currentUser
    if (!user) return false
    return !!user.isAdmin
  }, [state.auth.currentUser])

  const isTripAdmin = useCallback((trip: Trip): boolean => {
    const user = state.auth.currentUser
    if (!user) return false
    return trip.creatorId === user.id || !!user.isAdmin
  }, [state.auth.currentUser])

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      login,
      logout,
      register,
      updateUser,
      getTripData,
      setSharedTripData,
      setUserTripData,
      getUserName,
      getUserColor,
      isCurrentUserAdmin,
      isTripAdmin,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
