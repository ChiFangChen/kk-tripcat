import type { Purchase } from "../../types";
import type { ImageAsset } from "../../types/images";

export interface Item {
  id: string;
  name: string;
  images: ImageAsset[];
  estimatedAmount?: string;
  currency?: string;
  notes?: string;
  purchases: Purchase[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TripShoppingItem {
  id: string;
  itemId?: string;
  textSnapshot: string;
  images: ImageAsset[];
  estimatedAmount?: string;
  currency?: string;
  note?: string;
  checked: boolean;
  createdBy: string;
  createdAt: string;
  promotedToPoolAt?: string;
  promotedBy?: string;
}

export interface ResolvedTripShoppingItem {
  id: string;
  source: TripShoppingItem;
  name: string;
  images: ImageAsset[];
  estimatedAmount?: string;
  currency?: string;
  note?: string;
  checked: boolean;
  isLinked: boolean;
}

export function isLinkedTripShoppingItem(item: TripShoppingItem): boolean {
  return Boolean(item.itemId);
}

export function getTripShoppingResolvedContent(
  item: TripShoppingItem,
  poolItems: Item[],
): ResolvedTripShoppingItem {
  const linkedItem = item.itemId
    ? poolItems.find((poolItem) => poolItem.id === item.itemId)
    : undefined;

  if (linkedItem) {
    return {
      id: item.id,
      source: item,
      name: linkedItem.name,
      images: linkedItem.images,
      estimatedAmount: linkedItem.estimatedAmount,
      currency: linkedItem.currency,
      note: linkedItem.notes,
      checked: item.checked,
      isLinked: true,
    };
  }

  return {
    id: item.id,
    source: item,
    name: item.textSnapshot,
    images: item.images,
    estimatedAmount: item.estimatedAmount,
    currency: item.currency,
    note: item.note,
    checked: item.checked,
    isLinked: false,
  };
}

export function getPoolPromotionCandidates(
  shoppingItems: TripShoppingItem[],
  adminUserId: string,
): TripShoppingItem[] {
  return shoppingItems.filter(
    (item) => !item.itemId && item.createdBy !== adminUserId,
  );
}

export function getFavoriteItems(items: Item[]): Item[] {
  return items.filter((item) => item.isFavorite);
}

export function buildPoolItemFromTripShopping({
  source,
  itemId,
  images,
  now,
}: {
  source: TripShoppingItem;
  itemId: string;
  images: ImageAsset[];
  now: string;
}): Item {
  return {
    id: itemId,
    name: source.textSnapshot,
    images,
    estimatedAmount: source.estimatedAmount,
    currency: source.currency,
    notes: source.note,
    purchases: [],
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
  };
}
