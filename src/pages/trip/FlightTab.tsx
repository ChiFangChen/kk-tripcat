import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Modal } from '../../components/Modal'
import { InfoRow } from '../../components/InfoRow'
import { generateId } from '../../utils/id'
import type { FlightInfo, FlightLeg } from '../../types'

interface Props {
  tripId: string
}

export function FlightTab({ tripId }: Props) {
  const { dispatch, getTripData } = useApp()
  const tripData = getTripData(tripId)
  const flights = tripData.flights
  const [editingFlight, setEditingFlight] = useState<FlightInfo | null>(null)
  const [editingLeg, setEditingLeg] = useState<FlightLeg | null>(null)
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null)

  function saveFlight(flight: FlightInfo) {
    const exists = flights.find(f => f.id === flight.id)
    const updated = exists
      ? flights.map(f => f.id === flight.id ? flight : f)
      : [...flights, flight]
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { flights: updated } })
    setEditingFlight(null)
  }

  function deleteFlight(id: string) {
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { flights: flights.filter(f => f.id !== id) } })
  }

  function saveLeg(flightId: string, leg: FlightLeg) {
    const updated = flights.map(f => {
      if (f.id !== flightId) return f
      const existingLeg = f.legs.find(l => l.id === leg.id)
      const legs = existingLeg
        ? f.legs.map(l => l.id === leg.id ? leg : l)
        : [...f.legs, leg]
      return { ...f, legs }
    })
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { flights: updated } })
    setEditingLeg(null)
    setEditingFlightId(null)
  }

  function deleteLeg(flightId: string, legId: string) {
    const updated = flights.map(f => {
      if (f.id !== flightId) return f
      return { ...f, legs: f.legs.filter(l => l.id !== legId) }
    })
    dispatch({ type: 'SET_TRIP_DATA', tripId, data: { flights: updated } })
  }

  function newFlight(): FlightInfo {
    return { id: generateId(), airline: '', legs: [] }
  }

  function newLeg(): FlightLeg {
    return {
      id: generateId(), direction: '', date: '', flightNumber: '',
      departureTime: '', departureAirport: '', arrivalTime: '', arrivalAirport: '',
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">航班資訊</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEditingFlight(newFlight())}>+ 航班</button>
      </div>

      {flights.length === 0 && (
        <div className="empty-state"><p>尚無航班資訊</p></div>
      )}

      {flights.map(flight => (
        <div key={flight.id} className="card">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">{flight.airline || '航班'}</h3>
            <div className="flex gap-2">
              <button className="text-sky-500 text-xs" onClick={() => setEditingFlight(flight)}>編輯</button>
              <button className="text-red-400 text-xs" onClick={() => deleteFlight(flight.id)}>刪除</button>
            </div>
          </div>

          <InfoRow label="訂位代號" value={flight.bookingCode} />
          <InfoRow label="機票號碼" value={flight.ticketNumber} />
          <InfoRow label="會員方案" value={flight.memberPlan} />
          <InfoRow label="會員卡號" value={flight.memberNumber} />
          <InfoRow label="票價" value={flight.ticketPrice} />
          <InfoRow label="託運行李" value={flight.checkedBaggage} />
          <InfoRow label="隨身行李" value={flight.carryOn} />

          {flight.legs.map(leg => (
            <div key={leg.id} className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">{leg.direction}</span>
                <div className="flex gap-2">
                  <button className="text-sky-500 text-xs" onClick={() => { setEditingLeg(leg); setEditingFlightId(flight.id) }}>編輯</button>
                  <button className="text-red-400 text-xs" onClick={() => deleteLeg(flight.id, leg.id)}>刪除</button>
                </div>
              </div>
              <InfoRow label="日期" value={leg.date} />
              <InfoRow label="航班" value={`${leg.flightNumber}${leg.aircraft ? ` (${leg.aircraft})` : ''}`} />
              <InfoRow label="起飛" value={`${leg.departureTime} / ${leg.departureAirport}`} />
              <InfoRow label="抵達" value={`${leg.arrivalTime} / ${leg.arrivalAirport}`} />
              <InfoRow label="飛行時間" value={leg.duration} />
            </div>
          ))}

          <button
            className="btn btn-secondary btn-sm mt-3"
            onClick={() => { setEditingLeg(newLeg()); setEditingFlightId(flight.id) }}
          >
            + 航段
          </button>
        </div>
      ))}

      {/* Flight edit modal */}
      {editingFlight && (
        <Modal title={editingFlight.airline ? '編輯航班' : '新增航班'} onClose={() => setEditingFlight(null)}>
          <FlightForm flight={editingFlight} onSave={saveFlight} />
        </Modal>
      )}

      {/* Leg edit modal */}
      {editingLeg && editingFlightId && (
        <Modal title="航段" onClose={() => { setEditingLeg(null); setEditingFlightId(null) }}>
          <LegForm leg={editingLeg} onSave={(leg) => saveLeg(editingFlightId, leg)} />
        </Modal>
      )}
    </div>
  )
}

function FlightForm({ flight, onSave }: { flight: FlightInfo; onSave: (f: FlightInfo) => void }) {
  const [form, setForm] = useState(flight)
  return (
    <div>
      <div className="form-group"><label className="form-label">航空公司</label><input className="form-input" value={form.airline} onChange={e => setForm({ ...form, airline: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">訂位代號</label><input className="form-input" value={form.bookingCode || ''} onChange={e => setForm({ ...form, bookingCode: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">機票號碼</label><input className="form-input" value={form.ticketNumber || ''} onChange={e => setForm({ ...form, ticketNumber: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">會員方案</label><input className="form-input" value={form.memberPlan || ''} onChange={e => setForm({ ...form, memberPlan: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">會員卡號</label><input className="form-input" value={form.memberNumber || ''} onChange={e => setForm({ ...form, memberNumber: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">票價</label><input className="form-input" value={form.ticketPrice || ''} onChange={e => setForm({ ...form, ticketPrice: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">託運行李</label><input className="form-input" value={form.checkedBaggage || ''} onChange={e => setForm({ ...form, checkedBaggage: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">隨身行李</label><input className="form-input" value={form.carryOn || ''} onChange={e => setForm({ ...form, carryOn: e.target.value })} /></div>
      <button className="btn btn-primary w-full" onClick={() => onSave(form)}>儲存</button>
    </div>
  )
}

function LegForm({ leg, onSave }: { leg: FlightLeg; onSave: (l: FlightLeg) => void }) {
  const [form, setForm] = useState(leg)
  return (
    <div>
      <div className="form-group"><label className="form-label">方向（如：去程：台北 → 清邁）</label><input className="form-input" value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">日期</label><input className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} placeholder="2026-04-09 (四)" /></div>
      <div className="form-group"><label className="form-label">航班號碼</label><input className="form-input" value={form.flightNumber} onChange={e => setForm({ ...form, flightNumber: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">機型</label><input className="form-input" value={form.aircraft || ''} onChange={e => setForm({ ...form, aircraft: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">起飛時間</label><input className="form-input" value={form.departureTime} onChange={e => setForm({ ...form, departureTime: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">起飛機場</label><input className="form-input" value={form.departureAirport} onChange={e => setForm({ ...form, departureAirport: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">抵達時間</label><input className="form-input" value={form.arrivalTime} onChange={e => setForm({ ...form, arrivalTime: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">抵達機場</label><input className="form-input" value={form.arrivalAirport} onChange={e => setForm({ ...form, arrivalAirport: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">飛行時間</label><input className="form-input" value={form.duration || ''} onChange={e => setForm({ ...form, duration: e.target.value })} /></div>
      <button className="btn btn-primary w-full" onClick={() => onSave(form)}>儲存</button>
    </div>
  )
}
