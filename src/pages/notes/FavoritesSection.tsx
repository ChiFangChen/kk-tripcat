import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../../context/AppContext'
import { Modal } from '../../components/Modal'
import { generateId } from '../../utils/id'
import { formatDate } from '../../utils/date'
import type { FavoriteItem, Purchase } from '../../types'

export function FavoritesSection() {
  const { state, dispatch } = useApp()
  const [editing, setEditing] = useState<FavoriteItem | null>(null)
  const [addingPurchaseTo, setAddingPurchaseTo] = useState<string | null>(null)

  function remove(id: string) {
    dispatch({ type: 'DELETE_FAVORITE', favoriteId: id })
    // Also unstar in all shopping lists
    Object.entries(state.tripData).forEach(([tripId, data]) => {
      const updated = data.shopping.map(item =>
        item.favoriteId === id ? { ...item, starred: false, favoriteId: undefined } : item
      )
      if (updated.some((item, i) => item !== data.shopping[i])) {
        dispatch({ type: 'SET_TRIP_DATA', tripId, data: { shopping: updated } })
      }
    })
    setEditing(null)
  }

  function addPurchase(favoriteId: string, purchase: Purchase) {
    const fav = state.favorites.find(f => f.id === favoriteId)
    if (!fav) return
    dispatch({
      type: 'UPDATE_FAVORITE',
      favorite: { ...fav, purchases: [purchase, ...fav.purchases] },
    })
    setAddingPurchaseTo(null)
  }

  function deletePurchase(favoriteId: string, purchaseId: string) {
    const fav = state.favorites.find(f => f.id === favoriteId)
    if (!fav) return
    dispatch({
      type: 'UPDATE_FAVORITE',
      favorite: { ...fav, purchases: fav.purchases.filter(p => p.id !== purchaseId) },
    })
  }

  function newFavorite(): FavoriteItem {
    return { id: generateId(), name: '', purchases: [] }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">喜歡的東西</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(newFavorite())}><FontAwesomeIcon icon={faPlus} /></button>
      </div>

      {state.favorites.length === 0 ? (
        <div className="empty-state"><p>還沒有喜歡的東西</p></div>
      ) : (
        state.favorites.map(fav => (
          <div key={fav.id} className="card">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold"><FontAwesomeIcon icon={faStar} className="text-amber-400 mr-1" />{fav.name}</h3>
              <div className="flex gap-2">
                <button className="text-slate-500 dark:text-slate-400 text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded" onClick={() => setAddingPurchaseTo(fav.id)}>
                  <FontAwesomeIcon icon={faPlus} />
                </button>
                <button className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded" onClick={() => remove(fav.id)}>
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>

            {fav.purchases.length > 0 ? (
              <div className="text-sm">
                {fav.purchases.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <div>
                      <span className="font-medium">{p.amount}</span>
                      {p.currency && <span className="text-slate-400 ml-1">{p.currency}</span>}
                      <span className="text-slate-400 ml-2">{formatDate(p.date)}</span>
                      {p.tripName && <span className="text-slate-400 ml-1">({p.tripName})</span>}
                      {p.note && <span className="text-slate-400 ml-1">- {p.note}</span>}
                    </div>
                    <button className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded" onClick={() => deletePurchase(fav.id, p.id)}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">尚無購買紀錄</p>
            )}
          </div>
        ))
      )}

      {/* New favorite modal */}
      {editing && (
        <Modal title="新增喜歡的東西" onClose={() => setEditing(null)}>
          <FavoriteForm
            favorite={editing}
            onSave={(fav) => { dispatch({ type: 'ADD_FAVORITE', favorite: fav }); setEditing(null) }}
          />
        </Modal>
      )}

      {/* Add purchase modal */}
      {addingPurchaseTo && (
        <Modal title="新增購買紀錄" onClose={() => setAddingPurchaseTo(null)}>
          <PurchaseForm onSave={(p) => addPurchase(addingPurchaseTo, p)} />
        </Modal>
      )}
    </div>
  )
}

function FavoriteForm({ favorite, onSave }: { favorite: FavoriteItem; onSave: (f: FavoriteItem) => void }) {
  const [name, setName] = useState(favorite.name)
  return (
    <div>
      <div className="form-group"><label className="form-label">名稱</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} /></div>
      <button className="btn btn-primary w-full" onClick={() => onSave({ ...favorite, name })}>儲存</button>
    </div>
  )
}

function PurchaseForm({ onSave }: { onSave: (p: Purchase) => void }) {
  const [form, setForm] = useState<Omit<Purchase, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    currency: '',
    note: '',
  })

  return (
    <div>
      <div className="form-group"><label className="form-label">金額</label><input className="form-input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="1200" /></div>
      <div className="form-group"><label className="form-label">幣別</label><input className="form-input" value={form.currency || ''} onChange={e => setForm({ ...form, currency: e.target.value })} placeholder="THB / JPY / TWD" /></div>
      <div className="form-group"><label className="form-label">日期</label><input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">備註</label><input className="form-input" value={form.note || ''} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
      <button className="btn btn-primary w-full" onClick={() => onSave({ ...form, id: generateId() } as Purchase)}>儲存</button>
    </div>
  )
}
