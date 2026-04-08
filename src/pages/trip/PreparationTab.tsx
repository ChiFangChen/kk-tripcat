import { useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faSuitcaseRolling, faThumbtack, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../../context/AppContext'
import { useDoubleTap } from '../../hooks/useDoubleTap'
import { FullScreenModal } from '../../components/FullScreenModal'
import { Modal } from '../../components/Modal'
import { generateId } from '../../utils/id'
import type { ChecklistItem } from '../../types'

interface Props {
  tripId: string
}

export function PreparationTab({ tripId }: Props) {
  const { state, dispatch, setUserTripData, getTripData } = useApp()
  const tripData = getTripData(tripId)
  const trip = state.trips.find(t => t.id === tripId)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [fabExpanded, setFabExpanded] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesText, setNotesText] = useState('')
  const doubleTap = useDoubleTap()
  const fabTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Add form state
  const [newItem, setNewItem] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [newSubName, setNewSubName] = useState('')
  const [creatingSubcategory, setCreatingSubcategory] = useState(false)

  const items = tripData.checklist
  const notes = tripData.preparationNotes
  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)
  const displayed = showCompleted ? items : unchecked

  // Get existing categories
  const existingCategories: string[] = []
  for (const item of items) {
    const cat = item.category || '其他'
    if (!existingCategories.includes(cat)) existingCategories.push(cat)
  }

  // Group by category, preserving order
  const categoryOrder: string[] = []
  const grouped: Record<string, ChecklistItem[]> = {}
  for (const item of displayed) {
    const cat = item.category || '其他'
    if (!grouped[cat]) {
      grouped[cat] = []
      categoryOrder.push(cat)
    }
    grouped[cat].push(item)
  }

  function toggleCheck(id: string) {
    const updated = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
    setUserTripData(tripId, { checklist: updated })
  }

  // Get subcategories for a given category
  function getSubcategories(cat: string): string[] {
    const subs: string[] = []
    for (const item of items) {
      if ((item.category || '其他') === cat && item.subcategory && !subs.includes(item.subcategory)) {
        subs.push(item.subcategory)
      }
    }
    return subs
  }

  function selectCategory(cat: string) {
    setSelectedCategory(cat)
    setSelectedSubcategory(null)
    setCreatingSubcategory(false)
    setNewSubName('')
  }

  function openAddModal() {
    setNewItem('')
    setSelectedCategory(existingCategories[0] || '其他')
    setNewCategoryName('')
    setCreatingCategory(false)
    setSelectedSubcategory(null)
    setNewSubName('')
    setCreatingSubcategory(false)
    setShowAddModal(true)
  }

  function addItem() {
    if (!newItem.trim()) return
    const category = creatingCategory ? newCategoryName.trim() || '其他' : selectedCategory || '其他'
    const subcategory = creatingSubcategory ? (newSubName.trim() || undefined) : (selectedSubcategory || undefined)
    const item: ChecklistItem = {
      id: generateId(),
      text: newItem.trim(),
      checked: false,
      category,
      subcategory,
    }
    setUserTripData(tripId, { checklist: [...items, item] })
    setNewItem('')
    setShowAddModal(false)
  }

  function updateItem(updated: ChecklistItem) {
    setUserTripData(tripId, { checklist: items.map(i => i.id === updated.id ? updated : i) })
    setEditingItem(null)
  }

  function deleteItem(id: string) {
    setUserTripData(tripId, { checklist: items.filter(i => i.id !== id) })
    setEditingItem(null)
  }

  function handleFabClick() {
    if (!fabExpanded) {
      setFabExpanded(true)
      if (fabTimer.current) clearTimeout(fabTimer.current)
      fabTimer.current = setTimeout(() => setFabExpanded(false), 3000)
    } else {
      if (!trip) return
      dispatch({ type: 'UPDATE_TRIP', trip: { ...trip, gotReady: !trip.gotReady } })
      setFabExpanded(false)
      if (fabTimer.current) clearTimeout(fabTimer.current)
    }
  }

  function closeFab() {
    setFabExpanded(false)
    if (fabTimer.current) clearTimeout(fabTimer.current)
  }

  function openEditNotes() {
    setNotesText(notes)
    setEditingNotes(true)
  }

  function saveNotes() {
    setUserTripData(tripId, { preparationNotes: notesText })
    setEditingNotes(false)
  }

  return (
    <div>
      {/* Backdrop to close FAB */}
      {fabExpanded && <div className="fixed inset-0 z-30" onClick={closeFab} />}

      {/* Got Ready FAB */}
      <button
        className={`got-ready-fab ${fabExpanded ? 'expanded' : ''}`}
        onClick={handleFabClick}
      >
        <FontAwesomeIcon icon={trip?.gotReady ? faCircleCheck : faSuitcaseRolling} />
        {fabExpanded && <span>{trip?.gotReady ? '取消準備' : 'Got Ready!'}</span>}
      </button>

      {/* Notes block - double tap title to edit */}
      {notes && (
        <div
          className="card mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
          onClick={doubleTap('prep-notes', openEditNotes)}
        >
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1"><FontAwesomeIcon icon={faThumbtack} className="mr-1" />注意事項</p>
          <p className="text-xs whitespace-pre-wrap text-slate-400 dark:text-slate-500">{notes}</p>
        </div>
      )}

      {/* Progress bar - full width */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: items.length ? `${(checked.length / items.length) * 100}%` : '0%',
                background: checked.length === items.length && items.length > 0 ? 'var(--color-success)' : 'var(--color-primary)',
              }}
            />
          </div>
        </div>
        <span className="text-xs text-slate-400 w-8 text-right">
          {items.length ? Math.round((checked.length / items.length) * 100) : 0}%
        </span>
      </div>

      {/* Filter segmented control + add button */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1 flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button
            className={`flex-1 text-xs py-1.5 rounded-md transition-all ${!showCompleted ? 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm font-medium' : 'text-slate-400'}`}
            onClick={() => setShowCompleted(false)}
          >
            未完成 ({unchecked.length})
          </button>
          <button
            className={`flex-1 text-xs py-1.5 rounded-md transition-all ${showCompleted ? 'bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm font-medium' : 'text-slate-400'}`}
            onClick={() => setShowCompleted(true)}
          >
            全部 ({items.length})
          </button>
        </div>
        <button className="btn-round-add" onClick={openAddModal}>
          <FontAwesomeIcon icon={faPlus} className="text-xs" />
        </button>
      </div>

      {/* Grouped checklist */}
      {categoryOrder.map(category => {
        const catItems = grouped[category]
        const subOrder: string[] = []
        const subGrouped: Record<string, ChecklistItem[]> = {}
        for (const item of catItems) {
          const sub = item.subcategory || ''
          if (!(sub in subGrouped)) {
            subGrouped[sub] = []
            subOrder.push(sub)
          }
          subGrouped[sub].push(item)
        }
        const hasSubs = subOrder.some(s => s !== '')

        const renderItem = (item: ChecklistItem) => (
          <div
            key={item.id}
            className={`checklist-item ${item.checked ? 'checked' : ''}`}
            onClick={doubleTap(item.id, () => setEditingItem(item))}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleCheck(item.id)}
              className="w-5 h-5 flex-shrink-0"
            />
            <span className="flex-1 text-sm">{item.text}</span>
          </div>
        )

        return (
          <div key={category} className="mb-4">
            <h3 className="text-sm font-semibold text-slate-500 mb-1">{category}</h3>
            <div className="card">
              {subOrder.map(sub => (
                <div key={sub || '_none'}>
                  {hasSubs && sub && (
                    <p className="text-xs font-medium text-slate-400 mt-2 mb-0.5 first:mt-0 px-1">{sub}</p>
                  )}
                  {subGrouped[sub].map(renderItem)}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {displayed.length === 0 && (
        <div className="empty-state">
          <p>{showCompleted ? '清單是空的' : '全部準備好了！'}</p>
        </div>
      )}

      {/* Edit item popup with category/subcategory */}
      {editingItem && (
        <Modal title="編輯項目" onClose={() => setEditingItem(null)}>
          <EditItemForm
            item={editingItem}
            existingCategories={existingCategories}
            getSubcategories={getSubcategories}
            onSave={updateItem}
            onDelete={() => deleteItem(editingItem.id)}
          />
        </Modal>
      )}

      {/* Edit notes modal */}
      {editingNotes && (
        <Modal title="編輯注意事項" onClose={() => setEditingNotes(false)}>
          <textarea className="form-input" rows={5} value={notesText} onChange={e => setNotesText(e.target.value)} autoFocus />
          <button className="btn btn-primary w-full mt-3" onClick={saveNotes}>儲存</button>
        </Modal>
      )}

      {/* Add item full-screen popup */}
      {showAddModal && (
        <FullScreenModal title="新增準備項目" onClose={() => setShowAddModal(false)}>
          <div className="form-group">
            <label className="form-label">分類</label>
            {!creatingCategory ? (
              <div className="flex gap-2 flex-wrap">
                {existingCategories.map(cat => (
                  <button
                    key={cat}
                    className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => selectCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCreatingCategory(true)}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-1" />新分類
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="form-input flex-1"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  autoFocus
                />
                <button className="btn btn-sm btn-secondary" onClick={() => setCreatingCategory(false)}>
                  取消
                </button>
              </div>
            )}
          </div>
          {/* Subcategory picker */}
          {!creatingCategory && (() => {
            const subs = getSubcategories(selectedCategory)
            return (
              <div className="form-group">
                <label className="form-label">次分類</label>
                {!creatingSubcategory ? (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className={`btn btn-sm ${selectedSubcategory === null ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedSubcategory(null)}
                    >
                      無
                    </button>
                    {subs.map(sub => (
                      <button
                        key={sub}
                        className={`btn btn-sm ${selectedSubcategory === sub ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setSelectedSubcategory(sub)}
                      >
                        {sub}
                      </button>
                    ))}
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setCreatingSubcategory(true)}
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-1" />新次分類
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      className="form-input flex-1"
                      value={newSubName}
                      onChange={e => setNewSubName(e.target.value)}
                      autoFocus
                    />
                    <button className="btn btn-sm btn-secondary" onClick={() => setCreatingSubcategory(false)}>
                      取消
                    </button>
                  </div>
                )}
              </div>
            )
          })()}

          <div className="form-group">
            <label className="form-label">項目內容</label>
            <input
              className="form-input"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              autoFocus={!creatingCategory}
            />
          </div>
          <button className="btn btn-primary w-full" onClick={addItem}>新增</button>
        </FullScreenModal>
      )}
    </div>
  )
}

function EditItemForm({ item, existingCategories, getSubcategories, onSave, onDelete }: {
  item: ChecklistItem
  existingCategories: string[]
  getSubcategories: (cat: string) => string[]
  onSave: (i: ChecklistItem) => void
  onDelete: () => void
}) {
  const [text, setText] = useState(item.text)
  const [category, setCategory] = useState(item.category || '其他')
  const [subcategory, setSubcategory] = useState<string | undefined>(item.subcategory)

  const subs = getSubcategories(category)

  return (
    <div>
      <div className="form-group">
        <label className="form-label">項目內容</label>
        <input className="form-input" value={text} onChange={e => setText(e.target.value)} autoFocus />
      </div>
      <div className="form-group">
        <label className="form-label">分類</label>
        <div className="flex gap-2 flex-wrap">
          {existingCategories.map(cat => (
            <button
              key={cat}
              className={`btn btn-sm ${category === cat ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setCategory(cat); setSubcategory(undefined) }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      {subs.length > 0 && (
        <div className="form-group">
          <label className="form-label">次分類</label>
          <div className="flex gap-2 flex-wrap">
            <button
              className={`btn btn-sm ${!subcategory ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSubcategory(undefined)}
            >
              無
            </button>
            {subs.map(sub => (
              <button
                key={sub}
                className={`btn btn-sm ${subcategory === sub ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSubcategory(sub)}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}
      <button className="btn btn-primary w-full" onClick={() => onSave({ ...item, text, category, subcategory })}>儲存</button>
      <button className="btn btn-secondary w-full mt-2" onClick={onDelete}>
        <FontAwesomeIcon icon={faTrash} className="mr-1" />刪除
      </button>
    </div>
  )
}
