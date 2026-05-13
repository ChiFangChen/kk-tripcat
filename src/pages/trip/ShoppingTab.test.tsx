// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShoppingTab } from "./ShoppingTab";
import type { TripShoppingItem } from "./shoppingTypes";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = vi.fn();

const mocks = vi.hoisted(() => ({
  copyImagesToNewPaths: vi.fn(),
  persistImagesForRecord: vi.fn(),
  dispatch: vi.fn(),
  setUserTripData: vi.fn(),
  showToast: vi.fn(),
  state: {
    auth: {
      currentUser: {
        id: "admin-1",
        username: "kiki",
        displayName: "Kiki",
        isAdmin: true,
      },
    },
    trips: [
      {
        id: "trip-1",
        name: "Tokyo",
        creatorId: "admin-1",
        members: ["admin-1"],
      },
    ],
    items: [] as Array<{
      id: string;
      name: string;
      images: Array<{
        id: string;
        url: string;
        path: string;
        createdAt: string;
        width?: number;
        height?: number;
      }>;
      estimatedAmount?: string;
      currency?: string;
      notes?: string;
      purchases: [];
      createdAt: string;
      updatedAt: string;
    }>,
  },
  tripShopping: [
    {
      id: "shopping-1",
      textSnapshot: "抹茶",
      images: [
        {
          id: "img-1",
          url: "https://files.local/matcha.jpg",
          path: "tc-images/trips/trip-1/shopping/shopping-1/img-1.jpg",
          createdAt: "2026-04-25T00:00:00.000Z",
          width: 320,
          height: 240,
        },
      ],
      checked: false,
      createdBy: "admin-1",
      createdAt: "2026-04-25T00:00:00.000Z",
    },
  ] as TripShoppingItem[],
}));

vi.mock("../../utils/imageUpload", () => ({
  copyImagesToNewPaths: mocks.copyImagesToNewPaths,
  createPendingImages: vi.fn(),
  persistImagesForRecord: mocks.persistImagesForRecord,
}));

vi.mock("../../utils/firebase", () => ({
  deleteImage: vi.fn(),
  uploadImage: vi.fn(),
}));

vi.mock("../../context/AppContext", () => ({
  useApp: () => ({
    state: mocks.state,
    dispatch: mocks.dispatch,
    setUserTripData: mocks.setUserTripData,
    setTripMemberData: vi.fn(),
    getTripData: () => ({
      shopping: mocks.tripShopping,
    }),
    getUserName: vi.fn(),
    isTripAdmin: () => true,
    loadTripMemberData: vi.fn(),
    showToast: mocks.showToast,
  }),
}));

describe("ShoppingTab", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.persistImagesForRecord.mockImplementation(
      async ({ existingImages, onPersist }) => {
        await onPersist(existingImages);
        return existingImages;
      },
    );
    mocks.state.items = [];
    mocks.tripShopping = [
      {
        id: "shopping-1",
        textSnapshot: "抹茶",
        images: [
          {
            id: "img-1",
            url: "https://files.local/matcha.jpg",
            path: "tc-images/trips/trip-1/shopping/shopping-1/img-1.jpg",
            createdAt: "2026-04-25T00:00:00.000Z",
            width: 320,
            height: 240,
          },
        ],
        checked: false,
        createdBy: "admin-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
    ];
    document.body.innerHTML = "";
  });

  beforeEach(() => {
    mocks.persistImagesForRecord.mockImplementation(
      async ({ existingImages, onPersist }) => {
        await onPersist(existingImages);
        return existingImages;
      },
    );
  });

  it("shows an error when inline pool promotion cannot copy images", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.copyImagesToNewPaths.mockRejectedValueOnce(new Error("cors"));

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ShoppingTab tripId="trip-1" />);
    });

    const button = document.querySelector<HTMLButtonElement>(
      'button[aria-label="加入魚池"]',
    );
    expect(button).not.toBeNull();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mocks.showToast).toHaveBeenCalledWith({
      type: "error",
      message: "加入魚池失敗，請稍後再試",
    });
    consoleError.mockRestore();
  });

  it("filters already linked pool items from the add-from-pool modal", async () => {
    mocks.state.items = [
      {
        id: "pool-1",
        name: "已加入的魚池項目",
        images: [],
        purchases: [],
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T00:00:00.000Z",
      },
      {
        id: "pool-2",
        name: "尚未加入的魚池項目",
        images: [
          {
            id: "pool-img-2",
            url: "https://files.local/pool-2.jpg",
            path: "tc-images/users/admin-1/items/pool-2/pool-img-2.jpg",
            createdAt: "2026-04-25T00:00:00.000Z",
            width: 320,
            height: 240,
          },
        ],
        purchases: [],
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T00:00:00.000Z",
      },
    ];
    mocks.tripShopping = [
      {
        id: "shopping-1",
        itemId: "pool-1",
        textSnapshot: "已加入的魚池項目",
        images: [],
        checked: false,
        createdBy: "admin-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
    ];

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ShoppingTab tripId="trip-1" />);
    });

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>(".btn.btn-secondary.btn-sm")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const modalBody = document.querySelector(".fullscreen-modal-body");
    expect(modalBody?.textContent).toContain("尚未加入的魚池項目");
    expect(modalBody?.textContent).not.toContain("已加入的魚池項目");
    expect(
      modalBody?.querySelector<HTMLImageElement>(
        'img[src="https://files.local/pool-2.jpg"]',
      ),
    ).not.toBeNull();
  });

  it("edits linked items through the pool item and deletes only the trip item", async () => {
    mocks.state.items = [
      {
        id: "pool-1",
        name: "吹風機",
        images: [],
        estimatedAmount: "3000",
        currency: "JPY",
        notes: "輕量款",
        purchases: [],
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T00:00:00.000Z",
      },
    ];
    mocks.tripShopping = [
      {
        id: "shopping-1",
        itemId: "pool-1",
        textSnapshot: "吹風機",
        images: [],
        checked: false,
        createdBy: "admin-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
    ];

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ShoppingTab tripId="trip-1" />);
    });

    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("吹風機"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const title = document.querySelector<HTMLButtonElement>(
      ".modal-title-action",
    );
    await act(async () => {
      title?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      title?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const nameInput = document.querySelector<HTMLInputElement>(".form-input");
    expect(nameInput).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(nameInput, "新吹風機");
      nameInput!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent === "儲存")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "UPDATE_ITEM",
      item: expect.objectContaining({
        id: "pool-1",
        name: "新吹風機",
      }),
    });

    await act(async () => {
      root.render(<ShoppingTab tripId="trip-1" />);
    });

    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("吹風機"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const deleteTitle = document.querySelector<HTMLButtonElement>(
      ".modal-title-action",
    );
    await act(async () => {
      deleteTitle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      deleteTitle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("刪除"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .filter((button) => button.textContent === "刪除")
        .at(-1)
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mocks.setUserTripData).toHaveBeenCalledWith("trip-1", {
      shopping: [],
    });
    expect(mocks.dispatch).not.toHaveBeenCalledWith({
      type: "DELETE_ITEM",
      itemId: "pool-1",
    });
  });
});
