import type { Purchase } from "../../types";
import type { ImageAsset } from "../../types/images";

export interface Item {
  id: string;
  name: string;
  brand?: string;
  spec?: string;
  images: ImageAsset[];
  estimatedAmount?: string;
  currency?: string;
  notes?: string;
  purchases: Purchase[];
  createdAt: string;
  updatedAt: string;
}

export interface TripShoppingItem {
  id: string;
  itemId?: string;
  textSnapshot: string;
  brand?: string;
  spec?: string;
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
  brand?: string;
  spec?: string;
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
      brand: linkedItem.brand,
      spec: linkedItem.spec,
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
    brand: item.brand,
    spec: item.spec,
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

export function getOwnPoolPromotionCandidates(
  shoppingItems: TripShoppingItem[],
  adminUserId: string,
): TripShoppingItem[] {
  return shoppingItems.filter(
    (item) =>
      !item.itemId && item.createdBy === adminUserId && !item.promotedToPoolAt,
  );
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
  const item: Item = {
    id: itemId,
    name: source.textSnapshot,
    images,
    purchases: [],
    createdAt: now,
    updatedAt: now,
  };

  if (source.estimatedAmount !== undefined) {
    item.estimatedAmount = source.estimatedAmount;
  }
  if (source.brand !== undefined) {
    item.brand = source.brand;
  }
  if (source.spec !== undefined) {
    item.spec = source.spec;
  }
  if (source.currency !== undefined) {
    item.currency = source.currency;
  }
  if (source.note !== undefined) {
    item.notes = source.note;
  }

  return item;
}

export function detachTripShoppingItemFromPoolItem({
  tripItem,
  poolItem,
}: {
  tripItem: TripShoppingItem;
  poolItem: Item;
}): TripShoppingItem {
  const {
    itemId: _itemId,
    promotedToPoolAt: _promotedToPoolAt,
    promotedBy: _promotedBy,
    ...rest
  } = tripItem;
  void _itemId;
  void _promotedToPoolAt;
  void _promotedBy;

  return {
    ...rest,
    textSnapshot: poolItem.name,
    brand: poolItem.brand,
    spec: poolItem.spec,
    images: poolItem.images,
    estimatedAmount: poolItem.estimatedAmount,
    currency: poolItem.currency,
    note: poolItem.notes,
  };
}

export function linkTripShoppingItemToPoolItem({
  tripItem,
  poolItemId,
}: {
  tripItem: TripShoppingItem;
  poolItemId: string;
}): TripShoppingItem {
  return {
    id: tripItem.id,
    itemId: poolItemId,
    textSnapshot: tripItem.textSnapshot,
    images: [],
    checked: tripItem.checked,
    createdBy: tripItem.createdBy,
    createdAt: tripItem.createdAt,
  };
}
