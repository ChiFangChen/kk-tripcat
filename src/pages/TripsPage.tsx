import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faThumbtack, faCat } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../context/AppContext'
import { generateId } from '../utils/id'
import type { Trip, TripType, ChecklistItem } from '../types'

interface Props {
  onSelectTrip: (tripId: string) => void
}

const tripTypes: TripType[] = ['情侶', '朋友', '家人', '獨旅']

type Step = 'list' | 'template' | 'info'

export function TripsPage({ onSelectTrip }: Props) {
  const { state, dispatch } = useApp()
  const [step, setStep] = useState<Step>('list')

  // Template selection state
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({})
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({})

  // Trip info form
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

  function startCreate() {
    // Init all categories and items as selected
    const cats: Record<string, boolean> = {}
    const items: Record<string, boolean> = {}
    for (const cat of state.template.categories) {
      cats[cat.name] = true
      for (const item of cat.items) {
        items[item.id] = true
      }
    }
    setSelectedCategories(cats)
    setSelectedItems(items)
    setStep('template')
  }

  function toggleCategory(catName: string) {
    const newVal = !selectedCategories[catName]
    setSelectedCategories(prev => ({ ...prev, [catName]: newVal }))
    // Toggle all items in this category
    const cat = state.template.categories.find(c => c.name === catName)
    if (cat) {
      const updates: Record<string, boolean> = {}
      for (const item of cat.items) {
        updates[item.id] = newVal
      }
      setSelectedItems(prev => ({ ...prev, ...updates }))
    }
  }

  function toggleItem(itemId: string, catName: string) {
    const newVal = !selectedItems[itemId]
    setSelectedItems(prev => ({ ...prev, [itemId]: newVal }))

    // Update category: if all items unchecked, uncheck category; if any checked, check category
    const cat = state.template.categories.find(c => c.name === catName)
    if (cat) {
      const allUnchecked = cat.items.every(item =>
        item.id === itemId ? !newVal : !selectedItems[item.id]
      )
      if (allUnchecked) {
        setSelectedCategories(prev => ({ ...prev, [catName]: false }))
      } else {
        setSelectedCategories(prev => ({ ...prev, [catName]: true }))
      }
    }
  }

  function isCategoryPartial(catName: string) {
    const cat = state.template.categories.find(c => c.name === catName)
    if (!cat) return false
    const checkedCount = cat.items.filter(item => selectedItems[item.id]).length
    return checkedCount > 0 && checkedCount < cat.items.length
  }

  function goToInfo() {
    setStep('info')
  }

  function handleCreate() {
    if (!form.name || !form.startDate) return

    const tripId = generateId()
    const trip: Trip = {
      id: tripId,
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

    // Build checklist from selected items
    const checklist: ChecklistItem[] = []
    for (const cat of state.template.categories) {
      for (const item of cat.items) {
        if (selectedItems[item.id]) {
          checklist.push({
            id: generateId(),
            text: item.text,
            checked: false,
            category: cat.name,
          })
        }
      }
    }

    dispatch({ type: 'ADD_TRIP', trip })
    dispatch({
      type: 'SET_TRIP_DATA',
      tripId,
      data: {
        checklist,
        preparationNotes: state.template.notes,
        flights: [],
        hotels: [],
        schedule: [],
        transport: [],
        shopping: [],
      },
    })

    // Reset
    setForm({ name: '', startDate: '', endDate: '', country: '', tripType: '', companions: '', tags: '' })
    setStep('list')
    onSelectTrip(tripId)
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  // === TEMPLATE SELECTION STEP ===
  if (step === 'template') {
    return (
      <div className="page-container">
        <div className="flex items-center justify-between mb-4">
          <button className="text-sky-500 text-sm" onClick={() => setStep('list')}>← 取消</button>
          <h1 className="text-lg font-bold">選擇準備項目</h1>
          <button className="btn btn-primary btn-sm" onClick={goToInfo}>下一步 →</button>
        </div>

        {state.template.notes && (
          <div className="card mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1"><FontAwesomeIcon icon={faThumbtack} className="mr-1" />注意事項</p>
            <p className="text-sm whitespace-pre-wrap">{state.template.notes}</p>
          </div>
        )}

        {state.template.categories.map(cat => (
          <div key={cat.name} className="mb-3">
            <label className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer font-semibold text-sm">
              <input
                type="checkbox"
                checked={selectedCategories[cat.name] || false}
                ref={(el) => { if (el) el.indeterminate = isCategoryPartial(cat.name) }}
                onChange={() => toggleCategory(cat.name)}
                className="w-5 h-5 flex-shrink-0"
              />
              {cat.name}
              <span className="text-slate-400 font-normal ml-auto">
                {cat.items.filter(i => selectedItems[i.id]).length}/{cat.items.length}
              </span>
            </label>
            {selectedCategories[cat.name] && (
              <div className="ml-4 mt-1">
                {cat.items.map(item => (
                  <label key={item.id} className="flex items-center gap-3 py-1.5 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedItems[item.id] || false}
                      onChange={() => toggleItem(item.id, cat.name)}
                      className="w-4 h-4 flex-shrink-0"
                    />
                    {item.text}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // === TRIP INFO STEP ===
  if (step === 'info') {
    return (
      <div className="page-container">
        <div className="flex items-center justify-between mb-4">
          <button className="text-sky-500 text-sm" onClick={() => setStep('template')}>← 返回</button>
          <h1 className="text-lg font-bold">旅程資訊</h1>
          <div className="w-12" />
        </div>

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
      </div>
    )
  }

  // === TRIP LIST ===
  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">旅程</h1>
        <button className="btn btn-primary" onClick={startCreate}>+ 新旅程</button>
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
            {trip.companions.length > 0 && (
              <p className="text-xs text-slate-400 mt-1.5">同行：{trip.companions.join('、')}</p>
            )}
          </div>
        ))
      )}
    </div>
  )
}
