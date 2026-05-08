/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShoppingItemDetail } from "./ShoppingTab";
import type { ResolvedTripShoppingItem } from "./shoppingTypes";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;

afterEach(() => {
  container?.remove();
  container = null;
});

function renderShoppingItemDetail(onTitleDoubleClick: () => void) {
  container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const item: ResolvedTripShoppingItem = {
    id: "shopping-1",
    source: {
      id: "shopping-1",
      textSnapshot: "襪子",
      images: [],
      checked: false,
      createdBy: "user-1",
      createdAt: "2026-05-08T10:00:00.000Z",
    },
    name: "襪子",
    images: [],
    checked: false,
    isLinked: false,
  };

  act(() => {
    root.render(
      <ShoppingItemDetail
        item={item}
        onTitleDoubleClick={onTitleDoubleClick}
      />,
    );
  });

  return { root };
}

describe("ShoppingItemDetail", () => {
  it("uses the app double-tap click behavior for editing the title", () => {
    const onTitleDoubleClick = vi.fn();
    const { root } = renderShoppingItemDetail(onTitleDoubleClick);
    const title = container!.querySelector("button")!;

    act(() => {
      title.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      title.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onTitleDoubleClick).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
  });
});
