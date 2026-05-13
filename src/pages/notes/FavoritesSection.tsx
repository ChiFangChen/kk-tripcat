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
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal";
import { generateId } from "../../utils/id";
import { formatDate } from "../../utils/date";
import { ImageGalleryField } from "../../components/ImageGalleryField";
import { MultiImageUpload } from "../../components/MultiImageUpload";
import { deleteImage, uploadImage } from "../../utils/firebase";
import {
  copyImagesToNewPaths,
  createPendingImages,
  persistImagesForRecord,
} from "../../utils/imageUpload";
import type { Purchase } from "../../types";
import type { ImageAsset, PendingImageFile } from "../../types/images";
import {
  detachTripShoppingItemFromPoolItem,
  getFavoriteItems,
  type Item,
  type TripShoppingItem,
} from "../trip/shoppingTypes";

export function FavoritesSection() {
  const {
    state,
    dispatch,
    setUserTripData,
    setTripMemberData,
    loadTripMemberData,
    showToast,
  } = useApp();
  const [editing, setEditing] = useState<Item | null>(null);
  const [addingPurchaseTo, setAddingPurchaseTo] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: "item"; itemId: string }
    | { type: "purchase"; itemId: string; purchaseId: string }
    | null
  >(null);
  const favoriteItems = useMemo(
    () => getFavoriteItems(state.items),
    [state.items],
  );

  async function detachShoppingItemsFromPoolItem({
    tripId,
    shopping,
    item,
  }: {
    tripId: string;
    shopping: TripShoppingItem[];
    item: Item;
  }): Promise<TripShoppingItem[]> {
    let changed = false;
    const nextShopping: TripShoppingItem[] = [];

    for (const shoppingItem of shopping) {
      if (shoppingItem.itemId !== item.id) {
        nextShopping.push(shoppingItem);
        continue;
      }

      changed = true;
      const copiedImages = await copyImagesToNewPaths({
        images: item.images,
        targetBasePath: `tc-images/trips/${tripId}/shopping/${shoppingItem.id}`,
        createImageId: generateId,
        createdAt: new Date().toISOString(),
        fetchBlob: async (url) => {
          const response = await fetch(url);
          return response.blob();
        },
        upload: uploadImage,
        remove: deleteImage,
      });

      nextShopping.push(
        detachTripShoppingItemFromPoolItem({
          tripItem: shoppingItem,
          poolItem: {
            ...item,
            images: copiedImages,
          },
        }),
      );
    }

    return changed ? nextShopping : shopping;
  }

  async function detachTripReferencesBeforeDelete(item: Item) {
    for (const trip of state.trips) {
      const ownTripData = state.userTripData[trip.id];
      if (ownTripData?.shopping.some((entry) => entry.itemId === item.id)) {
        const shopping = await detachShoppingItemsFromPoolItem({
          tripId: trip.id,
          shopping: ownTripData.shopping,
          item,
        });
        setUserTripData(trip.id, { shopping });
      }

      const memberData = await loadTripMemberData(trip.id);
      for (const [userId, data] of Object.entries(memberData)) {
        if (!data.shopping.some((entry) => entry.itemId === item.id)) continue;
        const shopping = await detachShoppingItemsFromPoolItem({
          tripId: trip.id,
          shopping: data.shopping,
          item,
        });
        await setTripMemberData(trip.id, userId, { shopping });
      }
    }
  }

  async function remove(id: string) {
    const item = state.items.find((entry) => entry.id === id);
    if (item) {
      try {
        await detachTripReferencesBeforeDelete(item);
        await Promise.all(item.images.map((image) => deleteImage(image.path)));
      } catch (error) {
        console.error("Failed to detach fish pool item before delete:", error);
        showToast({ type: "error", message: "刪除失敗，請稍後再試" });
        return;
      }
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
        purchases: item.purchases.filter(
          (purchase) => purchase.id !== purchaseId,
        ),
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
                  onClick={() =>
                    setConfirmDelete({ type: "item", itemId: item.id })
                  }
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
                      onClick={() =>
                        setConfirmDelete({
                          type: "purchase",
                          itemId: item.id,
                          purchaseId: purchase.id,
                        })
                      }
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
          <PurchaseForm
            onSave={(purchase) => addPurchase(addingPurchaseTo, purchase)}
          />
        </Modal>
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          title={
            confirmDelete.type === "item" ? "刪除喜歡的東西" : "刪除購買紀錄"
          }
          message={
            confirmDelete.type === "item"
              ? "確定要刪除這個喜歡的東西嗎？圖片也會一起刪除。"
              : "確定要刪除這筆購買紀錄嗎？"
          }
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete.type === "item") {
              remove(confirmDelete.itemId);
            } else {
              deletePurchase(confirmDelete.itemId, confirmDelete.purchaseId);
            }
            setConfirmDelete(null);
          }}
        />
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
          onChange={(event) =>
            setForm({ ...form, currency: event.target.value })
          }
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
      <button
        className="btn btn-primary w-full"
        onClick={handleSave}
        disabled={saving}
      >
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
          onChange={(event) =>
            setForm({ ...form, currency: event.target.value })
          }
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
