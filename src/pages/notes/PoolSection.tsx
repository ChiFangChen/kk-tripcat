import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faPlus,
  faPen,
  faReceipt,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../../context/AppContext";
import { Modal } from "../../components/Modal";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal";
import { generateId } from "../../utils/id";
import { formatDate } from "../../utils/date";
import { LoadingImage } from "../../components/LoadingImage";
import { MultiImageUpload } from "../../components/MultiImageUpload";
import { deleteImage, uploadImage } from "../../utils/firebase";
import {
  copyImagesToNewPaths,
  createPendingImages,
  persistImagesForRecord,
} from "../../utils/imageUpload";
import { shoppingThumbnailClassName } from "../../utils/imageDisplayClasses";
import type { Purchase } from "../../types";
import type { ImageAsset, PendingImageFile } from "../../types/images";
import {
  buildShoppingPriceBadges,
  detachTripShoppingItemFromPoolItem,
  type Item,
  type TripShoppingItem,
} from "../trip/shoppingTypes";

export function PoolSection() {
  const {
    state,
    firebaseConnected,
    setItems,
    setUserTripData,
    setTripMemberData,
    loadTripMemberData,
    showToast,
  } = useApp();
  const [editing, setEditing] = useState<Item | null>(null);
  const [addingPurchaseTo, setAddingPurchaseTo] = useState<string | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<{
    itemId: string;
    purchase: Purchase;
  } | null>(null);
  const [expandedPurchaseIds, setExpandedPurchaseIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: "item"; itemId: string }
    | { type: "purchase"; itemId: string; purchaseId: string }
    | null
  >(null);
  const poolItems = state.items;

  function warnReadOnly() {
    showToast({ type: "info", message: "離線時只能查看魚池" });
  }

  function togglePurchaseHistory(itemId: string) {
    setExpandedPurchaseIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

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
    if (!firebaseConnected) {
      warnReadOnly();
      return;
    }
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
    try {
      await setItems(state.items.filter((entry) => entry.id !== id));
    } catch (error) {
      console.error("Failed to sync fish pool item delete:", error);
      showToast({ type: "error", message: "刪除失敗，請稍後再試" });
      return;
    }
    setEditing(null);
  }

  async function addPurchase(itemId: string, purchase: Purchase) {
    if (!firebaseConnected) {
      warnReadOnly();
      return;
    }
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;
    await setItems(
      state.items.map((entry) =>
        entry.id === itemId
          ? { ...item, purchases: [purchase, ...item.purchases] }
          : entry,
      ),
    );
    setAddingPurchaseTo(null);
  }

  async function deletePurchase(itemId: string, purchaseId: string) {
    if (!firebaseConnected) {
      warnReadOnly();
      return;
    }
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;
    await setItems(
      state.items.map((entry) =>
        entry.id === itemId
          ? {
              ...item,
              purchases: item.purchases.filter(
                (purchase) => purchase.id !== purchaseId,
              ),
            }
          : entry,
      ),
    );
  }

  async function updatePurchase(itemId: string, purchase: Purchase) {
    if (!firebaseConnected) {
      warnReadOnly();
      return;
    }
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;
    await setItems(
      state.items.map((entry) =>
        entry.id === itemId
          ? {
              ...item,
              purchases: item.purchases.map((entry) =>
                entry.id === purchase.id ? purchase : entry,
              ),
            }
          : entry,
      ),
    );
    setEditingPurchase(null);
  }

  function newPoolItem(): Item {
    const now = new Date().toISOString();
    return {
      id: generateId(),
      name: "",
      images: [],
      purchases: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  return (
    <div>
      <div className="flex justify-end items-center mb-4">
        <button
          className="btn-round-add"
          onClick={() => {
            if (!firebaseConnected) {
              warnReadOnly();
              return;
            }
            setEditing(newPoolItem());
          }}
          disabled={!firebaseConnected}
          aria-disabled={!firebaseConnected}
          title={firebaseConnected ? "新增魚池項目" : "離線時只能查看魚池"}
        >
          <FontAwesomeIcon icon={faPlus} className="text-xs" />
        </button>
      </div>

      {poolItems.length === 0 ? (
        <div className="empty-state">
          <p>魚池目前沒有項目</p>
        </div>
      ) : (
        <div className="pool-item-list">
          {poolItems.map((item) => {
            const priceBadges = buildShoppingPriceBadges({
              estimatedAmount: item.estimatedAmount,
              currency: item.currency,
              purchases: item.purchases,
            });
            const purchaseHistoryExpanded = expandedPurchaseIds.has(item.id);

            return (
              <div key={item.id} className="pool-item-row">
                <div className="pool-item-main">
                  <div className="pool-item-body">
                    {item.images[0] ? (
                      <LoadingImage
                        src={item.images[0].url}
                        alt=""
                        width={56}
                        height={56}
                        fit="cover"
                        frameClassName="shopping-thumbnail-frame pool-item-thumbnail"
                        frameContentClassName="h-full"
                        imageClassName={shoppingThumbnailClassName}
                      />
                    ) : (
                      <div className="pool-item-thumbnail-placeholder" />
                    )}
                    <div className="pool-item-content">
                      <div className="pool-item-title-row">
                        <h3 className="pool-item-title">
                          {item.brand && (
                            <span className="shopping-item-brand">
                              {item.brand}
                            </span>
                          )}
                          <span className="shopping-item-name">
                            {item.name}
                          </span>
                          {item.spec && (
                            <span className="shopping-item-spec">
                              {item.spec}
                            </span>
                          )}
                        </h3>
                      </div>
                      <div className="pool-item-meta">
                        {priceBadges.map((badge) => (
                          <span key={badge.label}>
                            <span className="price-badge">{badge.label}</span>
                            <span>{badge.value}</span>
                          </span>
                        ))}
                      </div>
                      {item.notes && (
                        <p className="pool-item-note">{item.notes}</p>
                      )}
                    </div>
                    <div className="pool-item-actions">
                      <button
                        className="pool-item-icon-button"
                        onClick={() => setEditing(item)}
                        disabled={!firebaseConnected}
                        aria-label="編輯魚池項目"
                        title={
                          firebaseConnected
                            ? "編輯魚池項目"
                            : "離線時只能查看魚池"
                        }
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button
                        className="pool-item-icon-button"
                        onClick={() =>
                          setConfirmDelete({ type: "item", itemId: item.id })
                        }
                        disabled={!firebaseConnected}
                        aria-label="刪除魚池項目"
                        title={
                          firebaseConnected
                            ? "刪除魚池項目"
                            : "離線時只能查看魚池"
                        }
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                  <div className="pool-item-history">
                    <button
                      className="btn-round-add !w-7 !h-7"
                      onClick={() => setAddingPurchaseTo(item.id)}
                      disabled={!firebaseConnected}
                      aria-label="新增購買紀錄"
                      title={
                        firebaseConnected
                          ? "新增購買紀錄"
                          : "離線時只能查看魚池"
                      }
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                    </button>
                    {item.purchases.length > 0 && (
                      <button
                        className="pool-item-history-button"
                        onClick={() => togglePurchaseHistory(item.id)}
                        aria-label={
                          purchaseHistoryExpanded
                            ? "收合購買紀錄"
                            : "展開購買紀錄"
                        }
                        title={
                          purchaseHistoryExpanded
                            ? "收合購買紀錄"
                            : "展開購買紀錄"
                        }
                      >
                        <FontAwesomeIcon icon={faReceipt} />
                        <FontAwesomeIcon
                          icon={
                            purchaseHistoryExpanded
                              ? faChevronUp
                              : faChevronDown
                          }
                          className="text-[10px]"
                        />
                      </button>
                    )}
                  </div>
                </div>

                {purchaseHistoryExpanded && (
                  <div className="pool-purchase-history">
                    {item.purchases.map((purchase) => (
                      <div key={purchase.id} className="pool-purchase-row">
                        <div className="pool-purchase-content">
                          <span>{formatDate(purchase.date)}</span>
                          <span className="font-medium">
                            {formatPurchaseAmount(purchase)}
                          </span>
                          {purchase.tripName && (
                            <span>{purchase.tripName}</span>
                          )}
                          {purchase.note && (
                            <span className="pool-purchase-note">
                              {purchase.note}
                            </span>
                          )}
                        </div>
                        <div className="pool-purchase-actions">
                          <button
                            className="pool-item-icon-button"
                            onClick={() =>
                              setEditingPurchase({
                                itemId: item.id,
                                purchase,
                              })
                            }
                            disabled={!firebaseConnected}
                            aria-label="編輯購買紀錄"
                            title={
                              firebaseConnected
                                ? "編輯購買紀錄"
                                : "離線時只能查看魚池"
                            }
                          >
                            <FontAwesomeIcon icon={faPen} />
                          </button>
                          <button
                            className="pool-item-icon-button"
                            onClick={() =>
                              setConfirmDelete({
                                type: "purchase",
                                itemId: item.id,
                                purchaseId: purchase.id,
                              })
                            }
                            disabled={!firebaseConnected}
                            aria-label="刪除購買紀錄"
                            title={
                              firebaseConnected
                                ? "刪除購買紀錄"
                                : "離線時只能查看魚池"
                            }
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal
          title={
            state.items.find((item) => item.id === editing.id)
              ? "編輯魚池項目"
              : "新增魚池項目"
          }
          onClose={() => setEditing(null)}
        >
          <ItemForm
            item={editing}
            onSave={async (item) => {
              if (!firebaseConnected) {
                warnReadOnly();
                return;
              }
              const exists = state.items.find((entry) => entry.id === item.id);
              const nextItem = {
                ...item,
                updatedAt: new Date().toISOString(),
              };
              const nextItems = exists
                ? state.items.map((entry) =>
                    entry.id === item.id ? nextItem : entry,
                  )
                : [nextItem, ...state.items];
              await setItems(nextItems);
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
      {editingPurchase && (
        <Modal title="編輯購買紀錄" onClose={() => setEditingPurchase(null)}>
          <PurchaseForm
            purchase={editingPurchase.purchase}
            onSave={(purchase) =>
              updatePurchase(editingPurchase.itemId, purchase)
            }
          />
        </Modal>
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          title={
            confirmDelete.type === "item" ? "刪除魚池項目" : "刪除購買紀錄"
          }
          message={
            confirmDelete.type === "item"
              ? "確定要刪除這個魚池項目嗎？圖片也會一起刪除。"
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

function formatPurchaseAmount(purchase: Purchase): string {
  return [purchase.amount, purchase.currency].filter(Boolean).join(" ");
}

function ItemForm({
  item,
  onSave,
}: {
  item: Item;
  onSave: (item: Item) => void | Promise<void>;
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
          await onSave({ ...form, images });
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
        <label className="form-label">品牌</label>
        <input
          className="form-input"
          value={form.brand || ""}
          onChange={(event) =>
            setForm({ ...form, brand: event.target.value })
          }
        />
      </div>
      <div className="form-group">
        <label className="form-label">規格</label>
        <input
          className="form-input"
          value={form.spec || ""}
          onChange={(event) => setForm({ ...form, spec: event.target.value })}
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

function PurchaseForm({
  purchase,
  onSave,
}: {
  purchase?: Purchase;
  onSave: (purchase: Purchase) => void | Promise<void>;
}) {
  const [form, setForm] = useState<Omit<Purchase, "id">>(() => ({
    date: purchase?.date ?? new Date().toISOString().split("T")[0],
    amount: purchase?.amount ?? "",
    currency: purchase?.currency ?? "",
    tripId: purchase?.tripId,
    tripName: purchase?.tripName,
    note: purchase?.note ?? "",
  }));

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
        onClick={() => {
          void onSave({ ...form, id: purchase?.id ?? generateId() });
        }}
      >
        儲存
      </button>
    </div>
  );
}
