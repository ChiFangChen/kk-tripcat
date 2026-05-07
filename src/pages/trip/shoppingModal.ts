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
  if (isLinkedTripShoppingItem(item)) return currentMode;
  return "edit";
}

export function canShowShoppingModalRemoveAction(
  mode: ShoppingModalMode,
  canDelete: boolean,
): boolean {
  return mode === "edit" && canDelete;
}
