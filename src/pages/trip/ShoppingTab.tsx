import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons'
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons'
import { useApp } from '../../context/AppContext'
import { useDoubleTap } from '../../hooks/useDoubleTap'
import { FullScreenModal } from '../../components/FullScreenModal'
import { Modal } from '../../components/Modal'
import { generateId } from '../../utils/id'
import { ImageUpload } from '../../components/ImageUpload'
import type { ShoppingItem } from '../../types'

interface Props {
  tripId: string
  viewOnly?: boolean
}

export function ShoppingTab({ tripId, viewOnly }: Props) {
  const { setUserTripData, getTripData } = useApp()
  const tripData = getTripData(tripId)
  const items = tripData.shopping || []
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)
  const [newItemText, setNewItemText] = useState('')
  const doubleTap = useDoubleTap()

  function addItem() {
    if (!newItemText.trim()) return
    const item: ShoppingItem = {
      id: generateId(),
      text: newItemText.trim(),
      checked: false,
      starred: false,
    }
    setUserTripData(tripId, { shopping: [...items, item] })
    setNewItemText('')
    setShowAddModal(false)
  }

  function toggleCheck(id: string) {
    const updated = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
    setUserTripData(tripId, { shopping: updated })
  }

  function toggleStar(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const updated = items.map(i => i.id === id ? { ...i, starred: !i.starred } : i)
    setUserTripData(tripId, { shopping: updated })
  }

  function updateItem(updated: ShoppingItem) {
    setUserTripData(tripId, { shopping: items.map(i => i.id === updated.id ? updated : i) })
    setEditingItem(null)
  }

  function deleteItem(id: string) {
    setUserTripData(tripId, { shopping: items.filter(i => i.id !== id) })
    setEditingItem(null)
  }

  const starred = items.filter(i => i.starred)
  const unstarred = items.filter(i => !i.starred)

  const renderItem = (item: ShoppingItem) => (
    <div
      key={item.id}
      className={`checklist-item ${item.checked ? 'checked' : ''}`}
      onClick={doubleTap(item.id, () => !viewOnly && setEditingItem(item))}
    >
      {!viewOnly && (
        <input
          type="checkbox"
          checked={item.checked}
          onChange={() => toggleCheck(item.id)}
          className="w-5 h-5 flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{item.text}</p>
      </div>
      {!viewOnly && (
        <button className={`star-btn p-2 ${item.starred ? 'active' : ''}`} onClick={(e) => toggleStar(item.id, e)}>
          <FontAwesomeIcon icon={item.starred ? faStarSolid : faStarRegular} />
        </button>
      )}
    </div>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">購物清單</h2>
        {!viewOnly && (
          <button className="btn-round-add" onClick={() => setShowAddModal(true)}>
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state"><p>清單是空的</p></div>
      ) : (
        <div className="card">
          {starred.length > 0 && (
            <div className="mb-2">
              {starred.map(renderItem)}
              {unstarred.length > 0 && <div className="my-2 border-t border-slate-100 dark:border-slate-800" />}
            </div>
          )}
          {unstarred.map(renderItem)}
        </div>
      )}

      {editingItem && (
        <Modal title="編輯購物項目" onClose={() => setEditingItem(null)}>
          <EditShoppingForm
            item={editingItem}
            onSave={updateItem}
            onDelete={() => deleteItem(editingItem.id)}
          />
        </Modal>
      )}

      {showAddModal && (
        <FullScreenModal title="新增購物項目" onClose={() => setShowAddModal(false)}>
          <div className="form-group">
            <label className="form-label">想買什麼？</label>
            <input
              className="form-input"
              value={newItemText}
              onChange={e => setNewItemText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              autoFocus
            />
          </div>
          <button className="btn btn-primary w-full" onClick={addItem}>新增</button>
        </FullScreenModal>
      )}
    </div>
  )
}

function EditShoppingForm({ item, onSave, onDelete }: { item: ShoppingItem; onSave: (i: ShoppingItem) => void; onDelete: () => void }) {
  const [form, setForm] = useState(item)

  return (
    <div>
      <div className="form-group">
        <label className="form-label">項目名稱</label>
        <input className="form-input" value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} autoFocus />
      </div>
      <div className="form-group">
        <label className="form-label">圖片</label>
        <ImageUpload
          imageUrl={form.imageUrl}
          storagePath="tc-images/shopping"
          onUploaded={url => setForm({ ...form, imageUrl: url })}
          onRemoved={() => setForm({ ...form, imageUrl: undefined })}
        />
      </div>
      <button className="btn btn-primary w-full" onClick={() => onSave(form)}>儲存</button>
      <button className="btn btn-secondary w-full mt-2" onClick={onDelete}>
        <FontAwesomeIcon icon={faTrash} className="mr-1" />刪除
      </button>
    </div>
  )
}
