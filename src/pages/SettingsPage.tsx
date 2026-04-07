import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Modal } from '../components/Modal'
import { generateId } from '../utils/id'
import type { Template, TemplateItem } from '../types'

export function SettingsPage() {
  const { state, dispatch } = useApp()
  const [editing, setEditing] = useState<Template | null>(null)

  function save(template: Template) {
    const exists = state.templates.find(t => t.id === template.id)
    if (exists) {
      dispatch({ type: 'UPDATE_TEMPLATE', template })
    } else {
      dispatch({ type: 'ADD_TEMPLATE', template })
    }
    setEditing(null)
  }

  function remove(id: string) {
    dispatch({ type: 'DELETE_TEMPLATE', templateId: id })
  }

  function newTemplate(): Template {
    return { id: generateId(), name: '', preparationItems: [], shoppingItems: [] }
  }

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">模板庫</h2>
        <button className="btn btn-primary" onClick={() => setEditing(newTemplate())}>+ 新模板</button>
      </div>

      {state.templates.length === 0 ? (
        <div className="empty-state">
          <p className="text-4xl mb-2">📋</p>
          <p>建立模板，快速準備每次旅程</p>
        </div>
      ) : (
        state.templates.map(template => (
          <div key={template.id} className="card">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">{template.name}</h3>
              <div className="flex gap-2">
                <button className="text-sky-500 text-xs" onClick={() => setEditing(template)}>編輯</button>
                <button className="text-red-400 text-xs" onClick={() => remove(template.id)}>刪除</button>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              準備事項 {template.preparationItems.length} 項 / 購物清單 {template.shoppingItems.length} 項
            </p>
          </div>
        ))
      )}

      {editing && (
        <Modal title={editing.name ? '編輯模板' : '新模板'} onClose={() => setEditing(null)}>
          <TemplateForm template={editing} onSave={save} />
        </Modal>
      )}
    </div>
  )
}

function TemplateForm({ template, onSave }: { template: Template; onSave: (t: Template) => void }) {
  const [name, setName] = useState(template.name)
  const [prepItems, setPrepItems] = useState(template.preparationItems)
  const [shopItems, setShopItems] = useState(template.shoppingItems)
  const [newPrep, setNewPrep] = useState('')
  const [newPrepCat, setNewPrepCat] = useState('')
  const [newShop, setNewShop] = useState('')
  const [newShopCat, setNewShopCat] = useState('')

  function addPrep() {
    if (!newPrep.trim()) return
    const item: TemplateItem = { id: generateId(), text: newPrep.trim(), category: newPrepCat || '其他' }
    setPrepItems([...prepItems, item])
    setNewPrep('')
  }

  function addShop() {
    if (!newShop.trim()) return
    const item: TemplateItem = { id: generateId(), text: newShop.trim(), category: newShopCat || '其他' }
    setShopItems([...shopItems, item])
    setNewShop('')
  }

  function handleSave() {
    if (!name.trim()) return
    onSave({ ...template, name: name.trim(), preparationItems: prepItems, shoppingItems: shopItems })
  }

  return (
    <div>
      <div className="form-group">
        <label className="form-label">模板名稱</label>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="例：日本旅行" />
      </div>

      <h3 className="font-semibold text-sm mb-2">準備事項</h3>
      <div className="mb-3">
        {prepItems.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 text-sm py-1">
            <span className="text-slate-400 text-xs">[{item.category}]</span>
            <span className="flex-1">{item.text}</span>
            <button className="text-red-400 text-xs" onClick={() => setPrepItems(prepItems.filter((_, idx) => idx !== i))}>✕</button>
          </div>
        ))}
        <div className="flex gap-2 mt-1">
          <input className="form-input flex-1" placeholder="項目" value={newPrep} onChange={e => setNewPrep(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPrep()} />
          <input className="form-input w-20" placeholder="分類" value={newPrepCat} onChange={e => setNewPrepCat(e.target.value)} />
          <button className="btn btn-sm btn-primary" onClick={addPrep}>+</button>
        </div>
      </div>

      <h3 className="font-semibold text-sm mb-2">購物清單</h3>
      <div className="mb-3">
        {shopItems.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 text-sm py-1">
            <span className="text-slate-400 text-xs">[{item.category}]</span>
            <span className="flex-1">{item.text}</span>
            <button className="text-red-400 text-xs" onClick={() => setShopItems(shopItems.filter((_, idx) => idx !== i))}>✕</button>
          </div>
        ))}
        <div className="flex gap-2 mt-1">
          <input className="form-input flex-1" placeholder="項目" value={newShop} onChange={e => setNewShop(e.target.value)} onKeyDown={e => e.key === 'Enter' && addShop()} />
          <input className="form-input w-20" placeholder="分類" value={newShopCat} onChange={e => setNewShopCat(e.target.value)} />
          <button className="btn btn-sm btn-primary" onClick={addShop}>+</button>
        </div>
      </div>

      <button className="btn btn-primary w-full" onClick={handleSave}>儲存模板</button>
    </div>
  )
}
