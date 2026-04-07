import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import type { Trip, Template, TipNote, FavoriteItem, ChecklistItem, FlightInfo, Hotel, ScheduleDay, TransportItem, ShoppingItem } from '../types'
import * as storage from '../utils/storage'
import { generateId } from '../utils/id'
import { seedTrip, seedChecklist, seedFlights, seedHotels, seedSchedule, seedTransport } from '../data/seed'

interface TripData {
  checklist: ChecklistItem[]
  flights: FlightInfo[]
  hotels: Hotel[]
  schedule: ScheduleDay[]
  transport: TransportItem[]
  shopping: ShoppingItem[]
}

interface AppState {
  trips: Trip[]
  templates: Template[]
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
  | { type: 'ADD_TEMPLATE'; template: Template }
  | { type: 'UPDATE_TEMPLATE'; template: Template }
  | { type: 'DELETE_TEMPLATE'; templateId: string }
  | { type: 'ADD_TIP'; tip: TipNote }
  | { type: 'UPDATE_TIP'; tip: TipNote }
  | { type: 'DELETE_TIP'; tipId: string }
  | { type: 'SET_FAVORITES'; favorites: FavoriteItem[] }
  | { type: 'ADD_FAVORITE'; favorite: FavoriteItem }
  | { type: 'UPDATE_FAVORITE'; favorite: FavoriteItem }
  | { type: 'DELETE_FAVORITE'; favoriteId: string }

const initialTripData: TripData = {
  checklist: [],
  flights: [],
  hotels: [],
  schedule: [],
  transport: [],
  shopping: [],
}

const initialState: AppState = {
  trips: [],
  templates: [],
  tips: [],
  favorites: [],
  tripData: {},
  userId: null,
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
    case 'ADD_TEMPLATE':
      return { ...state, templates: [...state.templates, action.template] }
    case 'UPDATE_TEMPLATE':
      return { ...state, templates: state.templates.map(t => t.id === action.template.id ? action.template : t) }
    case 'DELETE_TEMPLATE':
      return { ...state, templates: state.templates.filter(t => t.id !== action.templateId) }
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
  cloneTemplate: (templateId: string, tripId: string) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Load from localStorage on mount, seed if first time
  useEffect(() => {
    const seeded = storage.getItem<boolean>('seeded')
    let trips = storage.getItem<Trip[]>('trips') || []
    const templates = storage.getItem<Template[]>('templates') || []
    const tips = storage.getItem<TipNote[]>('tips') || []
    const favorites = storage.getItem<FavoriteItem[]>('favorites') || []
    let tripData = storage.getItem<Record<string, TripData>>('tripData') || {}

    if (!seeded) {
      trips = [seedTrip, ...trips]
      tripData = {
        ...tripData,
        [seedTrip.id]: {
          checklist: seedChecklist,
          flights: seedFlights,
          hotels: seedHotels,
          schedule: seedSchedule,
          transport: seedTransport,
          shopping: [],
        },
      }
      storage.setItem('seeded', true)
    }

    dispatch({ type: 'LOAD_STATE', state: { trips, templates, tips, favorites, tripData } })
  }, [])

  // Save to localStorage on state change
  useEffect(() => {
    storage.setItem('trips', state.trips)
    storage.setItem('templates', state.templates)
    storage.setItem('tips', state.tips)
    storage.setItem('favorites', state.favorites)
    storage.setItem('tripData', state.tripData)
  }, [state.trips, state.templates, state.tips, state.favorites, state.tripData])

  function getTripData(tripId: string): TripData {
    return state.tripData[tripId] || initialTripData
  }

  function cloneTemplate(templateId: string, tripId: string) {
    const template = state.templates.find(t => t.id === templateId)
    if (!template) return

    const existing = getTripData(tripId)
    const newChecklist: ChecklistItem[] = template.preparationItems.map(item => ({
      id: generateId(),
      text: item.text,
      checked: false,
      category: item.category,
    }))
    const newShopping: ShoppingItem[] = template.shoppingItems.map(item => ({
      id: generateId(),
      text: item.text,
      checked: false,
      starred: false,
    }))

    dispatch({
      type: 'SET_TRIP_DATA',
      tripId,
      data: {
        checklist: [...existing.checklist, ...newChecklist],
        shopping: [...existing.shopping, ...newShopping],
      },
    })
  }

  return (
    <AppContext.Provider value={{ state, dispatch, getTripData, cloneTemplate }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
