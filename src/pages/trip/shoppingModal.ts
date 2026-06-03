import {
  isLinkedTripShoppingItem,
  type TripShoppingItem,
} from "./shoppingTypes";

export type ShoppingModalMode = "view" | "edit";

export interface ShoppingModalTitleLabels {
  editPoolItem: string;
  editItem: string;
  poolItem: string;
  tripItem: string;
}

export function getInitialShoppingModalMode(): ShoppingModalMode {
  return "view";
}

export function getShoppingModalModeAfterTitleDoubleClick(
  item: TripShoppingItem,
  currentMode: ShoppingModalMode,
): ShoppingModalMode {
  void item;
  void currentMode;
  return "edit";
}

export function canShowShoppingModalRemoveAction(
  mode: ShoppingModalMode,
  canDelete: boolean,
): boolean {
  return mode === "edit" && canDelete;
}

export function getShoppingModalTitle(
  mode: ShoppingModalMode,
  item: TripShoppingItem,
  itemName: string,
  labels: ShoppingModalTitleLabels,
): string {
  if (mode === "edit" && isLinkedTripShoppingItem(item)) {
    return labels.editPoolItem;
  }
  if (mode === "edit" && !isLinkedTripShoppingItem(item)) {
    return labels.editItem;
  }
  if (isLinkedTripShoppingItem(item)) return itemName || labels.poolItem;
  return itemName || labels.tripItem;
}
