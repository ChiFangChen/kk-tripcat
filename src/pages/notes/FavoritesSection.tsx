import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar,
  faPlus,
  faTrash,
  faPen,
} from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../../context/AppContext";
import { Modal } from "../../components/Modal";
import { generateId } from "../../utils/id";
import { formatDate } from "../../utils/date";
import { ImageGalleryField } from "../../components/ImageGalleryField";
import { MultiImageUpload } from "../../components/MultiImageUpload";
import { deleteImage, uploadImage } from "../../utils/firebase";
import {
  createPendingImages,
  persistImagesForRecord,
} from "../../utils/imageUpload";
import type { Purchase } from "../../types";
import type { ImageAsset, PendingImageFile } from "../../types/images";
import { getFavoriteItems, type Item } from "../trip/shoppingTypes";

export function FavoritesSection() {
  const { state, dispatch } = useApp();
  const [editing, setEditing] = useState<Item | null>(null);
  const [addingPurchaseTo, setAddingPurchaseTo] = useState<string | null>(null);
  const favoriteItems = useMemo(() => getFavoriteItems(state.items), [state.items]);

  async function remove(id: string) {
    const item = state.items.find((entry) => entry.id === id);
    if (item) {
      await Promise.all(item.images.map((image) => deleteImage(image.path)));
    }
    dispatch({ type: "DELETE_ITEM", itemId: id });
    setEditing(null);
  }

  function addPurchase(itemId: string, purchase: Purchase) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;
    dispatch({
      type: "UPDATE_ITEM",
      item: { ...item, purchases: [purchase, ...item.purchases] },
    });
    setAddingPurchaseTo(null);
  }

  function deletePurchase(itemId: string, purchaseId: string) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;
    dispatch({
      type: "UPDATE_ITEM",
      item: {
        ...item,
        purchases: item.purchases.filter((purchase) => purchase.id !== purchaseId),
      },
    });
  }

  function newFavorite(): Item {
    const now = new Date().toISOString();
    return {
      id: generateId(),
      name: "",
      images: [],
      purchases: [],
      isFavorite: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  return (
    <div>
      <div className="flex justify-end items-center mb-4">
        <button
          className="btn-round-add"
          onClick={() => setEditing(newFavorite())}
        >
          <FontAwesomeIcon icon={faPlus} className="text-xs" />
        </button>
      </div>

      {favoriteItems.length === 0 ? (
        <div className="empty-state">
          <p>還沒有喜歡的東西</p>
        </div>
      ) : (
        favoriteItems.map((item) => (
          <div key={item.id} className="card">
            <ImageGalleryField images={item.images} className="mb-2" />
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">
                <FontAwesomeIcon
                  icon={faStar}
                  className="text-amber-400 mr-1"
                />
                {item.name}
              </h3>
              <div className="flex gap-2">
                <button
                  className="btn-round-add !w-6 !h-6"
                  onClick={() => setAddingPurchaseTo(item.id)}
                >
                  <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                </button>
                <button
                  className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded"
                  onClick={() => setEditing(item)}
                >
                  <FontAwesomeIcon icon={faPen} />
                </button>
                <button
                  className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded"
                  onClick={() => remove(item.id)}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>

            {(item.estimatedAmount || item.currency) && (
              <p className="text-sm text-slate-500 mb-2">
                建議售價：{item.estimatedAmount || "-"}
                {item.currency ? ` ${item.currency}` : ""}
              </p>
            )}
            {item.notes && (
              <p className="text-sm text-slate-500 whitespace-pre-wrap mb-2">
                {item.notes}
              </p>
            )}

            {item.purchases.length > 0 ? (
              <div className="text-sm">
                {item.purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700 last:border-0"
                  >
                    <div>
                      <span className="font-medium">{purchase.amount}</span>
                      {purchase.currency && (
                        <span className="text-slate-400 ml-1">
                          {purchase.currency}
                        </span>
                      )}
                      <span className="text-slate-400 ml-2">
                        {formatDate(purchase.date)}
                      </span>
                      {purchase.tripName && (
                        <span className="text-slate-400 ml-1">
                          ({purchase.tripName})
                        </span>
                      )}
                      {purchase.note && (
                        <span className="text-slate-400 ml-1 whitespace-pre-wrap">
                          - {purchase.note}
                        </span>
                      )}
                    </div>
                    <button
                      className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded"
                      onClick={() => deletePurchase(item.id, purchase.id)}
                    >
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

      {editing && (
        <Modal
          title={
            state.items.find((item) => item.id === editing.id)
              ? "編輯喜歡的東西"
              : "新增喜歡的東西"
          }
          onClose={() => setEditing(null)}
        >
          <ItemForm
            item={editing}
            onSave={(item) => {
              const exists = state.items.find((entry) => entry.id === item.id);
              dispatch({
                type: exists ? "UPDATE_ITEM" : "ADD_ITEM",
                item: {
                  ...item,
                  updatedAt: new Date().toISOString(),
                },
              });
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {addingPurchaseTo && (
        <Modal title="新增購買紀錄" onClose={() => setAddingPurchaseTo(null)}>
          <PurchaseForm onSave={(purchase) => addPurchase(addingPurchaseTo, purchase)} />
        </Modal>
      )}
    </div>
  );
}

function ItemForm({
  item,
  onSave,
}: {
  item: Item;
  onSave: (item: Item) => void;
}) {
  const { state } = useApp();
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
        basePath: `tc-images/users/${state.auth.currentUser?.id || "anonymous"}/items/${item.id}`,
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
        <label className="form-label">名稱</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">建議售價</label>
        <input
          className="form-input"
          value={form.estimatedAmount || ""}
          onChange={(event) =>
            setForm({ ...form, estimatedAmount: event.target.value })
          }
        />
      </div>
      <div className="form-group">
        <label className="form-label">幣別</label>
        <input
          className="form-input"
          value={form.currency || ""}
          onChange={(event) => setForm({ ...form, currency: event.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">備註</label>
        <textarea
          className="form-input"
          value={form.notes || ""}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
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
      <button className="btn btn-primary w-full" onClick={handleSave} disabled={saving}>
        {saving ? "儲存中..." : "儲存"}
      </button>
    </div>
  );
}

function PurchaseForm({ onSave }: { onSave: (purchase: Purchase) => void }) {
  const [form, setForm] = useState<Omit<Purchase, "id">>({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    currency: "",
    note: "",
  });

  return (
    <div>
      <div className="form-group">
        <label className="form-label">金額</label>
        <input
          className="form-input"
          value={form.amount}
          onChange={(event) => setForm({ ...form, amount: event.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">幣別</label>
        <input
          className="form-input"
          value={form.currency || ""}
          onChange={(event) => setForm({ ...form, currency: event.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">日期</label>
        <input
          className="form-input"
          type="date"
          value={form.date}
          onChange={(event) => setForm({ ...form, date: event.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">備註</label>
        <input
          className="form-input"
          value={form.note || ""}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
        />
      </div>
      <button
        className="btn btn-primary w-full"
        onClick={() => onSave({ ...form, id: generateId() })}
      >
        儲存
      </button>
    </div>
  );
}
