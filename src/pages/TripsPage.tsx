import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Modal } from '../components/Modal'
import { generateId } from '../utils/id'
import type { Trip, TripType } from '../types'

interface Props {
  onSelectTrip: (tripId: string) => void
}

const tripTypes: TripType[] = ['情侶', '朋友', '家人', '獨旅']

export function TripsPage({ onSelectTrip }: Props) {
  const { state, dispatch } = useApp()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    country: '',
    tripType: '' as TripType,
    companions: '',
    tags: '',
  })

  const sortedTrips = [...state.trips].sort((a, b) =>
    b.startDate.localeCompare(a.startDate)
  )

  function handleCreate() {
    if (!form.name || !form.startDate) return
    const trip: Trip = {
      id: generateId(),
      name: form.name,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      country: form.country,
      tripType: form.tripType,
      companions: form.companions ? form.companions.split(',').map(s => s.trim()).filter(Boolean) : [],
      tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
      createdAt: new Date().toISOString(),
      gotReady: false,
    }
    dispatch({ type: 'ADD_TRIP', trip })
    setForm({ name: '', startDate: '', endDate: '', country: '', tripType: '', companions: '', tags: '' })
    setShowCreate(false)
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">旅程</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ 新旅程</button>
      </div>

      {sortedTrips.length === 0 ? (
        <div className="empty-state">
          <p className="text-4xl mb-2">🐱</p>
          <p>還沒有旅程，開始規劃吧！</p>
        </div>
      ) : (
        sortedTrips.map(trip => (
          <div key={trip.id} className="card cursor-pointer" onClick={() => onSelectTrip(trip.id)}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-base">{trip.name}</h3>
              <span className="text-xs text-slate-400">{formatDate(trip.startDate)}</span>
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              {trip.country && <span className="tag">{trip.country}</span>}
              {trip.tripType && <span className="tag">{trip.tripType}</span>}
              {trip.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
            {trip.companions.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">同行：{trip.companions.join('、')}</p>
            )}
          </div>
        ))
      )}

      {showCreate && (
        <Modal title="新旅程" onClose={() => setShowCreate(false)}>
          <div className="form-group">
            <label className="form-label">名稱 *</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例：清邁潑潑 💦" />
          </div>
          <div className="form-group">
            <label className="form-label">國家</label>
            <input className="form-input" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="例：泰國" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">開始日期 *</label>
              <input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">結束日期</label>
              <input className="form-input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">旅行類型</label>
            <div className="flex gap-2 flex-wrap">
              {tripTypes.map(t => (
                <button
                  key={t}
                  className={`btn btn-sm ${form.tripType === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setForm({ ...form, tripType: form.tripType === t ? '' : t })}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">同行人（逗號分隔）</label>
            <input className="form-input" value={form.companions} onChange={e => setForm({ ...form, companions: e.target.value })} placeholder="例：小明, 小美" />
          </div>
          <div className="form-group">
            <label className="form-label">標籤（逗號分隔）</label>
            <input className="form-input" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="例：清邁, 泰服, 潑水節" />
          </div>
          <button className="btn btn-primary w-full mt-2" onClick={handleCreate}>建立旅程</button>
        </Modal>
      )}
    </div>
  )
}
