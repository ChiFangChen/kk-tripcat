import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../../context/AppContext'
import { useDoubleTap } from '../../hooks/useDoubleTap'
import { FullScreenModal } from '../../components/FullScreenModal'
import { InfoRow } from '../../components/InfoRow'
import { generateId } from '../../utils/id'
import type { FlightInfo, FlightLeg } from '../../types'

interface Props {
  tripId: string
  viewOnly?: boolean
}

export function FlightTab({ tripId, viewOnly }: Props) {
  const { setSharedTripData, getTripData } = useApp()
  const tripData = getTripData(tripId)
  const flights = tripData.flights
  const [editing, setEditing] = useState<FlightInfo | null>(null)
  const doubleTap = useDoubleTap()

  function save(flight: FlightInfo) {
    const exists = flights.find(f => f.id === flight.id)
    const updated = exists
      ? flights.map(f => f.id === flight.id ? flight : f)
      : [...flights, flight]
    setSharedTripData(tripId, { flights: updated })
    setEditing(null)
  }

  function remove(id: string) {
    setSharedTripData(tripId, { flights: flights.filter(f => f.id !== id) })
    setEditing(null)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">航班資訊</h2>
        {!viewOnly && (
          <button className="btn-round-add" onClick={() => setEditing({ id: generateId(), airline: '', legs: [] })}>
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>
        )}
      </div>

      {flights.length === 0 && (
        <div className="empty-state"><p>尚無航班資訊</p></div>
      )}

      {flights.map(flight => (
        <div key={flight.id} className="card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sky-600 dark:text-sky-400 cursor-pointer" onClick={doubleTap(flight.id, () => !viewOnly && setEditing(flight))}>
              {flight.airline || '航空公司'}
            </h3>
            {!viewOnly && (
              <button className="text-slate-400 p-1" onClick={() => remove(flight.id)}>
                <FontAwesomeIcon icon={faTrash} className="text-xs" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            {flight.legs.map((leg, i) => (
              <div key={leg.id} className={`${i > 0 ? 'pt-4 border-t border-slate-100 dark:border-slate-800' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="tag">{leg.direction}</span>
                  <span className="text-xs font-mono text-slate-400">{leg.date}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-center flex-1">
                    <div className="text-lg font-bold">{leg.departureAirport}</div>
                    <div className="text-xs text-slate-400">{leg.departureTime}</div>
                  </div>
                  <div className="px-4 text-slate-300">✈️</div>
                  <div className="text-center flex-1">
                    <div className="text-lg font-bold">{leg.arrivalAirport}</div>
                    <div className="text-xs text-slate-400">{leg.arrivalTime}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <InfoRow label="班機" value={leg.flightNumber} />
                  <InfoRow label="航站" value={leg.departureTerminal ? `T${leg.departureTerminal}` : undefined} />
                  <InfoRow label="座位" value={leg.seat} />
                  <InfoRow label="機型" value={leg.aircraft} />
                </div>
              </div>
            ))}
          </div>

          {(flight.bookingCode || flight.ticketNumber || flight.ticketPrice) && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 gap-1">
              <InfoRow label="訂位代號" value={flight.bookingCode} />
              <InfoRow label="票號" value={flight.ticketNumber} />
              <InfoRow label="票價" value={flight.ticketPrice} />
              <InfoRow label="託運" value={flight.checkedBaggage} />
              <InfoRow label="手提" value={flight.carryOn} />
            </div>
          )}
        </div>
      ))}

      {editing && (
        <FullScreenModal title={editing.airline ? '編輯航班' : '新增航班'} onClose={() => setEditing(null)}>
          <FlightForm flight={editing} onSave={save} onDelete={editing.airline ? () => remove(editing.id) : undefined} />
        </FullScreenModal>
      )}
    </div>
  )
}

function FlightForm({ flight, onSave, onDelete }: { flight: FlightInfo; onSave: (f: FlightInfo) => void; onDelete?: () => void }) {
  const [form, setForm] = useState(flight)

  function addLeg() {
    const leg: FlightLeg = {
      id: generateId(),
      direction: form.legs.length % 2 === 0 ? '去程' : '回程',
      date: '',
      flightNumber: '',
      departureTime: '',
      departureAirport: '',
      arrivalTime: '',
      arrivalAirport: '',
    }
    setForm({ ...form, legs: [...form.legs, leg] })
  }

  function updateLeg(index: number, fields: Partial<FlightLeg>) {
    const legs = form.legs.map((l, i) => i === index ? { ...l, ...fields } : l)
    setForm({ ...form, legs })
  }

  function removeLeg(index: number) {
    setForm({ ...form, legs: form.legs.filter((_, i) => i !== index) })
  }

  return (
    <div>
      <div className="form-group"><label className="form-label">航空公司</label><input className="form-input" value={form.airline} onChange={e => setForm({ ...form, airline: e.target.value })} /></div>
      <div className="form-row">
        <div className="form-group flex-1"><label className="form-label">訂位代號</label><input className="form-input" value={form.bookingCode || ''} onChange={e => setForm({ ...form, bookingCode: e.target.value })} /></div>
        <div className="form-group flex-1"><label className="form-label">票價</label><input className="form-input" value={form.ticketPrice || ''} onChange={e => setForm({ ...form, ticketPrice: e.target.value })} /></div>
      </div>
      <div className="form-group"><label className="form-label">票號</label><input className="form-input" value={form.ticketNumber || ''} onChange={e => setForm({ ...form, ticketNumber: e.target.value })} /></div>
      <div className="form-row">
        <div className="form-group flex-1"><label className="form-label">託運行李</label><input className="form-input" value={form.checkedBaggage || ''} onChange={e => setForm({ ...form, checkedBaggage: e.target.value })} /></div>
        <div className="form-group flex-1"><label className="form-label">手提行李</label><input className="form-input" value={form.carryOn || ''} onChange={e => setForm({ ...form, carryOn: e.target.value })} /></div>
      </div>

      <div className="mt-6 mb-4 flex items-center justify-between">
        <h3 className="font-semibold">航段</h3>
        <button className="btn btn-sm btn-secondary" onClick={addLeg}><FontAwesomeIcon icon={faPlus} className="mr-1" />新增航段</button>
      </div>

      <div className="space-y-6">
        {form.legs.map((leg, index) => (
          <div key={leg.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg relative">
            <button className="absolute top-2 right-2 text-slate-400 p-2" onClick={() => removeLeg(index)}><FontAwesomeIcon icon={faTrash} /></button>
            <div className="form-row">
              <div className="form-group flex-1"><label className="form-label">方向 (去程/回程)</label><input className="form-input" value={leg.direction} onChange={e => updateLeg(index, { direction: e.target.value })} /></div>
              <div className="form-group flex-1"><label className="form-label">日期</label><input className="form-input" type="date" value={leg.date} onChange={e => updateLeg(index, { date: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group flex-1"><label className="form-label">出發機場 (代碼)</label><input className="form-input" value={leg.departureAirport} onChange={e => updateLeg(index, { departureAirport: e.target.value.toUpperCase() })} /></div>
              <div className="form-group flex-1"><label className="form-label">到達機場 (代碼)</label><input className="form-input" value={leg.arrivalAirport} onChange={e => updateLeg(index, { arrivalAirport: e.target.value.toUpperCase() })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group flex-1"><label className="form-label">出發時間</label><input className="form-input" value={leg.departureTime} onChange={e => updateLeg(index, { departureTime: e.target.value })} /></div>
              <div className="form-group flex-1"><label className="form-label">到達時間</label><input className="form-input" value={leg.arrivalTime} onChange={e => updateLeg(index, { arrivalTime: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group flex-1"><label className="form-label">班機號碼</label><input className="form-input" value={leg.flightNumber} onChange={e => updateLeg(index, { flightNumber: e.target.value.toUpperCase() })} /></div>
              <div className="form-group flex-1"><label className="form-label">座位</label><input className="form-input" value={leg.seat || ''} onChange={e => updateLeg(index, { seat: e.target.value })} /></div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary w-full mt-8" onClick={() => onSave(form)}>儲存航班</button>
      {onDelete && (
        <button className="btn btn-secondary w-full mt-2" onClick={onDelete}>
          <FontAwesomeIcon icon={faTrash} className="mr-1" />刪除航班
        </button>
      )}
    </div>
  )
}
