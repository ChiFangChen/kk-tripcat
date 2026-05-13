import { describe, expect, it } from "vitest";
import {
  canShowShoppingModalRemoveAction,
  getInitialShoppingModalMode,
  getShoppingModalTitle,
  getShoppingModalModeAfterTitleDoubleClick,
} from "./shoppingModal";
import type { TripShoppingItem } from "./shoppingTypes";

const draftItem: TripShoppingItem = {
  id: "draft-1",
  textSnapshot: "Socks",
  images: [],
  checked: false,
  createdBy: "user-1",
  createdAt: "2026-05-07T00:00:00.000Z",
};

const linkedItem: TripShoppingItem = {
  ...draftItem,
  id: "linked-1",
  itemId: "pool-1",
};

describe("shopping modal mode", () => {
  it("opens list items in view mode", () => {
    expect(getInitialShoppingModalMode()).toBe("view");
  });

  it("switches draft items to edit mode after a title double click", () => {
    expect(getShoppingModalModeAfterTitleDoubleClick(draftItem, "view")).toBe(
      "edit",
    );
  });

  it("switches linked pool items to edit mode after a title double click", () => {
    expect(getShoppingModalModeAfterTitleDoubleClick(linkedItem, "view")).toBe(
      "edit",
    );
  });

  it("hides the remove action in view mode", () => {
    expect(canShowShoppingModalRemoveAction("view", true)).toBe(false);
  });

  it("shows the remove action only in edit mode when deletion is allowed", () => {
    expect(canShowShoppingModalRemoveAction("edit", true)).toBe(true);
    expect(canShowShoppingModalRemoveAction("edit", false)).toBe(false);
  });

  it("uses the item name as the view modal title", () => {
    expect(getShoppingModalTitle("view", draftItem, "Socks")).toBe("Socks");
  });

  it("keeps the edit modal title in edit mode", () => {
    expect(getShoppingModalTitle("edit", draftItem, "Socks")).toBe("編輯項目");
  });
});
