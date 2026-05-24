import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faStar,
  faTrash,
  faBoxesStacked,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../../context/AppContext";
import { Modal } from "../../components/Modal";
import { FullScreenModal } from "../../components/FullScreenModal";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal";
import { generateId } from "../../utils/id";
import { formatDate } from "../../utils/date";
import { shoppingThumbnailClassName } from "../../utils/imageDisplayClasses";
import { ImageGalleryField } from "../../components/ImageGalleryField";
import { LoadingImage } from "../../components/LoadingImage";
import { MultiImageUpload } from "../../components/MultiImageUpload";
import { useDoubleTap } from "../../hooks/useDoubleTap";
import { deleteImage, uploadImage } from "../../utils/firebase";
import {
  createPendingImages,
  persistImagesForRecord,
} from "../../utils/imageUpload";
import type { ImageAsset, PendingImageFile } from "../../types/images";
import {
  canShowShoppingModalRemoveAction,
  getInitialShoppingModalMode,
  getShoppingModalTitle,
  getShoppingModalModeAfterTitleDoubleClick,
  type ShoppingModalMode,
} from "./shoppingModal";
import {
  buildPoolItemFromTripShopping,
  getOwnPoolPromotionCandidates,
  getPoolPromotionCandidates,
  getTripShoppingResolvedContent,
  isLinkedTripShoppingItem,
  linkTripShoppingItemToPoolItem,
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
    setItems,
    setUserTripData,
    setTripMemberData,
    getTripData,
    getUserName,
    isTripAdmin,
    loadTripMemberData,
    showToast,
  } = useApp();
  const trip = state.trips.find((entry) => entry.id === tripId);
  const tripData = getTripData(tripId);
  const items = tripData.shopping || [];
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingItem, setEditingItem] = useState<TripShoppingItem | null>(null);
  const [shoppingModalMode, setShoppingModalMode] =
    useState<ShoppingModalMode>("view");
  const [showAddDraftModal, setShowAddDraftModal] = useState(false);
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(
    null,
  );
  const modalTitleDoubleTap = useDoubleTap();
  const [reviewItems, setReviewItems] = useState<
    Array<{ userId: string; item: TripShoppingItem }>
  >([]);
  const [promotingItemIds, setPromotingItemIds] = useState<Set<string>>(
    () => new Set(),
  );

  const canManageTrip = !viewOnly && !!trip && isTripAdmin(trip);
  const unchecked = items.filter((item) => !item.checked);
  const checked = items.filter((item) => item.checked);
  const displayed = showCompleted ? items : unchecked;
  const resolvedDisplayed = displayed.map((item) =>
    getTripShoppingResolvedContent(item, state.items),
  );
  const linkedPoolItemIds = new Set(
    items
      .map((item) => item.itemId)
      .filter((itemId): itemId is string => Boolean(itemId)),
  );
  const availablePoolItems = state.items.filter(
    (item) => !linkedPoolItemIds.has(item.id),
  );
  const ownPromotionCandidateIds = new Set(
    state.auth.currentUser
      ? getOwnPoolPromotionCandidates(items, state.auth.currentUser.id).map(
          (item) => item.id,
        )
      : [],
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
    setShoppingModalMode("view");
    setShowAddDraftModal(false);
  }

  async function savePoolItem(updated: Item) {
    try {
      await setItems(
        state.items.map((item) =>
          item.id === updated.id
            ? {
                ...updated,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("Failed to sync pool item:", error);
      showToast({ type: "error", message: "儲存失敗，請稍後再試" });
      return;
    }
    setEditingItem(null);
    setShoppingModalMode("view");
  }

  async function deleteDraftItem(id: string) {
    const currentItem = items.find((item) => item.id === id);
    if (currentItem && !isLinkedTripShoppingItem(currentItem)) {
      await Promise.all(
        currentItem.images.map((image) => deleteImage(image.path)),
      );
    }
    setUserTripData(tripId, {
      shopping: items.filter((item) => item.id !== id),
    });
    setEditingItem(null);
    setShoppingModalMode("view");
  }

  function openShoppingItemModal(item: TripShoppingItem) {
    setEditingItem(item);
    setShoppingModalMode(getInitialShoppingModalMode());
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

  function renderShoppingItemTitle(
    name: string,
    brand?: string,
    spec?: string,
  ) {
    return (
      <span className="shopping-item-title">
        {brand && <span className="shopping-item-brand">{brand}</span>}
        <span className="shopping-item-name">{name}</span>
        {spec && <span className="shopping-item-spec">{spec}</span>}
      </span>
    );
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

  async function promoteToPool(candidate: {
    userId: string;
    item: TripShoppingItem;
  }) {
    if (!state.auth.currentUser) return;

    try {
      const now = new Date().toISOString();
      const poolItemId = generateId();
      const poolItem = buildPoolItemFromTripShopping({
        source: candidate.item,
        itemId: poolItemId,
        images: candidate.item.images,
        now,
      });

      await setItems([poolItem, ...state.items]);

      await setTripMemberData(tripId, candidate.userId, {
        shopping: (await loadTripMemberData(tripId))[
          candidate.userId
        ].shopping.map((item) =>
          item.id === candidate.item.id
            ? linkTripShoppingItemToPoolItem({
                tripItem: item,
                poolItemId,
              })
            : item,
        ),
      });

      setReviewItems((current) =>
        current.map((entry) =>
          entry.userId === candidate.userId &&
          entry.item.id === candidate.item.id
            ? {
                ...entry,
                item: linkTripShoppingItemToPoolItem({
                  tripItem: entry.item,
                  poolItemId,
                }),
              }
            : entry,
        ),
      );
    } catch (error) {
      console.error("Failed to promote member shopping item to pool:", error);
      showToast({ type: "error", message: "加入魚池失敗，請稍後再試" });
    }
  }

  async function promoteOwnItemToPool(item: TripShoppingItem) {
    if (
      !state.auth.currentUser ||
      !ownPromotionCandidateIds.has(item.id) ||
      promotingItemIds.has(item.id)
    ) {
      return;
    }

    setPromotingItemIds((current) => new Set(current).add(item.id));
    try {
      const now = new Date().toISOString();
      const poolItemId = generateId();
      const poolItem = buildPoolItemFromTripShopping({
        source: item,
        itemId: poolItemId,
        images: item.images,
        now,
      });

      await setItems([poolItem, ...state.items]);

      setUserTripData(tripId, {
        shopping: items.map((entry) =>
          entry.id === item.id
            ? linkTripShoppingItemToPoolItem({
                tripItem: entry,
                poolItemId,
              })
            : entry,
        ),
      });
      showToast({ type: "success", message: "已加入魚池" });
    } catch (error) {
      console.error("Failed to promote shopping item to pool:", error);
      showToast({ type: "error", message: "加入魚池失敗，請稍後再試" });
    } finally {
      setPromotingItemIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  const confirmDeleteItem = confirmDeleteItemId
    ? items.find((item) => item.id === confirmDeleteItemId)
    : undefined;

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
          {items.length ? Math.round((checked.length / items.length) * 100) : 0}
          %
        </span>
        {!viewOnly && (
          <button
            className="btn-round-add"
            onClick={() => setShowAddDraftModal(true)}
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>
        )}
      </div>

      {canManageTrip && (
        <div className="flex gap-2 mb-3">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowPoolModal(true)}
          >
            <FontAwesomeIcon icon={faBoxesStacked} className="mr-1" />
            從魚池加入
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={openReviewModal}
          >
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
        {resolvedDisplayed.map((item) => {
          const linked = isLinkedTripShoppingItem(item.source);
          const canShowStar =
            canManageTrip &&
            state.auth.currentUser?.id === item.source.createdBy;
          const canPromoteOwnItem = canShowStar && !linked;
          const promoting = promotingItemIds.has(item.source.id);
          const promoted = linked;
          const starLabel = promoting
            ? "加入魚池中"
            : promoted
              ? "已加入魚池"
              : "加入魚池";

          return (
            <div
              key={item.id}
              className={`checklist-item ${item.checked ? "checked" : ""}`}
            >
              {!viewOnly && (
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleCheck(item.id)}
                  className="w-5 h-5"
                />
              )}
              <button
                type="button"
                className="flex flex-1 items-center gap-2 text-left min-w-0"
                onClick={() => openShoppingItemModal(item.source)}
              >
                {item.images[0] && (
                  <LoadingImage
                    src={item.images[0].url}
                    alt=""
                    width={40}
                    height={40}
                    fit="cover"
                    frameClassName="shopping-thumbnail-frame w-10 h-10 flex-shrink-0"
                    frameContentClassName="h-full"
                    imageClassName={shoppingThumbnailClassName}
                  />
                )}
                <span className="min-w-0 flex-1">
                  {renderShoppingItemTitle(item.name, item.brand, item.spec)}
                  {(item.estimatedAmount || item.currency) && (
                    <span className="block text-xs text-slate-400">
                      {item.estimatedAmount || "-"}
                      {item.currency ? ` ${item.currency}` : ""}
                    </span>
                  )}
                </span>
              </button>
              {canShowStar && (
                <button
                  type="button"
                  className={`star-btn ${promoting || promoted ? "active" : ""}`}
                  aria-label={starLabel}
                  title={starLabel}
                  disabled={promoting || promoted}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!canPromoteOwnItem) return;
                    void promoteOwnItemToPool(item.source);
                  }}
                >
                  <FontAwesomeIcon icon={faStar} />
                </button>
              )}
            </div>
          );
        })}
        {resolvedDisplayed.length === 0 && (
          <div className="py-4 text-center text-sm text-slate-400">
            {showCompleted ? "購物清單是空的" : "全部買好了！"}
          </div>
        )}
      </div>

      {editingItem &&
        (() => {
          const resolvedItem = getTripShoppingResolvedContent(
            editingItem,
            state.items,
          );
          const linkedPoolItem = editingItem.itemId
            ? state.items.find((item) => item.id === editingItem.itemId)
            : undefined;
          const titleText = getShoppingModalTitle(
            shoppingModalMode,
            editingItem,
            resolvedItem.name,
          );
          const handleTitleDoubleClick = () =>
            setShoppingModalMode((current) =>
              getShoppingModalModeAfterTitleDoubleClick(editingItem, current),
            );

          return (
            <Modal
              title={
                shoppingModalMode === "view" ? (
                  <button
                    type="button"
                    className="modal-title-action"
                    onClick={modalTitleDoubleTap(
                      `shopping-modal-title-${editingItem.id}`,
                      handleTitleDoubleClick,
                    )}
                  >
                    {renderShoppingItemTitle(
                      resolvedItem.name,
                      resolvedItem.brand,
                      resolvedItem.spec,
                    )}
                  </button>
                ) : (
                  titleText
                )
              }
              onClose={() => {
                setEditingItem(null);
                setShoppingModalMode("view");
              }}
            >
              {shoppingModalMode === "edit" && linkedPoolItem ? (
                <PoolItemForm
                  item={linkedPoolItem}
                  onSave={savePoolItem}
                  onCancel={() => setShoppingModalMode("view")}
                  onDelete={
                    canShowShoppingModalRemoveAction(
                      shoppingModalMode,
                      canManageTrip,
                    )
                      ? () => setConfirmDeleteItemId(editingItem.id)
                      : undefined
                  }
                />
              ) : shoppingModalMode === "edit" &&
                !isLinkedTripShoppingItem(editingItem) ? (
                <DraftShoppingForm
                  tripId={tripId}
                  item={editingItem}
                  onSave={saveDraftItem}
                  onCancel={() => setShoppingModalMode("view")}
                  onDelete={
                    canShowShoppingModalRemoveAction(
                      shoppingModalMode,
                      canManageTrip,
                    )
                      ? () => setConfirmDeleteItemId(editingItem.id)
                      : undefined
                  }
                />
              ) : (
                <ShoppingItemDetail item={resolvedItem} />
              )}
            </Modal>
          );
        })()}

      {showAddDraftModal && (
        <FullScreenModal
          title="新增本次旅程項目"
          onClose={() => setShowAddDraftModal(false)}
        >
          <DraftShoppingForm
            tripId={tripId}
            item={createDraftItem()}
            onSave={saveDraftItem}
            onCancel={() => setShowAddDraftModal(false)}
          />
        </FullScreenModal>
      )}

      {showPoolModal && (
        <FullScreenModal
          title="從魚池加入"
          onClose={() => setShowPoolModal(false)}
        >
          <div className="space-y-3">
            {availablePoolItems.length === 0 ? (
              <div className="empty-state">
                <p>魚池目前沒有項目</p>
              </div>
            ) : (
              availablePoolItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="card w-full text-left flex items-center gap-3"
                  onClick={() => addPoolItemToTrip(item)}
                >
                  {item.images[0] && (
                    <LoadingImage
                      src={item.images[0].url}
                      alt=""
                      width={48}
                      height={48}
                      fit="cover"
                      frameClassName="shopping-thumbnail-frame w-12 h-12 flex-shrink-0"
                      frameContentClassName="h-full"
                      imageClassName={shoppingThumbnailClassName}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    {renderShoppingItemTitle(item.name, item.brand, item.spec)}
                    {(item.estimatedAmount || item.currency) && (
                      <span className="block text-sm text-slate-500">
                        {item.estimatedAmount || "-"}
                        {item.currency ? ` ${item.currency}` : ""}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </FullScreenModal>
      )}

      {showReviewModal && (
        <FullScreenModal
          title="大家想買的"
          onClose={() => setShowReviewModal(false)}
        >
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
                      <div className="font-semibold">
                        {entry.item.textSnapshot}
                      </div>
                      <div className="text-xs text-slate-400">
                        {getUserName(entry.userId)} 建立於{" "}
                        {formatDate(entry.item.createdAt)}
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
                  {(entry.item.brand || entry.item.spec) && (
                    <div className="text-sm text-slate-500 mb-2">
                      {[entry.item.brand, entry.item.spec]
                        .filter(Boolean)
                        .join(" / ")}
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
      {confirmDeleteItemId && (
        <ConfirmDeleteModal
          title="刪除購物項目"
          message={
            confirmDeleteItem && isLinkedTripShoppingItem(confirmDeleteItem)
              ? "確定要從這趟旅程刪除這個購物項目嗎？魚池項目不會被刪除。"
              : "確定要刪除這個購物項目嗎？圖片也會一起刪除。"
          }
          onCancel={() => setConfirmDeleteItemId(null)}
          onConfirm={() => {
            deleteDraftItem(confirmDeleteItemId);
            setConfirmDeleteItemId(null);
          }}
        />
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
          刪除
        </button>
      )}
    </div>
  );
}

function PoolItemForm({
  item,
  onSave,
  onCancel,
  onDelete,
}: {
  item: Item;
  onSave: (item: Item) => void;
  onCancel: () => void;
  onDelete?: () => void;
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
        onPersist: async (images) => onSave({ ...form, images }),
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
          autoFocus
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
          刪除
        </button>
      )}
    </div>
  );
}

export function ShoppingItemDetail({
  item,
}: {
  item: ReturnType<typeof getTripShoppingResolvedContent>;
}) {
  return (
    <div>
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
    </div>
  );
}
