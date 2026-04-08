export interface User {
  id: string
  username: string
  password: string
  displayName: string
  color: string
  isAdmin?: boolean
  deleted?: boolean
  createdAt: string
}

export const USER_COLORS = [
  '#7EC8E3', '#F87171', '#FBBF24', '#34D399', '#A78BFA',
  '#FB923C', '#38BDF8', '#F472B6', '#4ADE80', '#C084FC',
]

export type TripType = '情侶' | '朋友' | '家人' | '獨旅' | ''

export interface Trip {
  id: string
  name: string
  startDate: string
  endDate: string
  country: string
  tripType: TripType
  members: string[]  // user IDs
  creatorId: string   // admin user ID
  tags: string[]
  createdAt: string
  gotReady: boolean
}

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
  category: string
  subcategory?: string
}

export interface BookingInfo {
  platform?: string
  orderNumber?: string
  amount?: string
  note?: string
  assignee?: string
}

export interface FlightInfo {
  id: string
  airline: string
  bookingCode?: string
  ticketNumber?: string
  memberPlan?: string
  memberNumber?: string
  ticketPrice?: string
  legs: FlightLeg[]
  checkedBaggage?: string
  carryOn?: string
}

export interface FlightLeg {
  id: string
  direction: string
  date: string
  flightNumber: string
  aircraft?: string
  departureTime: string
  departureAirport: string
  departureTerminal?: string
  arrivalTime: string
  arrivalAirport: string
  arrivalTerminal?: string
  duration?: string
  meal?: string
  seat?: string
}

export interface Hotel {
  id: string
  name: string
  booking?: BookingInfo
  address?: string
  phone?: string
  checkIn?: string
  checkOut?: string
  roomType?: string
  guests?: string
  googleMapUrl?: string
  note?: string
}

export interface ScheduleDay {
  date: string
  label: string
  activities: ScheduleActivity[]
}

export interface ScheduleActivity {
  id: string
  time?: string
  name: string
  place?: string
  address?: string
  googleMapUrl?: string
  booking?: BookingInfo
  note?: string
}

export interface TransportItem {
  id: string
  title: string
  content: string
  isOpen: boolean
}

export interface ShoppingItem {
  id: string
  text: string
  checked: boolean
  starred: boolean
  favoriteId?: string
  imageUrl?: string
}

export interface Template {
  id: string
  notes: string
  categories: TemplateCategory[]
  shoppingItems: TemplateItem[]
}

export interface TemplateCategory {
  name: string
  items: TemplateItem[]
}

export interface TemplateItem {
  id: string
  text: string
  category: string
  subcategory?: string
}

export interface TipNote {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface FavoriteItem {
  id: string
  name: string
  purchases: Purchase[]
  imageUrl?: string
}

export interface Purchase {
  id: string
  date: string
  amount: string
  currency?: string
  tripId?: string
  tripName?: string
  note?: string
}

export interface ScheduleNote {
  id: string
  title: string
  content: string
  imageUrl?: string
}

export type TabType = 'trips' | 'notes' | 'settings'
export type TripTabType = 'preparation' | 'flight' | 'hotel' | 'schedule' | 'transport' | 'shopping'
export type NoteTabType = 'tips' | 'favorites'
