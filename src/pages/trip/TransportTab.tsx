import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faChevronDown,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../../context/AppContext";
import { useDoubleTap } from "../../hooks/useDoubleTap";
import { FullScreenModal } from "../../components/FullScreenModal";
import { ImageUpload } from "../../components/ImageUpload";
import { generateId } from "../../utils/id";
import * as storage from "../../utils/storage";
import type { TransportItem } from "../../types";

interface Props {
  tripId: string;
  viewOnly?: boolean;
}

export function TransportTab({ tripId, viewOnly }: Props) {
  const { setSharedTripData, getTripData } = useApp();
  const tripData = getTripData(tripId);
  const transport = tripData.transport || [];
  const [editingItem, setEditingItem] = useState<TransportItem | null>(null);
  const collapsedStorageKey = `transport-collapsed-${tripId}`;
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>(
    () => storage.getItem<Record<string, boolean>>(collapsedStorageKey) || {},
  );
  const doubleTap = useDoubleTap();

  useEffect(() => {
    storage.setItem(collapsedStorageKey, collapsedItems);
  }, [collapsedItems, collapsedStorageKey]);

  function saveTransport(item: TransportItem) {
    const exists = transport.find((entry) => entry.id === item.id);
    const updated = exists
      ? transport.map((entry) => (entry.id === item.id ? item : entry))
      : [...transport, item];
    setSharedTripData(tripId, { transport: updated });
    setEditingItem(null);
  }

  function removeTransport(id: string) {
    setSharedTripData(tripId, {
      transport: transport.filter((entry) => entry.id !== id),
    });
    setCollapsedItems((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setEditingItem(null);
  }

  function newTransport(): TransportItem {
    return { id: generateId(), title: "", content: "", isOpen: true };
  }

  function toggleTransport(itemId: string) {
    setCollapsedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">交通資訊</h2>
        {!viewOnly && (
          <button
            className="btn-round-add"
            onClick={() => setEditingItem(newTransport())}
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>
        )}
      </div>

      {transport.length === 0 && (
        <div className="empty-state">
          <p>尚無交通資訊</p>
        </div>
      )}

      {transport.map((item) => {
        const hasCollapsibleContent = item.content.trim().length > 0;
        const isCollapsed = hasCollapsibleContent
          ? (collapsedItems[item.id] ?? !item.isOpen)
          : false;

        return (
          <div key={item.id} className="card">
            <div className="flex justify-between items-center mb-2">
              <h3
                className="font-semibold text-sm cursor-pointer"
                onClick={doubleTap(
                  item.id,
                  () => !viewOnly && setEditingItem(item),
                )}
              >
                {item.title || "交通方式"}
              </h3>
              {hasCollapsibleContent && (
                <button
                  className="text-slate-400 p-1"
                  onClick={() => toggleTransport(item.id)}
                >
                  <FontAwesomeIcon
                    icon={isCollapsed ? faChevronDown : faChevronUp}
                    className="text-xs"
                  />
                </button>
              )}
            </div>
            {!isCollapsed && (
              <>
                <p className="text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                  {item.content}
                </p>
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="w-full rounded-lg mt-3 max-h-56 object-cover"
                  />
                )}
              </>
            )}
          </div>
        );
      })}

      {editingItem && (
        <FullScreenModal
          title={editingItem.title ? "編輯交通資訊" : "新增交通資訊"}
          onClose={() => setEditingItem(null)}
        >
          <TransportForm
            item={editingItem}
            onSave={saveTransport}
            onCancel={() => setEditingItem(null)}
            onDelete={
              editingItem.title || editingItem.content
                ? () => removeTransport(editingItem.id)
                : undefined
            }
          />
        </FullScreenModal>
      )}
    </div>
  );
}

function TransportForm({
  item,
  onSave,
  onCancel,
  onDelete,
}: {
  item: TransportItem;
  onSave: (item: TransportItem) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(item);

  return (
    <div>
      <div className="form-group">
        <label className="form-label">標題</label>
        <input
          className="form-input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label">內容</label>
        <textarea
          className="form-input"
          rows={6}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder="內容（如：時刻表、轉乘資訊、地圖截圖連結...）"
        />
      </div>
      <div className="form-group">
        <label className="form-label">圖片</label>
        <ImageUpload
          imageUrl={form.imageUrl}
          storagePath="tc-images/transport"
          onUploaded={(url) => setForm({ ...form, imageUrl: url })}
          onRemoved={() => setForm({ ...form, imageUrl: undefined })}
        />
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel} type="button">
          取消
        </button>
        <button className="btn btn-primary" onClick={() => onSave(form)}>
          儲存
        </button>
      </div>
      {onDelete && (
        <button className="btn btn-secondary btn-danger w-full mt-2" onClick={onDelete}>
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
          刪除交通資訊
        </button>
      )}
    </div>
  );
}
