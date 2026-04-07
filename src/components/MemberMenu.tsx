import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faCrown } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../context/AppContext'
import { Modal } from './Modal'

interface Props {
  tripId: string
  onClose: () => void
}

export function MemberMenu({ tripId, onClose }: Props) {
  const { state, dispatch } = useApp()
  const trip = state.trips.find(t => t.id === tripId)
  const [newName, setNewName] = useState('')

  if (!trip) return null

  // First companion is treated as admin for now
  const members = trip.companions

  function addMember() {
    if (!newName.trim() || !trip) return
    if (members.includes(newName.trim())) return
    dispatch({ type: 'UPDATE_TRIP', trip: { ...trip, companions: [...members, newName.trim()] } })
    setNewName('')
  }

  function removeMember(name: string) {
    if (!trip) return
    dispatch({ type: 'UPDATE_TRIP', trip: { ...trip, companions: members.filter(m => m !== name) } })
  }

  return (
    <Modal title="旅伴" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {members.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">尚無旅伴</p>
        ) : (
          members.map((name, i) => (
            <div key={name} className="flex items-center gap-2 py-1.5">
              {i === 0 && <FontAwesomeIcon icon={faCrown} className="text-amber-400 text-xs" />}
              <span className="flex-1 text-sm font-medium">{name}</span>
              {i !== 0 && (
                <button
                  className="text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded"
                  onClick={() => removeMember(name)}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              )}
            </div>
          ))
        )}

        <div className="flex gap-2 mt-2">
          <input
            className="form-input flex-1"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="新增旅伴名稱"
            onKeyDown={e => e.key === 'Enter' && addMember()}
          />
          <button className="btn btn-primary" onClick={addMember}>
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>
      </div>
    </Modal>
  )
}
