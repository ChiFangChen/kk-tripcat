import {
  isLinkedTripShoppingItem,
  type TripShoppingItem,
} from "./shoppingTypes";

export type ShoppingModalMode = "view" | "edit";

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
): string {
  if (mode === "edit" && isLinkedTripShoppingItem(item)) return "編輯魚池項目";
  if (mode === "edit" && !isLinkedTripShoppingItem(item)) return "編輯項目";
  if (isLinkedTripShoppingItem(item)) return itemName || "魚池項目";
  return itemName || "購物項目";
}
