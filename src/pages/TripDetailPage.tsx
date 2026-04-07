import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faUsers, faUser } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../context/AppContext'
import { MemberMenu } from '../components/MemberMenu'
import { UserMenu } from '../components/UserMenu'
import { PreparationTab } from './trip/PreparationTab'
import { FlightTab } from './trip/FlightTab'
import { HotelTab } from './trip/HotelTab'
import { ScheduleTab } from './trip/ScheduleTab'
import { TransportTab } from './trip/TransportTab'
import { ShoppingTab } from './trip/ShoppingTab'
import type { TripTabType } from '../types'
import * as storage from '../utils/storage'

interface Props {
  tripId: string
  onBack: () => void
}

const allTabs: { key: TripTabType; label: string }[] = [
  { key: 'preparation', label: '準備' },
  { key: 'flight', label: '飛機' },
  { key: 'hotel', label: '飯店' },
  { key: 'schedule', label: '行程表' },
  { key: 'transport', label: '交通' },
  { key: 'shopping', label: '購物' },
]

export function TripDetailPage({ tripId, onBack }: Props) {
  const { state } = useApp()
  const trip = state.trips.find(t => t.id === tripId)

  const [showMembers, setShowMembers] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const storageKey = `trip-tab-${tripId}`
  const [activeTab, setActiveTab] = useState<TripTabType>(() => {
    return storage.getItem<TripTabType>(storageKey) || 'preparation'
  })

  useEffect(() => {
    storage.setItem(storageKey, activeTab)
  }, [activeTab, storageKey])

  if (!trip) return null

  // Reorder tabs: if gotReady, move preparation to end
  const orderedTabs = trip.gotReady
    ? [...allTabs.filter(t => t.key !== 'preparation'), allTabs.find(t => t.key === 'preparation')!]
    : allTabs

  return (
    <div>
      <div className="page-header">
        <button onClick={onBack} className="text-sky-600 p-2"><FontAwesomeIcon icon={faChevronLeft} /></button>
        <h1>{trip.name}</h1>
        <div className="flex items-center gap-1">
          <button className="header-icon-btn" onClick={() => setShowMembers(true)}>
            <FontAwesomeIcon icon={faUsers} />
          </button>
          <button className="identity-badge" onClick={() => setShowUserMenu(true)}>
            <FontAwesomeIcon icon={faUser} />
          </button>
        </div>
      </div>

      <div className="trip-tabs">
        {orderedTabs.map(tab => (
          <button
            key={tab.key}
            className={`trip-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === 'preparation' && trip.gotReady && ' ✓'}
          </button>
        ))}
      </div>

      <div className="page-container">
        {activeTab === 'preparation' && <PreparationTab tripId={tripId} />}
        {activeTab === 'flight' && <FlightTab tripId={tripId} />}
        {activeTab === 'hotel' && <HotelTab tripId={tripId} />}
        {activeTab === 'schedule' && <ScheduleTab tripId={tripId} />}
        {activeTab === 'transport' && <TransportTab tripId={tripId} />}
        {activeTab === 'shopping' && <ShoppingTab tripId={tripId} />}
      </div>

      {showMembers && <MemberMenu tripId={tripId} onClose={() => setShowMembers(false)} />}
      {showUserMenu && <UserMenu onClose={() => setShowUserMenu(false)} />}
    </div>
  )
}
