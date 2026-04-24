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
import { ImageGalleryField } from "../../components/ImageGalleryField";
import { MultiImageUpload } from "../../components/MultiImageUpload";
import { generateId } from "../../utils/id";
import { deleteImage, uploadImage } from "../../utils/firebase";
import {
  createPendingImages,
  persistImagesForRecord,
} from "../../utils/imageUpload";
import * as storage from "../../utils/storage";
import type { TransportItem } from "../../types";
import type { ImageAsset, PendingImageFile } from "../../types/images";

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

  async function removeTransport(id: string) {
    const item = transport.find((entry) => entry.id === id);
    if (item) {
      await Promise.all(item.images.map((image) => deleteImage(image.path)));
    }
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
    return {
      id: generateId(),
      title: "",
      content: "",
      isOpen: true,
      images: [],
    };
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
                <ImageGalleryField images={item.images} className="mt-3" />
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
            tripId={tripId}
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
  tripId,
  item,
  onSave,
  onCancel,
  onDelete,
}: {
  tripId: string;
  item: TransportItem;
  onSave: (item: TransportItem) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(item);
  const [pendingImages, setPendingImages] = useState<PendingImageFile[]>([]);
  const [removedImages, setRemovedImages] = useState<ImageAsset[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await persistImagesForRecord({
        existingImages: form.images,
        pendingImages,
        removedImages,
        basePath: `tc-images/trips/${tripId}/transport/${item.id}`,
        createdAt: new Date().toISOString(),
        upload: uploadImage,
        remove: deleteImage,
        onPersist: async (images) => {
          onSave({ ...form, images });
        },
      });
    } finally {
      setSaving(false);
    }
  }

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
        <MultiImageUpload
          existingImages={form.images}
          pendingImages={pendingImages}
          onAddFiles={(files) =>
            setPendingImages((current) => [
              ...current,
              ...createPendingImages(files, generateId),
            ])
          }
          onRemoveExisting={(imageId) => {
            const image = form.images.find((entry) => entry.id === imageId);
            if (!image) return;
            setRemovedImages((current) => [...current, image]);
            setForm({
              ...form,
              images: form.images.filter((entry) => entry.id !== imageId),
            });
          }}
          onRemovePending={(imageId) =>
            setPendingImages((current) =>
              current.filter((entry) => entry.imageId !== imageId),
            )
          }
        />
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel} type="button">
          取消
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "儲存中..." : "儲存"}
        </button>
      </div>
      {onDelete && (
        <button
          className="btn btn-secondary btn-danger w-full mt-2"
          onClick={onDelete}
        >
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
          刪除交通資訊
        </button>
      )}
    </div>
  );
}
