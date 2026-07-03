import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faPen,
  faReceipt,
  faStar,
  faTrash,
  faBoxesStacked,
  faUsers,
  faLock,
  faArrowsRotate,
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
import { EditIconButton } from "../../components/EditIconButton";
import { UserAvatar } from "../../components/UserAvatar";
import { SwitchControl } from "../../components/SwitchControl";
import { useDoubleTap } from "../../hooks/useDoubleTap";
import { deleteImage, uploadImage } from "../../utils/firebase";
import {
  copyImagesToNewPaths,
  createPendingImages,
  persistImagesForRecord,
} from "../../utils/imageUpload";
import type { Purchase } from "../../types";
import type { ImageAsset, PendingImageFile } from "../../types/images";
import {
  canShowShoppingModalRemoveAction,
  getInitialShoppingModalMode,
  getShoppingModalTitle,
  getShoppingModalModeAfterTitleDoubleClick,
  type ShoppingModalMode,
} from "./shoppingModal";
import { PoolItemTagsField } from "./PoolItemTagsField";
import {
  buildPoolItemFromTripShopping,
  buildShoppingPriceBadges,
  filterPoolItemsByTags,
  getOwnPoolPromotionCandidates,
  getPoolItemTags,
  getWishlistShareCandidates,
  getTripShoppingResolvedContent,
  isLinkedTripShoppingItem,
  linkTripShoppingItemToPoolItem,
  normalizePoolItemTags,
  type Item,
  type TripShoppingItem,
} from "./shoppingTypes";

interface Props {
  tripId: string;
  viewOnly?: boolean;
  hideEditButtons?: boolean;
}

export function ShoppingTab({ tripId, viewOnly, hideEditButtons }: Props) {
  const { t } = useTranslation();
  const {
    state,
    setItems,
    setUserTripData,
    getTripData,
    getUserName,
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
  const [selectedPoolTags, setSelectedPoolTags] = useState<string[]>([]);
  const [includeUntagged, setIncludeUntagged] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(
    null,
  );
  const [purchaseHistoryItemId, setPurchaseHistoryItemId] = useState<
    string | null
  >(null);
  const [addingPurchaseTo, setAddingPurchaseTo] = useState<string | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<{
    itemId: string;
    purchase: Purchase;
  } | null>(null);
  const [confirmDeletePurchase, setConfirmDeletePurchase] = useState<{
    itemId: string;
    purchaseId: string;
  } | null>(null);
  const modalTitleDoubleTap = useDoubleTap();
  const [reviewItems, setReviewItems] = useState<
    Array<{ userId: string; item: TripShoppingItem }>
  >([]);
  const [copiedItemIds, setCopiedItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedReviewUsers, setSelectedReviewUsers] = useState<string[]>([]);
  const [syncingItemIds, setSyncingItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmSyncEntry, setConfirmSyncEntry] = useState<{
    userId: string;
    item: TripShoppingItem;
  } | null>(null);
  const [promotingItemIds, setPromotingItemIds] = useState<Set<string>>(
    () => new Set(),
  );

  const reviewUserIds = [...new Set(reviewItems.map((entry) => entry.userId))];
  const shownReviewItems =
    selectedReviewUsers.length === 0
      ? reviewItems
      : reviewItems.filter((entry) =>
          selectedReviewUsers.includes(entry.userId),
        );
  const copiedSourceIds = new Set(
    items
      .map((item) => item.copiedFrom)
      .filter((id): id is string => Boolean(id)),
  );
  const myItemIds = new Set(items.map((item) => item.id));
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
  const poolTagOptions = normalizePoolItemTags([
    ...selectedPoolTags,
    ...getPoolItemTags(state.items),
  ]);
  const hasUntaggedPoolItem = availablePoolItems.some(
    (item) => normalizePoolItemTags(item.tags).length === 0,
  );
  const filteredAvailablePoolItems = filterPoolItemsByTags(
    availablePoolItems,
    selectedPoolTags,
    { includeUntagged },
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
      showToast({ type: "error", message: t("shopping.saveFailed") });
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
      private: false,
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
      private: false,
      createdBy: state.auth.currentUser?.id || "anonymous",
      createdAt: new Date().toISOString(),
    };
    setUserTripData(tripId, { shopping: [...items, tripItem] });
    setShowPoolModal(false);
  }

  function openPoolModal() {
    const country = trip?.country?.trim();
    const countryHasItems =
      !!country &&
      availablePoolItems.some((item) =>
        normalizePoolItemTags(item.tags).includes(country),
      );
    setSelectedPoolTags(countryHasItems ? [country] : []);
    setIncludeUntagged(false);
    setShowPoolModal(true);
  }

  function toggleSelectedPoolTag(tag: string) {
    setSelectedPoolTags((current) => {
      if (current.includes(tag)) {
        return current.filter((entry) => entry !== tag);
      }
      return normalizePoolItemTags([...current, tag]);
    });
  }

  function toggleReviewUser(userId: string) {
    setSelectedReviewUsers((current) =>
      current.includes(userId)
        ? current.filter((entry) => entry !== userId)
        : [...current, userId],
    );
  }

  async function openReviewModal() {
    if (!trip || !state.auth.currentUser) return;
    const memberData = await loadTripMemberData(tripId);
    const nextItems = Object.entries(memberData).flatMap(([userId, data]) =>
      getWishlistShareCandidates(data.shopping).map((item) => ({
        userId,
        item,
      })),
    );
    setReviewItems(nextItems);
    setCopiedItemIds(new Set());
    setSelectedReviewUsers([]);
    setShowReviewModal(true);
  }

  async function copyToMyList(candidate: {
    userId: string;
    item: TripShoppingItem;
  }) {
    if (!state.auth.currentUser || copiedItemIds.has(candidate.item.id)) return;
    setCopiedItemIds((current) => new Set(current).add(candidate.item.id));

    try {
      const now = new Date().toISOString();
      const newId = generateId();
      const source = candidate.item;
      const draft: TripShoppingItem = {
        id: newId,
        textSnapshot: source.textSnapshot,
        images: [],
        checked: false,
        private: false,
        copiedFrom: source.id,
        createdBy: state.auth.currentUser.id,
        createdAt: now,
      };
      if (source.brand !== undefined) draft.brand = source.brand;
      if (source.spec !== undefined) draft.spec = source.spec;
      if (source.purchaseAmount !== undefined)
        draft.purchaseAmount = source.purchaseAmount;
      if (source.purchaseCurrency !== undefined)
        draft.purchaseCurrency = source.purchaseCurrency;
      if (source.estimatedAmount !== undefined)
        draft.estimatedAmount = source.estimatedAmount;
      if (source.currency !== undefined) draft.currency = source.currency;
      if (source.note !== undefined) draft.note = source.note;

      // Prefer an owned copy of the image bytes. That re-download can be
      // blocked by the storage bucket CORS on non-allowed origins, so on
      // failure we fall back to referencing the original image URL (path left
      // empty so deleting this copy never removes someone else's original).
      if (source.images.length > 0) {
        try {
          draft.images = await copyImagesToNewPaths({
            images: source.images,
            targetBasePath: `tc-images/trips/${tripId}/shopping/${newId}`,
            createImageId: generateId,
            createdAt: now,
            fetchBlob: async (url) => {
              const response = await fetch(url);
              return response.blob();
            },
            upload: uploadImage,
            remove: deleteImage,
          });
        } catch (imageError) {
          console.error(
            "Failed to copy image bytes; referencing originals instead:",
            imageError,
          );
          draft.images = source.images.map((image) => ({
            id: generateId(),
            url: image.url,
            path: "",
            createdAt: now,
            width: image.width,
            height: image.height,
          }));
        }
      }

      setUserTripData(tripId, { shopping: [...items, draft] });
      showToast({ type: "success", message: t("shopping.copiedToMyList") });
    } catch (error) {
      console.error("Failed to copy member shopping item to my list:", error);
      showToast({ type: "error", message: t("shopping.copyFailed") });
      setCopiedItemIds((current) => {
        const next = new Set(current);
        next.delete(candidate.item.id);
        return next;
      });
    }
  }

  // Original owner pulls the (possibly edited) content + images from someone
  // who copied this item, overwriting their own item to match.
  async function syncFromCopy(candidate: {
    userId: string;
    item: TripShoppingItem;
  }) {
    if (!state.auth.currentUser) return;
    const targetId = candidate.item.copiedFrom;
    if (!targetId || syncingItemIds.has(targetId)) return;
    const myItem = items.find((item) => item.id === targetId);
    if (!myItem) return;

    setSyncingItemIds((current) => new Set(current).add(targetId));
    try {
      const now = new Date().toISOString();
      const source = candidate.item;
      const synced: TripShoppingItem = {
        id: myItem.id,
        textSnapshot: source.textSnapshot,
        images: [],
        checked: myItem.checked,
        createdBy: myItem.createdBy,
        createdAt: myItem.createdAt,
      };
      // Keep the owner's own state; take content from the copier.
      if (myItem.itemId !== undefined) synced.itemId = myItem.itemId;
      if (myItem.private !== undefined) synced.private = myItem.private;
      if (source.brand !== undefined) synced.brand = source.brand;
      if (source.spec !== undefined) synced.spec = source.spec;
      if (source.purchaseAmount !== undefined)
        synced.purchaseAmount = source.purchaseAmount;
      if (source.purchaseCurrency !== undefined)
        synced.purchaseCurrency = source.purchaseCurrency;
      if (source.estimatedAmount !== undefined)
        synced.estimatedAmount = source.estimatedAmount;
      if (source.currency !== undefined) synced.currency = source.currency;
      if (source.note !== undefined) synced.note = source.note;

      if (source.images.length > 0) {
        try {
          synced.images = await copyImagesToNewPaths({
            images: source.images,
            targetBasePath: `tc-images/trips/${tripId}/shopping/${myItem.id}`,
            createImageId: generateId,
            createdAt: now,
            fetchBlob: async (url) => {
              const response = await fetch(url);
              return response.blob();
            },
            upload: uploadImage,
            remove: deleteImage,
          });
        } catch (imageError) {
          console.error(
            "Failed to copy image bytes while syncing; referencing originals instead:",
            imageError,
          );
          synced.images = source.images.map((image) => ({
            id: generateId(),
            url: image.url,
            path: "",
            createdAt: now,
            width: image.width,
            height: image.height,
          }));
        }
      }

      setUserTripData(tripId, {
        shopping: items.map((item) => (item.id === myItem.id ? synced : item)),
      });
      showToast({ type: "success", message: t("shopping.synced") });

      // Best-effort cleanup of the owner's replaced (owned) images.
      void Promise.all(
        myItem.images
          .filter((image) => image.path)
          .map((image) => deleteImage(image.path).catch(() => undefined)),
      );
    } catch (error) {
      console.error("Failed to sync item from copy:", error);
      showToast({ type: "error", message: t("shopping.syncFailed") });
    } finally {
      setSyncingItemIds((current) => {
        const next = new Set(current);
        next.delete(targetId);
        return next;
      });
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
        purchaseId: generateId(),
        tripId,
        tripName: trip?.name,
        tags: trip?.country ? [trip.country] : [],
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
      showToast({ type: "success", message: t("shopping.addedToPool") });
    } catch (error) {
      console.error("Failed to promote shopping item to pool:", error);
      showToast({ type: "error", message: t("shopping.addToPoolFailed") });
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
  const purchaseHistoryItem = purchaseHistoryItemId
    ? state.items.find((item) => item.id === purchaseHistoryItemId)
    : undefined;
  const addingPurchaseItem = addingPurchaseTo
    ? state.items.find((item) => item.id === addingPurchaseTo)
    : undefined;

  async function addPoolPurchase(itemId: string, purchase: Purchase) {
    await setItems(
      state.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              purchases: [
                {
                  ...purchase,
                  tripId: purchase.tripId ?? tripId,
                  tripName: purchase.tripName ?? trip?.name,
                },
                ...item.purchases,
              ],
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setAddingPurchaseTo(null);
  }

  async function updatePoolPurchase(itemId: string, purchase: Purchase) {
    await setItems(
      state.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              purchases: item.purchases.map((entry) =>
                entry.id === purchase.id ? purchase : entry,
              ),
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setEditingPurchase(null);
  }

  async function deletePoolPurchase(itemId: string, purchaseId: string) {
    await setItems(
      state.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              purchases: item.purchases.filter(
                (purchase) => purchase.id !== purchaseId,
              ),
              updatedAt: new Date().toISOString(),
            }
          : item,
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

      {!viewOnly && (
        <div className="flex gap-2 mb-3">
          <button className="btn btn-secondary btn-sm" onClick={openPoolModal}>
            <FontAwesomeIcon icon={faBoxesStacked} className="mr-1" />
            {t("shopping.addFromPool")}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={openReviewModal}
          >
            <FontAwesomeIcon icon={faUsers} className="mr-1" />
            {t("shopping.reviewOthersItems")}
          </button>
        </div>
      )}

      <div className="flex gap-1 mb-3 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
        <button
          className={`flex-1 text-xs py-1.5 rounded-md transition-all ${!showCompleted ? "bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm font-medium" : "text-slate-400"}`}
          onClick={() => setShowCompleted(false)}
        >
          {t("shopping.unpaid")} ({unchecked.length})
        </button>
        <button
          className={`flex-1 text-xs py-1.5 rounded-md transition-all ${showCompleted ? "bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm font-medium" : "text-slate-400"}`}
          onClick={() => setShowCompleted(true)}
        >
          {t("preparation.all")} ({items.length})
        </button>
      </div>

      <div className="card">
        {resolvedDisplayed.map((item) => {
          const linked = isLinkedTripShoppingItem(item.source);
          const canShowStar =
            !viewOnly &&
            !item.private &&
            state.auth.currentUser?.id === item.source.createdBy;
          const canPromoteOwnItem = canShowStar && !linked;
          const promoting = promotingItemIds.has(item.source.id);
          const promoted = linked;
          const linkedPoolItemForRow = item.source.itemId
            ? state.items.find((poolItem) => poolItem.id === item.source.itemId)
            : undefined;
          const priceBadges = buildShoppingPriceBadges({
            estimatedAmount: item.estimatedAmount,
            currency: item.currency,
            purchases:
              linkedPoolItemForRow?.purchases ??
              draftPurchaseSnapshot({
                ...item.source,
                purchaseAmount: item.purchaseAmount,
                purchaseCurrency: item.purchaseCurrency,
              }),
          });
          const starLabel = promoting
            ? t("shopping.addingToPool")
            : promoted
              ? t("shopping.addedToPool")
              : t("shopping.addToPool");

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
                  <PriceBadges badges={priceBadges} />
                </span>
              </button>
              {item.private && (
                <span
                  className="shopping-private-icon flex-shrink-0 text-slate-400"
                  aria-label={t("shopping.privateBadge")}
                  title={t("shopping.privateBadge")}
                >
                  <FontAwesomeIcon icon={faLock} />
                </span>
              )}
              {linked && item.source.itemId && (
                <button
                  type="button"
                  className="star-btn"
                  aria-label={t("shopping.viewPurchaseHistory")}
                  title={t("shopping.viewPurchaseHistory")}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPurchaseHistoryItemId(item.source.itemId!);
                  }}
                >
                  <FontAwesomeIcon icon={faReceipt} />
                </button>
              )}
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
            {showCompleted
              ? t("shopping.emptyList")
              : t("shopping.everythingPurchased")}
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
            {
              editPoolItem: t("shopping.pool.editItem"),
              editItem: t("shopping.editItem"),
              poolItem: t("shopping.poolItem"),
              tripItem: t("shopping.tripItem"),
            },
          );
          const handleTitleDoubleClick = () =>
            setShoppingModalMode((current) =>
              getShoppingModalModeAfterTitleDoubleClick(editingItem, current),
            );

          return (
            <Modal
              title={
                shoppingModalMode === "view" ? (
                  <span className="editable-title">
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
                    {!viewOnly && !hideEditButtons && (
                      <EditIconButton onClick={handleTitleDoubleClick} />
                    )}
                  </span>
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
                  tagSuggestions={getPoolItemTags(state.items)}
                  onSave={savePoolItem}
                  onCancel={() => setShoppingModalMode("view")}
                  onDelete={
                    canShowShoppingModalRemoveAction(
                      shoppingModalMode,
                      !viewOnly,
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
                      !viewOnly,
                    )
                      ? () => setConfirmDeleteItemId(editingItem.id)
                      : undefined
                  }
                />
              ) : (
                <ShoppingItemDetail
                  item={resolvedItem}
                  tags={linkedPoolItem?.tags}
                  purchases={
                    linkedPoolItem?.purchases ??
                    draftPurchaseSnapshot(editingItem)
                  }
                  onViewPurchaseHistory={
                    editingItem.itemId
                      ? () => setPurchaseHistoryItemId(editingItem.itemId!)
                      : undefined
                  }
                />
              )}
            </Modal>
          );
        })()}

      {showAddDraftModal && (
        <FullScreenModal
          title={t("shopping.addTripItem")}
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
          title={t("shopping.addFromPool")}
          onClose={() => setShowPoolModal(false)}
        >
          <div className="space-y-3">
            {(poolTagOptions.length > 0 || hasUntaggedPoolItem) && (
              <div className="pool-filter-panel">
                <div className="pool-tag-row">
                  {poolTagOptions.map((tag) => {
                    const active = selectedPoolTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`tag-filter-chip ${active ? "active" : ""}`}
                        aria-pressed={active}
                        onClick={() => toggleSelectedPoolTag(tag)}
                      >
                        {tag}
                      </button>
                    );
                  })}
                  {hasUntaggedPoolItem && (
                    <button
                      type="button"
                      className={`tag-filter-chip ${includeUntagged ? "active" : ""}`}
                      aria-pressed={includeUntagged}
                      onClick={() => setIncludeUntagged((value) => !value)}
                    >
                      {t("shopping.pool.untagged")}
                    </button>
                  )}
                </div>
              </div>
            )}
            {availablePoolItems.length === 0 ? (
              <div className="empty-state">
                <p>{t("shopping.pool.empty")}</p>
              </div>
            ) : filteredAvailablePoolItems.length === 0 ? (
              <div className="empty-state">
                <p>{t("shopping.pool.noMatchingTags")}</p>
              </div>
            ) : (
              filteredAvailablePoolItems.map((item) => (
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
                    {item.tags && item.tags.length > 0 && (
                      <span className="pool-tag-row mt-1">
                        {item.tags.map((tag) => (
                          <span key={tag} className="pool-tag-chip">
                            {tag}
                          </span>
                        ))}
                      </span>
                    )}
                    <PriceBadges
                      badges={buildShoppingPriceBadges({
                        estimatedAmount: item.estimatedAmount,
                        currency: item.currency,
                        purchases: item.purchases,
                      })}
                    />
                  </span>
                </button>
              ))
            )}
          </div>
        </FullScreenModal>
      )}

      {showReviewModal && (
        <FullScreenModal
          title={t("shopping.reviewTitle")}
          onClose={() => setShowReviewModal(false)}
        >
          <div className="space-y-3">
            {reviewUserIds.length > 0 && (
              <div className="pool-filter-panel">
                <div className="pool-tag-row">
                  {reviewUserIds.map((reviewUserId) => {
                    const active = selectedReviewUsers.includes(reviewUserId);
                    return (
                      <button
                        key={reviewUserId}
                        type="button"
                        className={`tag-filter-chip ${active ? "active" : ""}`}
                        aria-pressed={active}
                        onClick={() => toggleReviewUser(reviewUserId)}
                      >
                        {getUserName(reviewUserId)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {shownReviewItems.length === 0 ? (
              <div className="empty-state">
                <p>{t("shopping.noReviewItems")}</p>
              </div>
            ) : (
              shownReviewItems.map((entry) => {
                const user = state.users.find(
                  (candidate) => candidate.id === entry.userId,
                );
                return (
                  <div
                    key={`${entry.userId}-${entry.item.id}`}
                    className="card"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        {user &&
                          (user.avatarMode === "google" &&
                          user.googlePhotoURL ? (
                            <UserAvatar user={user} />
                          ) : (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: user.color }}
                            />
                          ))}
                        {t("shopping.createdAt", {
                          name: getUserName(entry.userId),
                          date: formatDate(entry.item.createdAt),
                        })}
                      </div>
                      {entry.item.copiedFrom &&
                      myItemIds.has(entry.item.copiedFrom) ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="tag">
                            {t("shopping.copiedFromMine")}
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={syncingItemIds.has(entry.item.copiedFrom)}
                            onClick={() => setConfirmSyncEntry(entry)}
                            title={t("shopping.syncFromCopyHint")}
                          >
                            <FontAwesomeIcon
                              icon={faArrowsRotate}
                              className="mr-1"
                            />
                            {t("shopping.syncFromCopy")}
                          </button>
                        </div>
                      ) : copiedItemIds.has(entry.item.id) ||
                        copiedSourceIds.has(entry.item.id) ? (
                        <span className="tag">
                          {t("shopping.copiedToMyList")}
                        </span>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm flex-shrink-0"
                          onClick={() => void copyToMyList(entry)}
                        >
                          {t("shopping.copyToMyList")}
                        </button>
                      )}
                    </div>
                    <div className="mt-3 mb-2 review-item-title">
                      {renderShoppingItemTitle(
                        entry.item.textSnapshot,
                        entry.item.brand,
                        entry.item.spec,
                      )}
                    </div>
                    <div className="mb-2">
                      <PriceBadges
                        size="base"
                        badges={buildShoppingPriceBadges({
                          estimatedAmount: entry.item.estimatedAmount,
                          currency: entry.item.currency,
                          purchases: draftPurchaseSnapshot(entry.item),
                        })}
                      />
                    </div>
                    {entry.item.note && (
                      <div className="text-[13px] text-slate-500 whitespace-pre-wrap mb-2">
                        {entry.item.note}
                      </div>
                    )}
                    <ImageGalleryField images={entry.item.images} />
                  </div>
                );
              })
            )}
          </div>
        </FullScreenModal>
      )}
      {confirmDeleteItemId && (
        <ConfirmDeleteModal
          title={t("shopping.deleteTripItem")}
          message={
            confirmDeleteItem && isLinkedTripShoppingItem(confirmDeleteItem)
              ? t("shopping.deleteLinkedTripItemConfirm")
              : t("shopping.deleteTripItemConfirm")
          }
          onCancel={() => setConfirmDeleteItemId(null)}
          onConfirm={() => {
            deleteDraftItem(confirmDeleteItemId);
            setConfirmDeleteItemId(null);
          }}
        />
      )}
      {confirmSyncEntry && (
        <ConfirmDeleteModal
          title={t("shopping.syncTitle")}
          message={t("shopping.syncConfirm", {
            name: getUserName(confirmSyncEntry.userId),
          })}
          confirmLabel="shopping.syncFromCopy"
          onCancel={() => setConfirmSyncEntry(null)}
          onConfirm={() => {
            const entry = confirmSyncEntry;
            setConfirmSyncEntry(null);
            void syncFromCopy(entry);
          }}
        />
      )}
      {purchaseHistoryItem && (
        <Modal
          title={t("shopping.purchase.title")}
          onClose={() => setPurchaseHistoryItemId(null)}
        >
          <PurchaseHistoryView
            item={purchaseHistoryItem}
            viewOnly={viewOnly}
            onAdd={() => setAddingPurchaseTo(purchaseHistoryItem.id)}
            onEdit={(purchase) =>
              setEditingPurchase({ itemId: purchaseHistoryItem.id, purchase })
            }
            onDelete={(purchaseId) =>
              setConfirmDeletePurchase({
                itemId: purchaseHistoryItem.id,
                purchaseId,
              })
            }
          />
        </Modal>
      )}
      {addingPurchaseItem && (
        <Modal
          title={t("shopping.purchase.add")}
          onClose={() => setAddingPurchaseTo(null)}
        >
          <PurchaseForm
            onSave={(purchase) =>
              addPoolPurchase(addingPurchaseItem.id, purchase)
            }
          />
        </Modal>
      )}
      {editingPurchase && (
        <Modal
          title={t("shopping.purchase.edit")}
          onClose={() => setEditingPurchase(null)}
        >
          <PurchaseForm
            purchase={editingPurchase.purchase}
            onSave={(purchase) =>
              updatePoolPurchase(editingPurchase.itemId, purchase)
            }
          />
        </Modal>
      )}
      {confirmDeletePurchase && (
        <ConfirmDeleteModal
          title={t("shopping.purchase.delete")}
          message={t("shopping.purchase.deleteConfirm")}
          onCancel={() => setConfirmDeletePurchase(null)}
          onConfirm={() => {
            void deletePoolPurchase(
              confirmDeletePurchase.itemId,
              confirmDeletePurchase.purchaseId,
            );
            setConfirmDeletePurchase(null);
          }}
        />
      )}
    </div>
  );
}

function formatPurchaseAmount({
  amount,
  currency,
}: {
  amount?: string;
  currency?: string;
}): string {
  return [amount, currency].filter(Boolean).join(" ");
}

function draftPurchaseSnapshot(item: TripShoppingItem): Purchase[] {
  return item.purchaseAmount
    ? [
        {
          id: `${item.id}-purchase`,
          date: item.createdAt.split("T")[0],
          amount: item.purchaseAmount,
          currency: item.purchaseCurrency,
        },
      ]
    : [];
}

function PriceBadges({
  badges,
  size,
}: {
  badges: ReturnType<typeof buildShoppingPriceBadges>;
  size?: "base" | "lg";
}) {
  const { t } = useTranslation();

  if (badges.length === 0) return null;
  const sizeClass =
    size === "lg"
      ? " price-badge-row-emphasized"
      : size === "base"
        ? " price-badge-row-base"
        : "";
  return (
    <span className={`price-badge-row${sizeClass}`}>
      {badges.map((badge) => (
        <span key={badge.label}>
          <span className="price-badge">
            {t(`shopping.priceBadges.${badge.label}`)}
          </span>
          <span>{badge.value}</span>
        </span>
      ))}
    </span>
  );
}

function PurchaseHistoryView({
  item,
  viewOnly,
  onAdd,
  onEdit,
  onDelete,
}: {
  item: Item;
  viewOnly?: boolean;
  onAdd: () => void;
  onEdit: (purchase: Purchase) => void;
  onDelete: (purchaseId: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {!viewOnly && (
        <button className="btn btn-primary w-full mt-2" onClick={onAdd}>
          <FontAwesomeIcon icon={faPlus} className="mr-1" />
          {t("shopping.purchase.add")}
        </button>
      )}
      {item.purchases.length === 0 ? (
        <div className="empty-state">
          <p>{t("shopping.purchase.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {item.purchases.map((purchase) => (
            <div key={purchase.id} className="card flex items-center gap-3">
              <div className="min-w-0 flex-1 text-sm text-slate-500">
                <div className="flex items-baseline gap-2">
                  <span>{formatDate(purchase.date)}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {formatPurchaseAmount({
                      amount: purchase.amount,
                      currency: purchase.currency,
                    }) || "-"}
                  </span>
                </div>
                {purchase.tripName && <div>{purchase.tripName}</div>}
                {purchase.note && (
                  <div className="whitespace-pre-wrap">{purchase.note}</div>
                )}
              </div>
              {!viewOnly && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="pool-item-icon-button"
                    aria-label={t("shopping.purchase.edit")}
                    title={t("shopping.purchase.edit")}
                    onClick={() => onEdit(purchase)}
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                  <button
                    type="button"
                    className="pool-item-icon-button"
                    aria-label={t("shopping.purchase.delete")}
                    title={t("shopping.purchase.delete")}
                    onClick={() => onDelete(purchase.id)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
  const { t } = useTranslation();
  const [form, setForm] = useState<Omit<Purchase, "id">>(() => ({
    date: purchase?.date ?? new Date().toISOString().split("T")[0],
    amount: purchase?.amount ?? "",
    currency: purchase?.currency ?? "",
    tripId: purchase?.tripId,
    tripName: purchase?.tripName,
    note: purchase?.note ?? "",
  }));

  return (
    <div className="fullscreen-modal-form">
      <div className="form-group">
        <label className="form-label">{t("shopping.form.amount")}</label>
        <input
          className="form-input"
          value={form.amount}
          onChange={(event) => setForm({ ...form, amount: event.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("shopping.form.currency")}</label>
        <input
          className="form-input"
          value={form.currency || ""}
          onChange={(event) =>
            setForm({ ...form, currency: event.target.value })
          }
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("shopping.form.date")}</label>
        <input
          className="form-input"
          type="date"
          value={form.date}
          onChange={(event) => setForm({ ...form, date: event.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("shopping.form.note")}</label>
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
        {t("common.save")}
      </button>
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
  const { t } = useTranslation();
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
    <div className="fullscreen-modal-form">
      <div className="form-group">
        <label className="form-label">{t("shopping.form.itemName")}</label>
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
        <label className="form-label">{t("shopping.form.brand")}</label>
        <input
          className="form-input"
          value={form.brand || ""}
          onChange={(event) => setForm({ ...form, brand: event.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("shopping.form.spec")}</label>
        <input
          className="form-input"
          value={form.spec || ""}
          onChange={(event) => setForm({ ...form, spec: event.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">
          {t("shopping.form.purchaseAmount")}
        </label>
        <input
          className="form-input"
          value={form.purchaseAmount || ""}
          onChange={(event) =>
            setForm({ ...form, purchaseAmount: event.target.value })
          }
        />
      </div>
      <div className="form-group">
        <label className="form-label">
          {t("shopping.form.purchaseCurrency")}
        </label>
        <input
          className="form-input"
          value={form.purchaseCurrency || ""}
          onChange={(event) =>
            setForm({ ...form, purchaseCurrency: event.target.value })
          }
        />
      </div>
      <div className="form-group">
        <label className="form-label">
          {t("shopping.form.suggestedPrice")}
        </label>
        <input
          className="form-input"
          value={form.estimatedAmount || ""}
          onChange={(event) =>
            setForm({ ...form, estimatedAmount: event.target.value })
          }
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("shopping.form.currency")}</label>
        <input
          className="form-input"
          value={form.currency || ""}
          onChange={(event) =>
            setForm({ ...form, currency: event.target.value })
          }
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("shopping.form.note")}</label>
        <textarea
          className="form-input"
          value={form.note || ""}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
        />
      </div>
      <div className="form-group">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="form-label mb-0">{t("shopping.form.private")}</div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("shopping.form.privateHint")}
            </p>
          </div>
          <SwitchControl
            checked={form.private ?? false}
            onChange={(checked) => setForm({ ...form, private: checked })}
            ariaLabel={t("shopping.form.private")}
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t("shopping.form.images")}</label>
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
          {t("common.cancel")}
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>
      {onDelete && (
        <button
          className="btn btn-secondary btn-danger w-full mt-2"
          onClick={onDelete}
        >
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
          {t("common.delete")}
        </button>
      )}
    </div>
  );
}

function PoolItemForm({
  item,
  tagSuggestions,
  onSave,
  onCancel,
  onDelete,
}: {
  item: Item;
  tagSuggestions?: string[];
  onSave: (item: Item) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
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
    <div className="fullscreen-modal-form">
      <div className="form-group">
        <label className="form-label">{t("shopping.form.name")}</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("shopping.form.brand")}</label>
        <input
          className="form-input"
          value={form.brand || ""}
          onChange={(event) => setForm({ ...form, brand: event.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("shopping.form.spec")}</label>
        <input
          className="form-input"
          value={form.spec || ""}
          onChange={(event) => setForm({ ...form, spec: event.target.value })}
        />
      </div>
      <PoolItemTagsField
        tags={form.tags}
        suggestions={tagSuggestions}
        onChange={(tags) => setForm({ ...form, tags })}
      />
      <div className="form-group">
        <label className="form-label">
          {t("shopping.form.suggestedPrice")}
        </label>
        <input
          className="form-input"
          value={form.estimatedAmount || ""}
          onChange={(event) =>
            setForm({ ...form, estimatedAmount: event.target.value })
          }
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("shopping.form.currency")}</label>
        <input
          className="form-input"
          value={form.currency || ""}
          onChange={(event) =>
            setForm({ ...form, currency: event.target.value })
          }
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("shopping.form.note")}</label>
        <textarea
          className="form-input"
          value={form.notes || ""}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("shopping.form.images")}</label>
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
          {t("common.cancel")}
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>
      {onDelete && (
        <button
          className="btn btn-secondary btn-danger w-full mt-2"
          onClick={onDelete}
        >
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
          {t("common.delete")}
        </button>
      )}
    </div>
  );
}

export function ShoppingItemDetail({
  item,
  tags,
  purchases,
  onViewPurchaseHistory,
}: {
  item: ReturnType<typeof getTripShoppingResolvedContent>;
  tags?: string[];
  purchases?: Purchase[];
  onViewPurchaseHistory?: () => void;
}) {
  const { t } = useTranslation();
  const priceBadges = buildShoppingPriceBadges({
    estimatedAmount: item.estimatedAmount,
    currency: item.currency,
    purchases: purchases ?? [],
  });

  return (
    <div>
      {tags && tags.length > 0 && (
        <div className="pool-tag-row mb-1.5">
          {tags.map((tag) => (
            <span key={tag} className="pool-tag-chip">
              {tag}
            </span>
          ))}
        </div>
      )}
      {(priceBadges.length > 0 || onViewPurchaseHistory) && (
        <div className="flex items-start justify-between gap-2 mb-2">
          <PriceBadges badges={priceBadges} size="lg" />
          {onViewPurchaseHistory && (
            <button
              type="button"
              className="pool-item-icon-button flex-shrink-0"
              aria-label={t("shopping.viewPurchaseHistory")}
              title={t("shopping.viewPurchaseHistory")}
              onClick={onViewPurchaseHistory}
            >
              <FontAwesomeIcon icon={faReceipt} />
            </button>
          )}
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
