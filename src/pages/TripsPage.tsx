import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCat, faChevronLeft, faPlus } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../context/AppContext'
import { TemplateSelector } from '../components/TemplateSelector'
import { generateId } from '../utils/id'
import { formatDate } from '../utils/date'
import type { Trip, TripType, ChecklistItem, Template } from '../types'

interface Props {
  onSelectTrip: (tripId: string) => void
}

const tripTypes: TripType[] = ['情侶', '朋友', '家人', '獨旅']

type Step = 'list' | 'template' | 'info'

export function TripsPage({ onSelectTrip }: Props) {
  const { state, dispatch, setTemplate, setSharedTripData, setUserTripData, getUserColor } = useApp()
  const [step, setStep] = useState<Step>('list')

  // Stored from template selection step
  const [pendingChecklist, setPendingChecklist] = useState<ChecklistItem[]>([])
  const [pendingNotes, setPendingNotes] = useState('')

  // Trip info form
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    country: '',
    tripType: '' as TripType,
    tags: '',
  })

  const sortedTrips = [...state.trips].sort((a, b) =>
    b.startDate.localeCompare(a.startDate)
  )

  function handleTemplateConfirm(checklist: ChecklistItem[], notes: string, updatedTemplate: Template | null) {
    setPendingChecklist(checklist)
    setPendingNotes(notes)
    if (updatedTemplate) setTemplate(updatedTemplate)
    setStep('info')
  }

  function handleCreate() {
    if (!form.name || !form.startDate || !state.auth.currentUser) return

    const tripId = generateId()
    const userId = state.auth.currentUser.id
    const trip: Trip = {
      id: tripId,
      name: form.name,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      country: form.country,
      tripType: form.tripType,
      members: [userId],
      creatorId: userId,
      tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
      createdAt: new Date().toISOString(),
      gotReady: false,
    }

    dispatch({ type: 'ADD_TRIP', trip })
    setSharedTripData(tripId, {
      schedule: [],
      scheduleNotes: [],
      flights: [],
      hotels: [],
      transport: [],
    })
    setUserTripData(tripId, {
      checklist: pendingChecklist,
      shopping: [],
      preparationNotes: pendingNotes,
      setupComplete: true,
    })

    // Reset
    setForm({ name: '', startDate: '', endDate: '', country: '', tripType: '', tags: '' })
    setPendingChecklist([])
    setPendingNotes('')
    setStep('list')
    onSelectTrip(tripId)
  }

  // === TEMPLATE SELECTION STEP ===
  if (step === 'template') {
    return (
      <div className="page-container">
        <div className="flex items-center justify-between mb-4">
          <button className="text-sky-600 p-2" onClick={() => setStep('list')}><FontAwesomeIcon icon={faChevronLeft} /></button>
          <h1 className="text-lg font-bold">選擇準備項目</h1>
          <div className="w-8" />
        </div>
        <TemplateSelector
          template={state.template}
          onConfirm={handleTemplateConfirm}
          confirmWithUpdateLabel="更新模板並下一步 →"
          confirmLabel="下一步 →"
        />
      </div>
    )
  }

  // === TRIP INFO STEP ===
  if (step === 'info') {
    return (
      <div className="page-container">
        <div className="flex items-center justify-between mb-4">
          <button className="text-sky-600 p-2" onClick={() => setStep('template')}><FontAwesomeIcon icon={faChevronLeft} /></button>
          <h1 className="text-lg font-bold">旅程資訊</h1>
          <div className="w-12" />
        </div>

        <div className="form-group">
          <label className="form-label">名稱 *</label>
          <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">國家</label>
          <input className="form-input" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
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
          <label className="form-label">標籤（逗號分隔）</label>
          <input className="form-input" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
        </div>
        <button className="btn btn-primary w-full mt-2" onClick={handleCreate}>建立旅程</button>
      </div>
    )
  }

  // === TRIP LIST ===
  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">旅程</h1>
        <button className="btn-round-add" onClick={() => setStep('template')}><FontAwesomeIcon icon={faPlus} className="text-xs" /></button>
      </div>

      {sortedTrips.length === 0 ? (
        <div className="empty-state">
          <p className="text-4xl mb-2"><FontAwesomeIcon icon={faCat} /></p>
          <p>還沒有旅程，開始規劃吧！</p>
        </div>
      ) : (
        sortedTrips.map(trip => (
          <div key={trip.id} className="card !p-3 cursor-pointer" onClick={() => onSelectTrip(trip.id)}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">{trip.name}</h3>
              <span className="text-xs text-slate-400">{formatDate(trip.startDate)}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {trip.country && <span className="tag tag-country">{trip.country}</span>}
              {trip.tripType && <span className="tag tag-type">{trip.tripType}</span>}
              {trip.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
            {trip.members.length > 1 && (
              <div className="flex items-center gap-1 mt-1.5">
                {trip.members.map(userId => (
                  <span key={userId} className="w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center" style={{ backgroundColor: getUserColor(userId) }}>
                    {(state.users.find(u => u.id === userId)?.displayName || '?').charAt(0)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
