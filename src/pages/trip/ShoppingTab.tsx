import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faBoxesStacked,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../../context/AppContext";
import { Modal } from "../../components/Modal";
import { FullScreenModal } from "../../components/FullScreenModal";
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
import type { ImageAsset, PendingImageFile } from "../../types/images";
import {
  buildPoolItemFromTripShopping,
  getPoolPromotionCandidates,
  getTripShoppingResolvedContent,
  isLinkedTripShoppingItem,
  type Item,
  type TripShoppingItem,
} from "./shoppingTypes";

interface Props {
  tripId: string;
  viewOnly?: boolean;
}

export function ShoppingTab({ tripId, viewOnly }: Props) {
  const {
    state,
    dispatch,
    setUserTripData,
    setTripMemberData,
    getTripData,
    getUserName,
    isTripAdmin,
    loadTripMemberData,
  } = useApp();
  const trip = state.trips.find((entry) => entry.id === tripId);
  const tripData = getTripData(tripId);
  const items = tripData.shopping || [];
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingItem, setEditingItem] = useState<TripShoppingItem | null>(null);
  const [showAddDraftModal, setShowAddDraftModal] = useState(false);
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewItems, setReviewItems] = useState<
    Array<{ userId: string; item: TripShoppingItem }>
  >([]);

  const canManageTrip = !viewOnly && !!trip && isTripAdmin(trip);
  const unchecked = items.filter((item) => !item.checked);
  const checked = items.filter((item) => item.checked);
  const displayed = showCompleted ? items : unchecked;
  const resolvedDisplayed = displayed.map((item) =>
    getTripShoppingResolvedContent(item, state.items),
  );

  function toggleCheck(id: string) {
    if (viewOnly) return;
    setUserTripData(tripId, {
      shopping: items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    });
  }

  function saveDraftItem(updated: TripShoppingItem) {
    const exists = items.find((item) => item.id === updated.id);
    const nextItems = exists
      ? items.map((item) => (item.id === updated.id ? updated : item))
      : [...items, updated];
    setUserTripData(tripId, { shopping: nextItems });
    setEditingItem(null);
    setShowAddDraftModal(false);
  }

  async function deleteDraftItem(id: string) {
    const currentItem = items.find((item) => item.id === id);
    if (currentItem && !isLinkedTripShoppingItem(currentItem)) {
      await Promise.all(currentItem.images.map((image) => deleteImage(image.path)));
    }
    setUserTripData(tripId, {
      shopping: items.filter((item) => item.id !== id),
    });
    setEditingItem(null);
  }

  function createDraftItem(): TripShoppingItem {
    return {
      id: generateId(),
      textSnapshot: "",
      images: [],
      checked: false,
      createdBy: state.auth.currentUser?.id || "anonymous",
      createdAt: new Date().toISOString(),
    };
  }

  function addPoolItemToTrip(item: Item) {
    const tripItem: TripShoppingItem = {
      id: generateId(),
      itemId: item.id,
      textSnapshot: item.name,
      images: [],
      checked: false,
      createdBy: state.auth.currentUser?.id || "anonymous",
      createdAt: new Date().toISOString(),
    };
    setUserTripData(tripId, { shopping: [...items, tripItem] });
    setShowPoolModal(false);
  }

  async function openReviewModal() {
    if (!trip || !state.auth.currentUser) return;
    const memberData = await loadTripMemberData(tripId);
    const nextItems = Object.entries(memberData).flatMap(([userId, data]) =>
      getPoolPromotionCandidates(data.shopping, state.auth.currentUser!.id).map(
        (item) => ({ userId, item }),
      ),
    );
    setReviewItems(nextItems);
    setShowReviewModal(true);
  }

  async function promoteToPool(candidate: { userId: string; item: TripShoppingItem }) {
    if (!state.auth.currentUser) return;

    const now = new Date().toISOString();
    const poolItemId = generateId();
    const copiedImages = await copyImagesToNewPaths({
      images: candidate.item.images,
      targetBasePath: `tc-images/users/${state.auth.currentUser.id}/items/${poolItemId}`,
      createImageId: generateId,
      createdAt: now,
      fetchBlob: async (url) => {
        const response = await fetch(url);
        return response.blob();
      },
      upload: uploadImage,
      remove: deleteImage,
    });

    dispatch({
      type: "ADD_ITEM",
      item: buildPoolItemFromTripShopping({
        source: candidate.item,
        itemId: poolItemId,
        images: copiedImages,
        now,
      }),
    });

    await setTripMemberData(tripId, candidate.userId, {
      shopping: (await loadTripMemberData(tripId))[candidate.userId].shopping.map(
        (item) =>
          item.id === candidate.item.id
            ? {
                ...item,
                promotedToPoolAt: now,
                promotedBy: state.auth.currentUser!.id,
              }
            : item,
      ),
    });

    setReviewItems((current) =>
      current.map((entry) =>
        entry.userId === candidate.userId && entry.item.id === candidate.item.id
          ? {
              ...entry,
              item: {
                ...entry.item,
                promotedToPoolAt: now,
                promotedBy: state.auth.currentUser!.id,
              },
            }
          : entry,
      ),
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: items.length
                  ? `${(checked.length / items.length) * 100}%`
                  : "0%",
                background:
                  checked.length === items.length && items.length > 0
                    ? "var(--color-success)"
                    : "var(--color-primary)",
              }}
            />
          </div>
        </div>
        <span className="text-xs text-slate-400 w-8 text-right">
          {items.length ? Math.round((checked.length / items.length) * 100) : 0}%
        </span>
        {!viewOnly && (
          <button className="btn-round-add" onClick={() => setShowAddDraftModal(true)}>
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>
        )}
      </div>

      {canManageTrip && (
        <div className="flex gap-2 mb-3">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPoolModal(true)}>
            <FontAwesomeIcon icon={faBoxesStacked} className="mr-1" />
            從魚池加入
          </button>
          <button className="btn btn-secondary btn-sm" onClick={openReviewModal}>
            <FontAwesomeIcon icon={faUsers} className="mr-1" />
            查看大家想買的
          </button>
        </div>
      )}

      <div className="flex gap-1 mb-3 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
        <button
          className={`flex-1 text-xs py-1.5 rounded-md transition-all ${!showCompleted ? "bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm font-medium" : "text-slate-400"}`}
          onClick={() => setShowCompleted(false)}
        >
          未買 ({unchecked.length})
        </button>
        <button
          className={`flex-1 text-xs py-1.5 rounded-md transition-all ${showCompleted ? "bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm font-medium" : "text-slate-400"}`}
          onClick={() => setShowCompleted(true)}
        >
          全部 ({items.length})
        </button>
      </div>

      <div className="card">
        {resolvedDisplayed.map((item) => (
          <div key={item.id} className={`checklist-item ${item.checked ? "checked" : ""}`}>
            {!viewOnly && (
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleCheck(item.id)}
                className="w-5 h-5 flex-shrink-0"
              />
            )}
            {item.images[0] && (
              <img
                src={item.images[0].url}
                alt=""
                className="w-8 h-8 rounded object-cover flex-shrink-0"
              />
            )}
            <button
              type="button"
              className="flex-1 text-left"
              onClick={() => setEditingItem(item.source)}
            >
              <span className="text-sm">{item.name}</span>
              {(item.estimatedAmount || item.currency) && (
                <p className="text-xs text-slate-400">
                  {item.estimatedAmount || "-"}
                  {item.currency ? ` ${item.currency}` : ""}
                </p>
              )}
            </button>
          </div>
        ))}
        {resolvedDisplayed.length === 0 && (
          <div className="py-4 text-center text-sm text-slate-400">
            {showCompleted ? "購物清單是空的" : "全部買好了！"}
          </div>
        )}
      </div>

      {editingItem && (
        <Modal
          title={isLinkedTripShoppingItem(editingItem) ? "魚池項目" : "編輯項目"}
          onClose={() => setEditingItem(null)}
        >
          {isLinkedTripShoppingItem(editingItem) ? (
            <LinkedItemDetail
              item={getTripShoppingResolvedContent(editingItem, state.items)}
              onDelete={() => deleteDraftItem(editingItem.id)}
              canDelete={canManageTrip}
            />
          ) : (
            <DraftShoppingForm
              tripId={tripId}
              item={editingItem}
              onSave={saveDraftItem}
              onCancel={() => setEditingItem(null)}
              onDelete={() => deleteDraftItem(editingItem.id)}
            />
          )}
        </Modal>
      )}

      {showAddDraftModal && (
        <FullScreenModal title="新增本次旅程項目" onClose={() => setShowAddDraftModal(false)}>
          <DraftShoppingForm
            tripId={tripId}
            item={createDraftItem()}
            onSave={saveDraftItem}
            onCancel={() => setShowAddDraftModal(false)}
          />
        </FullScreenModal>
      )}

      {showPoolModal && (
        <FullScreenModal title="從魚池加入" onClose={() => setShowPoolModal(false)}>
          <div className="space-y-3">
            {state.items.length === 0 ? (
              <div className="empty-state">
                <p>魚池目前沒有項目</p>
              </div>
            ) : (
              state.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="card w-full text-left"
                  onClick={() => addPoolItemToTrip(item)}
                >
                  <div className="font-semibold">{item.name}</div>
                  {(item.estimatedAmount || item.currency) && (
                    <div className="text-sm text-slate-500">
                      {item.estimatedAmount || "-"}
                      {item.currency ? ` ${item.currency}` : ""}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </FullScreenModal>
      )}

      {showReviewModal && (
        <FullScreenModal title="大家想買的" onClose={() => setShowReviewModal(false)}>
          <div className="space-y-3">
            {reviewItems.length === 0 ? (
              <div className="empty-state">
                <p>目前沒有其他人新增的購物項目</p>
              </div>
            ) : (
              reviewItems.map((entry) => (
                <div key={`${entry.userId}-${entry.item.id}`} className="card">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="font-semibold">{entry.item.textSnapshot}</div>
                      <div className="text-xs text-slate-400">
                        {getUserName(entry.userId)} 建立於 {formatDate(entry.item.createdAt)}
                      </div>
                    </div>
                    {entry.item.promotedToPoolAt ? (
                      <span className="tag">已收編</span>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => promoteToPool(entry)}
                      >
                        加入魚池
                      </button>
                    )}
                  </div>
                  {(entry.item.estimatedAmount || entry.item.currency) && (
                    <div className="text-sm text-slate-500 mb-2">
                      {entry.item.estimatedAmount || "-"}
                      {entry.item.currency ? ` ${entry.item.currency}` : ""}
                    </div>
                  )}
                  {entry.item.note && (
                    <div className="text-sm text-slate-500 whitespace-pre-wrap mb-2">
                      {entry.item.note}
                    </div>
                  )}
                  <ImageGalleryField images={entry.item.images} />
                </div>
              ))
            )}
          </div>
        </FullScreenModal>
      )}
    </div>
  );
}

function DraftShoppingForm({
  tripId,
  item,
  onSave,
  onCancel,
  onDelete,
}: {
  tripId: string;
  item: TripShoppingItem;
  onSave: (item: TripShoppingItem) => void;
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
        basePath: `tc-images/trips/${tripId}/shopping/${item.id}`,
        createdAt: new Date().toISOString(),
        upload: uploadImage,
        remove: deleteImage,
        onPersist: async (images) => onSave({ ...form, images }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="form-group">
        <label className="form-label">品名</label>
        <input
          className="form-input"
          value={form.textSnapshot}
          onChange={(event) =>
            setForm({ ...form, textSnapshot: event.target.value })
          }
          autoFocus
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
          value={form.note || ""}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
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
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "儲存中..." : "儲存"}
        </button>
      </div>
      {onDelete && (
        <button className="btn btn-secondary btn-danger w-full mt-2" onClick={onDelete}>
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
          刪除
        </button>
      )}
    </div>
  );
}

function LinkedItemDetail({
  item,
  canDelete,
  onDelete,
}: {
  item: ReturnType<typeof getTripShoppingResolvedContent>;
  canDelete: boolean;
  onDelete: () => void;
}) {
  return (
    <div>
      <div className="font-semibold mb-2">{item.name}</div>
      {(item.estimatedAmount || item.currency) && (
        <div className="text-sm text-slate-500 mb-2">
          {item.estimatedAmount || "-"}
          {item.currency ? ` ${item.currency}` : ""}
        </div>
      )}
      {item.note && (
        <div className="text-sm text-slate-500 whitespace-pre-wrap mb-2">
          {item.note}
        </div>
      )}
      <ImageGalleryField images={item.images} />
      {canDelete && (
        <button className="btn btn-secondary btn-danger w-full mt-4" onClick={onDelete}>
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
          從本次旅程移除
        </button>
      )}
    </div>
  );
}
