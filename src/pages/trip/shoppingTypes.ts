import type { Purchase } from "../../types";
import type { ImageAsset } from "../../types/images";

export interface Item {
  id: string;
  name: string;
  brand?: string;
  spec?: string;
  tags?: string[];
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
  purchaseAmount?: string;
  purchaseCurrency?: string;
  estimatedAmount?: string;
  currency?: string;
  note?: string;
  checked: boolean;
  private?: boolean;
  copiedFrom?: string;
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
  purchaseAmount?: string;
  purchaseCurrency?: string;
  estimatedAmount?: string;
  currency?: string;
  note?: string;
  checked: boolean;
  private: boolean;
  isLinked: boolean;
}

export function normalizePoolItemTags(tags?: string[]): string[] {
  const normalizedTags: string[] = [];
  const seen = new Set<string>();

  for (const tag of tags ?? []) {
    const normalizedTag = tag.trim();
    if (!normalizedTag || seen.has(normalizedTag)) continue;
    seen.add(normalizedTag);
    normalizedTags.push(normalizedTag);
  }

  return normalizedTags;
}

export function getPoolItemTags(items: Item[]): string[] {
  return normalizePoolItemTags(items.flatMap((item) => item.tags ?? []));
}

export function filterPoolItemsByTags(
  items: Item[],
  selectedTags: string[],
  options?: { includeUntagged?: boolean },
): Item[] {
  const normalizedSelectedTags = normalizePoolItemTags(selectedTags);
  const includeUntagged = options?.includeUntagged ?? false;
  if (normalizedSelectedTags.length === 0 && !includeUntagged) return items;

  const selectedTagSet = new Set(normalizedSelectedTags);
  return items.filter((item) => {
    const tags = normalizePoolItemTags(item.tags);
    const matchesTag = tags.some((tag) => selectedTagSet.has(tag));
    const matchesUntagged = includeUntagged && tags.length === 0;
    return matchesTag || matchesUntagged;
  });
}

export function isLinkedTripShoppingItem(item: TripShoppingItem): boolean {
  return Boolean(item.itemId);
}

function getLatestPurchase(item: Item): Purchase | undefined {
  return item.purchases[0];
}

function parsePurchaseAmount(amount?: string): number | null {
  if (!amount) return null;
  const normalizedAmount = amount.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!normalizedAmount) return null;
  const numeric = Number(normalizedAmount[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatAmount(amount?: string, currency?: string): string {
  return [amount, currency].filter(Boolean).join(" ");
}

export function buildShoppingPriceBadges({
  estimatedAmount,
  currency,
  purchases,
}: {
  estimatedAmount?: string;
  currency?: string;
  purchases: Purchase[];
}): Array<{ label: "suggested" | "lowest" | "latest"; value: string }> {
  const badges: Array<{
    label: "suggested" | "lowest" | "latest";
    value: string;
  }> = [];
  if (estimatedAmount || currency) {
    badges.push({
      label: "suggested",
      value: formatAmount(estimatedAmount || "-", currency),
    });
  }

  const purchasesWithAmount = purchases
    .map((purchase) => ({
      purchase,
      numericAmount: parsePurchaseAmount(purchase.amount),
    }))
    .filter(
      (entry): entry is { purchase: Purchase; numericAmount: number } =>
        entry.numericAmount !== null,
    );

  const lowestPurchase = purchasesWithAmount.reduce<Purchase | null>(
    (currentLowest, entry) => {
      if (!currentLowest) return entry.purchase;
      const currentAmount = parsePurchaseAmount(currentLowest.amount);
      if (currentAmount === null) return entry.purchase;
      return entry.numericAmount < currentAmount ? entry.purchase : currentLowest;
    },
    null,
  );
  const latestPurchase = purchasesWithAmount.reduce<Purchase | null>(
    (currentLatest, entry) => {
      if (!currentLatest) return entry.purchase;
      return entry.purchase.date > currentLatest.date ? entry.purchase : currentLatest;
    },
    null,
  );

  if (lowestPurchase) {
    badges.push({
      label: "lowest",
      value: formatAmount(lowestPurchase.amount, lowestPurchase.currency),
    });
  }
  if (latestPurchase) {
    badges.push({
      label: "latest",
      value: formatAmount(latestPurchase.amount, latestPurchase.currency),
    });
  }

  return badges;
}

export function getTripShoppingResolvedContent(
  item: TripShoppingItem,
  poolItems: Item[],
): ResolvedTripShoppingItem {
  const linkedItem = item.itemId
    ? poolItems.find((poolItem) => poolItem.id === item.itemId)
    : undefined;

  if (linkedItem) {
    const latestPurchase = getLatestPurchase(linkedItem);
    return {
      id: item.id,
      source: item,
      name: linkedItem.name,
      brand: linkedItem.brand,
      spec: linkedItem.spec,
      images: linkedItem.images,
      purchaseAmount: latestPurchase?.amount,
      purchaseCurrency: latestPurchase?.currency,
      estimatedAmount: linkedItem.estimatedAmount,
      currency: linkedItem.currency,
      note: linkedItem.notes,
      checked: item.checked,
      private: item.private ?? false,
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
    purchaseAmount: item.purchaseAmount,
    purchaseCurrency: item.purchaseCurrency,
    estimatedAmount: item.estimatedAmount,
    currency: item.currency,
    note: item.note,
    checked: item.checked,
    private: item.private ?? false,
    isLinked: false,
  };
}

export function getWishlistShareCandidates(
  shoppingItems: TripShoppingItem[],
): TripShoppingItem[] {
  return shoppingItems.filter(
    (item) => !item.itemId && !item.private && !item.checked,
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
  purchaseId,
  tripId,
  tripName,
  tags,
}: {
  source: TripShoppingItem;
  itemId: string;
  images: ImageAsset[];
  now: string;
  purchaseId?: string;
  tripId?: string;
  tripName?: string;
  tags?: string[];
}): Item {
  const item: Item = {
    id: itemId,
    name: source.textSnapshot,
    images,
    purchases: [],
    createdAt: now,
    updatedAt: now,
  };

  if (source.purchaseAmount?.trim()) {
    item.purchases = [
      {
        id: purchaseId ?? itemId,
        date: now.split("T")[0],
        amount: source.purchaseAmount.trim(),
        currency: source.purchaseCurrency,
        tripId,
        tripName,
      },
    ];
  }
  if (source.estimatedAmount !== undefined) {
    item.estimatedAmount = source.estimatedAmount;
  }
  if (source.brand !== undefined) {
    item.brand = source.brand;
  }
  if (source.spec !== undefined) {
    item.spec = source.spec;
  }
  const normalizedTags = normalizePoolItemTags(tags);
  if (normalizedTags.length > 0) {
    item.tags = normalizedTags;
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
    purchaseAmount: getLatestPurchase(poolItem)?.amount,
    purchaseCurrency: getLatestPurchase(poolItem)?.currency,
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
    private: tripItem.private ?? false,
    createdBy: tripItem.createdBy,
    createdAt: tripItem.createdAt,
  };
}
