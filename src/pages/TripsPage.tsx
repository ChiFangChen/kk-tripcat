import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faThumbtack, faCat, faChevronLeft, faPlus } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../context/AppContext'
import { generateId } from '../utils/id'
import { formatDate } from '../utils/date'
import type { Trip, TripType, ChecklistItem } from '../types'

interface Props {
  onSelectTrip: (tripId: string) => void
}

const tripTypes: TripType[] = ['情侶', '朋友', '家人', '獨旅']

type Step = 'list' | 'template' | 'info'

export function TripsPage({ onSelectTrip }: Props) {
  const { state, dispatch, setSharedTripData, setUserTripData, getUserName, getUserColor } = useApp()
  const [step, setStep] = useState<Step>('list')

  // Template selection state
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({})
  const [selectedSubcategories, setSelectedSubcategories] = useState<Record<string, boolean>>({})
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({})

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

  function startCreate() {
    const cats: Record<string, boolean> = {}
    const subcats: Record<string, boolean> = {}
    const items: Record<string, boolean> = {}
    for (const cat of state.template.categories) {
      cats[cat.name] = true
      for (const item of cat.items) {
        items[item.id] = true
        if (item.subcategory) {
          subcats[`${cat.name}:${item.subcategory}`] = true
        }
      }
    }
    setSelectedCategories(cats)
    setSelectedSubcategories(subcats)
    setSelectedItems(items)
    setStep('template')
  }

  function toggleCategory(catName: string) {
    const newVal = !selectedCategories[catName]
    setSelectedCategories(prev => ({ ...prev, [catName]: newVal }))
    const cat = state.template.categories.find(c => c.name === catName)
    if (cat) {
      const itemUpdates: Record<string, boolean> = {}
      const subUpdates: Record<string, boolean> = {}
      for (const item of cat.items) {
        itemUpdates[item.id] = newVal
        if (item.subcategory) {
          subUpdates[`${catName}:${item.subcategory}`] = newVal
        }
      }
      setSelectedItems(prev => ({ ...prev, ...itemUpdates }))
      setSelectedSubcategories(prev => ({ ...prev, ...subUpdates }))
    }
  }

  function toggleSubcategory(catName: string, subName: string) {
    const key = `${catName}:${subName}`
    const newVal = !selectedSubcategories[key]
    setSelectedSubcategories(prev => ({ ...prev, [key]: newVal }))
    const cat = state.template.categories.find(c => c.name === catName)
    if (cat) {
      const itemUpdates: Record<string, boolean> = {}
      for (const item of cat.items) {
        if (item.subcategory === subName) {
          itemUpdates[item.id] = newVal
        }
      }
      setSelectedItems(prev => ({ ...prev, ...itemUpdates }))
      // Update parent category
      const anyChecked = cat.items.some(item =>
        item.subcategory === subName ? newVal : selectedItems[item.id]
      )
      setSelectedCategories(prev => ({ ...prev, [catName]: anyChecked }))
    }
  }

  function toggleItem(itemId: string, catName: string) {
    const newVal = !selectedItems[itemId]
    setSelectedItems(prev => ({ ...prev, [itemId]: newVal }))

    const cat = state.template.categories.find(c => c.name === catName)
    if (cat) {
      const item = cat.items.find(i => i.id === itemId)
      // Update subcategory state
      if (item?.subcategory) {
        const subKey = `${catName}:${item.subcategory}`
        const subItems = cat.items.filter(i => i.subcategory === item.subcategory)
        const anySubChecked = subItems.some(i => i.id === itemId ? newVal : selectedItems[i.id])
        setSelectedSubcategories(prev => ({ ...prev, [subKey]: anySubChecked }))
      }
      // Update category state
      const anyChecked = cat.items.some(i => i.id === itemId ? newVal : selectedItems[i.id])
      setSelectedCategories(prev => ({ ...prev, [catName]: anyChecked }))
    }
  }

  function isCategoryPartial(catName: string) {
    const cat = state.template.categories.find(c => c.name === catName)
    if (!cat) return false
    const checkedCount = cat.items.filter(item => selectedItems[item.id]).length
    return checkedCount > 0 && checkedCount < cat.items.length
  }

  function isSubcategoryPartial(catName: string, subName: string) {
    const cat = state.template.categories.find(c => c.name === catName)
    if (!cat) return false
    const subItems = cat.items.filter(i => i.subcategory === subName)
    const checkedCount = subItems.filter(i => selectedItems[i.id]).length
    return checkedCount > 0 && checkedCount < subItems.length
  }

  function getSubcategories(cat: typeof state.template.categories[0]) {
    const subs: string[] = []
    for (const item of cat.items) {
      if (item.subcategory && !subs.includes(item.subcategory)) {
        subs.push(item.subcategory)
      }
    }
    return subs
  }

  function goToInfo() {
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
            subcategory: item.subcategory,
          })
        }
      }
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
      checklist,
      shopping: [],
      preparationNotes: state.template.notes,
    })

    // Reset
    setForm({ name: '', startDate: '', endDate: '', country: '', tripType: '', tags: '' })
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
                {(() => {
                  const subs = getSubcategories(cat)
                  const noSubItems = cat.items.filter(i => !i.subcategory)
                  return (
                    <>
                      {noSubItems.map(item => (
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
                      {subs.map(sub => (
                        <div key={sub} className="mt-1">
                          <label className="flex items-center gap-3 py-1.5 cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={selectedSubcategories[`${cat.name}:${sub}`] || false}
                              ref={(el) => { if (el) el.indeterminate = isSubcategoryPartial(cat.name, sub) }}
                              onChange={() => toggleSubcategory(cat.name, sub)}
                              className="w-4 h-4 flex-shrink-0"
                            />
                            {sub}
                            <span className="text-slate-400 font-normal ml-auto text-xs">
                              {cat.items.filter(i => i.subcategory === sub && selectedItems[i.id]).length}/{cat.items.filter(i => i.subcategory === sub).length}
                            </span>
                          </label>
                          <div className="ml-6">
                            {cat.items.filter(i => i.subcategory === sub).map(item => (
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
                        </div>
                      ))}
                    </>
                  )
                })()}
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
          <button className="text-sky-600 p-2" onClick={() => setStep('template')}><FontAwesomeIcon icon={faChevronLeft} /></button>
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
        <button className="btn-round-add" onClick={startCreate}><FontAwesomeIcon icon={faPlus} className="text-xs" /></button>
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
                    {getUserName(userId).charAt(0)}
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
