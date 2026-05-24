/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
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

function renderShoppingItemDetail() {
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
    brand: "Tabio",
    spec: "23-25cm",
    images: [],
    checked: false,
    isLinked: false,
    estimatedAmount: "100",
    currency: "JPY",
  };

  act(() => {
    root.render(<ShoppingItemDetail item={item} />);
  });

  return { root };
}

describe("ShoppingItemDetail", () => {
  it("omits the item name because the modal title already shows it", () => {
    const { root } = renderShoppingItemDetail();

    expect(container!.textContent).not.toContain("襪子");
    expect(container!.textContent).not.toContain("Tabio");
    expect(container!.textContent).not.toContain("23-25cm");
    expect(container!.textContent).toContain("100 JPY");
    expect(container!.querySelector("button")).toBeNull();

    act(() => root.unmount());
  });
});
