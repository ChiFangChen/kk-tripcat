import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
import { useApp } from '../../context/AppContext'
import { generateId } from '../../utils/id'
import type { TransportItem } from '../../types'

interface Props {
  tripId: string
  viewOnly?: boolean
}

export function TransportTab({ tripId, viewOnly }: Props) {
  const { setSharedTripData, getTripData } = useApp()
  const tripData = getTripData(tripId)
  const transport = tripData.transport || []

  function addTransport() {
    const newItem: TransportItem = { id: generateId(), title: '', content: '', isOpen: true }
    setSharedTripData(tripId, { transport: [...transport, newItem] })
  }

  function updateTransport(index: number, fields: Partial<TransportItem>) {
    const updated = transport.map((item, i) => i === index ? { ...item, ...fields } : item)
    setSharedTripData(tripId, { transport: updated })
  }

  function removeTransport(index: number) {
    const updated = transport.filter((_, i) => i !== index)
    setSharedTripData(tripId, { transport: updated })
  }

  function toggleTransport(index: number) {
    updateTransport(index, { isOpen: !transport[index].isOpen })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">交通資訊</h2>
        {!viewOnly && (
          <button className="btn-round-add" onClick={addTransport}>
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>
        )}
      </div>

      {transport.length === 0 && (
        <div className="empty-state"><p>尚無交通資訊</p></div>
      )}

      {transport.map((item, index) => (
        <div key={item.id} className="card">
          <div className="flex justify-between items-center mb-2">
            {!viewOnly ? (
              <input
                className="font-semibold text-sm bg-transparent outline-none w-full"
                value={item.title}
                onChange={e => updateTransport(index, { title: e.target.value })}
                placeholder="交通方式標題"
              />
            ) : (
              <h3 className="font-semibold text-sm">{item.title}</h3>
            )}
            <div className="flex gap-2">
              {!viewOnly && (
                <button className="text-slate-400 p-1" onClick={() => removeTransport(index)}>
                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                </button>
              )}
              <button className="text-slate-400 p-1" onClick={() => toggleTransport(index)}>
                <FontAwesomeIcon icon={item.isOpen ? faChevronUp : faChevronDown} className="text-xs" />
              </button>
            </div>
          </div>
          {item.isOpen && (
            !viewOnly ? (
              <textarea
                className="w-full text-sm bg-slate-50 dark:bg-slate-800 p-2 rounded outline-none min-h-[100px]"
                value={item.content}
                onChange={e => updateTransport(index, { content: e.target.value })}
                placeholder="內容（如：時刻表、轉乘資訊、地圖截圖連結...）"
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-400">{item.content}</p>
            )
          )}
        </div>
      ))}
    </div>
  )
}
