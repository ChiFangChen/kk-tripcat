import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react'
import type { Trip, Template, TipNote, FavoriteItem, ChecklistItem, FlightInfo, Hotel, ScheduleDay, ScheduleNote, TransportItem, ShoppingItem } from '../types'
import * as storage from '../utils/storage'
import { seedTrip, seedChecklist, seedFlights, seedHotels, seedSchedule, seedScheduleNotes, seedTransport, seedPreparationNotes, defaultTemplate } from '../data/seed'

export interface TripData {
  checklist: ChecklistItem[]
  preparationNotes: string
  flights: FlightInfo[]
  hotels: Hotel[]
  schedule: ScheduleDay[]
  scheduleNotes: ScheduleNote[]
  transport: TransportItem[]
  shopping: ShoppingItem[]
}

interface AppState {
  trips: Trip[]
  template: Template
  tips: TipNote[]
  favorites: FavoriteItem[]
  tripData: Record<string, TripData>
  userId: string | null
}

type Action =
  | { type: 'SET_USER'; userId: string | null }
  | { type: 'LOAD_STATE'; state: Partial<AppState> }
  | { type: 'ADD_TRIP'; trip: Trip }
  | { type: 'UPDATE_TRIP'; trip: Trip }
  | { type: 'DELETE_TRIP'; tripId: string }
  | { type: 'SET_TRIP_DATA'; tripId: string; data: Partial<TripData> }
  | { type: 'SET_TEMPLATE'; template: Template }
  | { type: 'ADD_TIP'; tip: TipNote }
  | { type: 'UPDATE_TIP'; tip: TipNote }
  | { type: 'DELETE_TIP'; tipId: string }
  | { type: 'SET_FAVORITES'; favorites: FavoriteItem[] }
  | { type: 'ADD_FAVORITE'; favorite: FavoriteItem }
  | { type: 'UPDATE_FAVORITE'; favorite: FavoriteItem }
  | { type: 'DELETE_FAVORITE'; favoriteId: string }

const initialTripData: TripData = {
  checklist: [],
  preparationNotes: '',
  flights: [],
  hotels: [],
  schedule: [],
  scheduleNotes: [],
  transport: [],
  shopping: [],
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, userId: action.userId }
    case 'LOAD_STATE':
      return { ...state, ...action.state }
    case 'ADD_TRIP':
      return { ...state, trips: [action.trip, ...state.trips] }
    case 'UPDATE_TRIP':
      return { ...state, trips: state.trips.map(t => t.id === action.trip.id ? action.trip : t) }
    case 'DELETE_TRIP': {
      const { [action.tripId]: _, ...restData } = state.tripData
      void _
      return { ...state, trips: state.trips.filter(t => t.id !== action.tripId), tripData: restData }
    }
    case 'SET_TRIP_DATA':
      return {
        ...state,
        tripData: {
          ...state.tripData,
          [action.tripId]: { ...(state.tripData[action.tripId] || initialTripData), ...action.data },
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
  getTripData: (tripId: string) => TripData
}

const AppContext = createContext<AppContextType | null>(null)

function loadInitialState(): AppState {
  const seeded = storage.getItem<boolean>('seeded-v4')
  let trips = storage.getItem<Trip[]>('trips') || []
  const template = storage.getItem<Template>('template') || defaultTemplate
  const tips = storage.getItem<TipNote[]>('tips') || []
  const favorites = storage.getItem<FavoriteItem[]>('favorites') || []
  let tripData = storage.getItem<Record<string, TripData>>('tripData') || {}

  if (!seeded) {
    trips = [seedTrip, ...trips.filter(t => t.id !== seedTrip.id)]
    tripData = {
      ...tripData,
      [seedTrip.id]: {
        checklist: seedChecklist,
        preparationNotes: seedPreparationNotes,
        flights: seedFlights,
        hotels: seedHotels,
        schedule: seedSchedule,
        scheduleNotes: seedScheduleNotes,
        transport: seedTransport,
        shopping: [],
      },
    }
    storage.setItem('seeded-v4', true)
  }

  return { trips, template, tips, favorites, tripData, userId: null }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, loadInitialState)
  const skipFirstSave = useRef(true)

  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false
      return
    }
    storage.setItem('trips', state.trips)
    storage.setItem('template', state.template)
    storage.setItem('tips', state.tips)
    storage.setItem('favorites', state.favorites)
    storage.setItem('tripData', state.tripData)
  }, [state.trips, state.template, state.tips, state.favorites, state.tripData])

  function getTripData(tripId: string): TripData {
    return state.tripData[tripId] || initialTripData
  }

  return (
    <AppContext.Provider value={{ state, dispatch, getTripData }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
