export type TripType = '情侶' | '朋友' | '家人' | '獨旅' | ''

export interface Trip {
  id: string
  name: string
  startDate: string
  endDate: string
  country: string
  tripType: TripType
  companions: string[]
  tags: string[]
  createdAt: string
  gotReady: boolean
}

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
  category: string
}

export interface BookingInfo {
  platform?: string
  orderNumber?: string
  amount?: string
  note?: string
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
  arrivalTime: string
  arrivalAirport: string
  duration?: string
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
}

export interface Template {
  id: string
  name: string
  preparationItems: TemplateItem[]
  shoppingItems: TemplateItem[]
}

export interface TemplateItem {
  id: string
  text: string
  category: string
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

export type TabType = 'trips' | 'notes' | 'settings'
export type TripTabType = 'preparation' | 'flight' | 'hotel' | 'schedule' | 'transport' | 'shopping'
export type NoteTabType = 'tips' | 'favorites'
