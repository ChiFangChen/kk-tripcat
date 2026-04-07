import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faPen, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../../context/AppContext'
import { FullScreenModal } from '../../components/FullScreenModal'
import { InfoRow } from '../../components/InfoRow'
import { generateId } from '../../utils/id'
import type { Hotel } from '../../types'

interface Props {
  tripId: string
}

export function HotelTab({ tripId }: Props) {
  const { dispatch, getTripData } = useApp()
  const tripData = getTripData(tripId)
  const hotels = tripData.hotels
  const [editing, setEditing] = useState<Hotel | null>(null)

  function save(hotel: Hotel) {
    const exists = hotels.find(h => h.id === hotel.id)
    const updated = exists
      ? hotels.map(h => h.id === hotel.id ? hotel : h)
      : [...hotels, hotel]
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { hotels: updated } })
    setEditing(null)
  }

  function remove(id: string) {
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { hotels: hotels.filter(h => h.id !== id) } })
  }

  function newHotel(): Hotel {
    return { id: generateId(), name: '' }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">飯店資訊</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(newHotel())}>
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>

      {hotels.length === 0 && (
        <div className="empty-state"><p>尚無飯店資訊</p></div>
      )}

      {hotels.map(hotel => (
        <div key={hotel.id} className="card">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">{hotel.name || '飯店'}</h3>
            <div className="flex gap-2">
              <button className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded" onClick={() => setEditing(hotel)}>
                <FontAwesomeIcon icon={faPen} />
              </button>
              <button className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded" onClick={() => remove(hotel.id)}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          </div>

          {hotel.booking?.platform && (
            <InfoRow label="訂房平台" value={
              <>
                {hotel.booking.platform}
                {hotel.booking.orderNumber && ` ${hotel.booking.orderNumber}`}
                {hotel.booking.assignee && <span className="tag ml-2">{hotel.booking.assignee}</span>}
              </>
            } />
          )}
          <InfoRow label="價格" value={hotel.booking?.amount} />
          <InfoRow label="地址" value={hotel.address} />
          {hotel.googleMapUrl && (
            <div className="py-1">
              <a href={hotel.googleMapUrl} target="_blank" rel="noopener noreferrer" className="map-link">
                📍 Google Map
              </a>
            </div>
          )}
          <InfoRow label="電話" value={hotel.phone} />
          <InfoRow label="入住" value={hotel.checkIn} />
          <InfoRow label="退房" value={hotel.checkOut} />
          <InfoRow label="房型" value={hotel.roomType} />
          <InfoRow label="人數" value={hotel.guests} />
          <InfoRow label="備註" value={hotel.booking?.note || hotel.note} />
        </div>
      ))}

      {editing && (
        <FullScreenModal title={editing.name ? '編輯飯店' : '新增飯店'} onClose={() => setEditing(null)}>
          <HotelForm hotel={editing} onSave={save} />
        </FullScreenModal>
      )}
    </div>
  )
}

function HotelForm({ hotel, onSave }: { hotel: Hotel; onSave: (h: Hotel) => void }) {
  const [form, setForm] = useState(hotel)
  const [booking, setBooking] = useState(hotel.booking || {})

  function handleSave() {
    onSave({ ...form, booking: Object.values(booking).some(v => v) ? booking : undefined })
  }

  return (
    <div>
      <div className="form-group"><label className="form-label">飯店名稱</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">訂房平台</label><input className="form-input" value={booking.platform || ''} onChange={e => setBooking({ ...booking, platform: e.target.value })} placeholder="Booking.com / Klook" /></div>
      <div className="form-group"><label className="form-label">訂單編號</label><input className="form-input" value={booking.orderNumber || ''} onChange={e => setBooking({ ...booking, orderNumber: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">負責人</label><input className="form-input" value={booking.assignee || ''} onChange={e => setBooking({ ...booking, assignee: e.target.value })} placeholder="誰負責訂的" /></div>
      <div className="form-group"><label className="form-label">價格</label><input className="form-input" value={booking.amount || ''} onChange={e => setBooking({ ...booking, amount: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">地址</label><input className="form-input" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">Google Map 連結</label><input className="form-input" value={form.googleMapUrl || ''} onChange={e => setForm({ ...form, googleMapUrl: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">電話</label><input className="form-input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">入住時間</label><input className="form-input" value={form.checkIn || ''} onChange={e => setForm({ ...form, checkIn: e.target.value })} placeholder="2026/4/9 (四) 14:00~23:30" /></div>
      <div className="form-group"><label className="form-label">退房時間</label><input className="form-input" value={form.checkOut || ''} onChange={e => setForm({ ...form, checkOut: e.target.value })} placeholder="2026/4/14 (二) 6:00~12:00" /></div>
      <div className="form-group"><label className="form-label">房型</label><input className="form-input" value={form.roomType || ''} onChange={e => setForm({ ...form, roomType: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">人數</label><input className="form-input" value={form.guests || ''} onChange={e => setForm({ ...form, guests: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">備註</label><textarea className="form-input" value={form.note || ''} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
      <button className="btn btn-primary w-full" onClick={handleSave}>儲存</button>
    </div>
  )
}
