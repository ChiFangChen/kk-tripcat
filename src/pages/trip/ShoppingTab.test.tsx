// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShoppingTab } from "./ShoppingTab";
import type { Purchase } from "../../types";
import type { TripShoppingItem } from "./shoppingTypes";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = vi.fn();

const mocks = vi.hoisted(() => ({
  copyImagesToNewPaths: vi.fn(),
  persistImagesForRecord: vi.fn(),
  dispatch: vi.fn(),
  setItems: vi.fn(),
  setUserTripData: vi.fn(),
  loadTripMemberData: vi.fn(),
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
    users: [] as Array<{ id: string; displayName: string; color: string }>,
    trips: [
      {
        id: "trip-1",
        name: "Tokyo",
        country: "日本",
        creatorId: "admin-1",
        members: ["admin-1"],
      },
    ],
    items: [] as Array<{
      id: string;
      name: string;
      tags?: string[];
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
      purchases: Purchase[];
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
    setItems: mocks.setItems,
    setUserTripData: mocks.setUserTripData,
    setTripMemberData: vi.fn(),
    getTripData: () => ({
      shopping: mocks.tripShopping,
    }),
    getUserName: (userId: string) =>
      mocks.state.users.find((user) => user.id === userId)?.displayName ??
      userId,
    isTripAdmin: () => true,
    loadTripMemberData: mocks.loadTripMemberData,
    showToast: mocks.showToast,
  }),
}));

describe("ShoppingTab", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.setItems.mockResolvedValue(undefined);
    mocks.persistImagesForRecord.mockImplementation(
      async ({ existingImages, onPersist }) => {
        await onPersist(existingImages);
        return existingImages;
      },
    );
    mocks.state.items = [];
    mocks.state.users = [];
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
    mocks.setItems.mockResolvedValue(undefined);
    mocks.persistImagesForRecord.mockImplementation(
      async ({ existingImages, onPersist }) => {
        await onPersist(existingImages);
        return existingImages;
      },
    );
  });

  it("promotes a shopping item to the pool without copying image bytes", async () => {
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
      await Promise.resolve();
    });

    expect(mocks.copyImagesToNewPaths).not.toHaveBeenCalled();
    expect(mocks.setItems).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "抹茶",
        images: mocks.tripShopping[0].images,
      }),
    ]);
  });

  it("persists a promoted pool item before linking the trip shopping item", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ShoppingTab tripId="trip-1" />);
    });

    const button = document.querySelector<HTMLButtonElement>(
      'button[aria-label="加入魚池"]',
    );

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(mocks.setItems).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "抹茶",
        images: mocks.tripShopping[0].images,
      }),
    ]);
    expect(mocks.setUserTripData).toHaveBeenCalledWith("trip-1", {
      shopping: [
        expect.objectContaining({
          id: "shopping-1",
          itemId: expect.any(String),
          images: [],
        }),
      ],
    });
    expect(mocks.setItems.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.setUserTripData.mock.invocationCallOrder[0],
    );
  });

  it("hides private wishes and copies a chosen item to my own list", async () => {
    mocks.state.users = [
      { id: "user-2", displayName: "Bob", color: "#ff0000" },
    ];
    mocks.loadTripMemberData.mockResolvedValue({
      "user-2": {
        shopping: [
          {
            id: "u2-public",
            textSnapshot: "公開想買",
            images: [
              {
                id: "u2-img",
                url: "https://files.local/u2.jpg",
                path: "tc-images/trips/trip-1/shopping/u2-public/u2-img.jpg",
                createdAt: "2026-04-25T00:00:00.000Z",
                width: 320,
                height: 240,
              },
            ],
            checked: false,
            createdBy: "user-2",
            createdAt: "2026-04-25T00:00:00.000Z",
          },
          {
            id: "u2-private",
            textSnapshot: "秘密想買",
            images: [],
            checked: false,
            private: true,
            createdBy: "user-2",
            createdAt: "2026-04-25T00:00:00.000Z",
          },
        ],
      },
    });
    mocks.copyImagesToNewPaths.mockResolvedValue([]);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<ShoppingTab tripId="trip-1" />);
    });

    const reviewButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("查看大家想買的"),
    );
    await act(async () => {
      reviewButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(document.body.textContent).toContain("公開想買");
    expect(document.body.textContent).not.toContain("秘密想買");

    const copyButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("複製到我的購物清單"),
    );
    await act(async () => {
      copyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mocks.copyImagesToNewPaths).toHaveBeenCalled();
    expect(mocks.setUserTripData).toHaveBeenCalledWith("trip-1", {
      shopping: [
        ...mocks.tripShopping,
        expect.objectContaining({
          textSnapshot: "公開想買",
          createdBy: "admin-1",
          checked: false,
          private: false,
        }),
      ],
    });
    const lastCall = mocks.setUserTripData.mock.calls.at(-1);
    const copiedDraft = lastCall?.[1].shopping.at(-1);
    expect(copiedDraft.itemId).toBeUndefined();
  });

  it("references original images when the byte copy fails", async () => {
    mocks.state.users = [
      { id: "user-2", displayName: "Bob", color: "#ff0000" },
    ];
    mocks.loadTripMemberData.mockResolvedValue({
      "user-2": {
        shopping: [
          {
            id: "u2-img-item",
            textSnapshot: "有圖片的",
            images: [
              {
                id: "u2-img",
                url: "https://files.local/u2.jpg",
                path: "tc-images/trips/trip-1/shopping/u2-img-item/u2-img.jpg",
                createdAt: "2026-04-25T00:00:00.000Z",
                width: 320,
                height: 240,
              },
            ],
            checked: false,
            createdBy: "user-2",
            createdAt: "2026-04-25T00:00:00.000Z",
          },
        ],
      },
    });
    mocks.copyImagesToNewPaths.mockRejectedValue(new Error("CORS blocked"));

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<ShoppingTab tripId="trip-1" />);
    });

    const reviewButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("查看大家想買的"),
    );
    await act(async () => {
      reviewButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const copyButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("複製到我的購物清單"),
    );
    await act(async () => {
      copyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Item is still copied; the image falls back to referencing the original
    // URL (empty path so deleting the copy never removes the original).
    expect(mocks.setUserTripData).toHaveBeenCalledWith("trip-1", {
      shopping: [
        ...mocks.tripShopping,
        expect.objectContaining({
          textSnapshot: "有圖片的",
          createdBy: "admin-1",
          copiedFrom: "u2-img-item",
          images: [
            expect.objectContaining({
              url: "https://files.local/u2.jpg",
              path: "",
            }),
          ],
        }),
      ],
    });
    expect(mocks.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("marks already-copied wishes via copiedFrom after reopening", async () => {
    mocks.state.users = [
      { id: "user-2", displayName: "Bob", color: "#ff0000" },
    ];
    mocks.tripShopping = [
      {
        id: "mine-copy",
        textSnapshot: "我已複製的",
        images: [],
        checked: false,
        copiedFrom: "u2-public",
        createdBy: "admin-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
    ];
    mocks.loadTripMemberData.mockResolvedValue({
      "user-2": {
        shopping: [
          {
            id: "u2-public",
            textSnapshot: "公開想買",
            images: [],
            checked: false,
            createdBy: "user-2",
            createdAt: "2026-04-25T00:00:00.000Z",
          },
        ],
      },
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<ShoppingTab tripId="trip-1" />);
    });

    const reviewButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("查看大家想買的"),
    );
    await act(async () => {
      reviewButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Already-copied source item shows the copied tag, not a copy button.
    expect(document.body.textContent).toContain("已加入清單");
    const copyButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("複製到我的購物清單"),
    );
    expect(copyButton).toBeUndefined();
  });

  it("shows 'copied from mine' and hides the button for items copied from my list", async () => {
    mocks.state.users = [
      { id: "user-2", displayName: "Bob", color: "#ff0000" },
    ];
    mocks.tripShopping = [
      {
        id: "my-item-x",
        textSnapshot: "我原本想買的",
        images: [],
        checked: false,
        createdBy: "admin-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
    ];
    mocks.loadTripMemberData.mockResolvedValue({
      "user-2": {
        shopping: [
          {
            id: "u2-copy",
            textSnapshot: "我原本想買的",
            images: [],
            checked: false,
            copiedFrom: "my-item-x",
            createdBy: "user-2",
            createdAt: "2026-04-26T00:00:00.000Z",
          },
        ],
      },
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<ShoppingTab tripId="trip-1" />);
    });

    const reviewButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("查看大家想買的"),
    );
    await act(async () => {
      reviewButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(document.body.textContent).toContain("複製自我的清單");
    const copyButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("複製到我的購物清單"),
    );
    expect(copyButton).toBeUndefined();
  });

  it("syncs the owner's item to the copier's edited version after confirming", async () => {
    mocks.state.users = [
      { id: "user-2", displayName: "Bob", color: "#ff0000" },
    ];
    mocks.tripShopping = [
      {
        id: "my-item-x",
        textSnapshot: "原始品名",
        note: "原始備註",
        images: [],
        checked: false,
        createdBy: "admin-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
    ];
    mocks.loadTripMemberData.mockResolvedValue({
      "user-2": {
        shopping: [
          {
            id: "u2-copy",
            textSnapshot: "改過的品名",
            note: "改過的備註",
            images: [
              {
                id: "u2-img",
                url: "https://files.local/u2.jpg",
                path: "tc-images/trips/trip-1/shopping/u2-copy/u2-img.jpg",
                createdAt: "2026-04-26T00:00:00.000Z",
                width: 320,
                height: 240,
              },
            ],
            checked: false,
            copiedFrom: "my-item-x",
            createdBy: "user-2",
            createdAt: "2026-04-26T00:00:00.000Z",
          },
        ],
      },
    });
    mocks.copyImagesToNewPaths.mockResolvedValue([
      {
        id: "new-img",
        url: "https://files.local/new.jpg",
        path: "tc-images/trips/trip-1/shopping/my-item-x/new-img.jpg",
        createdAt: "2026-04-27T00:00:00.000Z",
        width: 320,
        height: 240,
      },
    ]);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<ShoppingTab tripId="trip-1" />);
    });

    const reviewButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("查看大家想買的"),
    );
    await act(async () => {
      reviewButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Click the card's sync button (not the danger confirm button).
    const syncButton = Array.from(document.querySelectorAll("button")).find(
      (button) =>
        button.textContent?.includes("同步") &&
        !button.classList.contains("btn-danger"),
    );
    await act(async () => {
      syncButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Confirm modal must appear; nothing written yet.
    expect(mocks.setUserTripData).not.toHaveBeenCalled();
    const confirmButton =
      document.querySelector<HTMLButtonElement>("button.btn-danger");
    await act(async () => {
      confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mocks.copyImagesToNewPaths).toHaveBeenCalled();
    expect(mocks.setUserTripData).toHaveBeenCalledWith("trip-1", {
      shopping: [
        expect.objectContaining({
          id: "my-item-x",
          textSnapshot: "改過的品名",
          note: "改過的備註",
          createdBy: "admin-1",
        }),
      ],
    });
  });

  it("filters the wishlist view by person (none selected shows all)", async () => {
    mocks.state.users = [
      { id: "user-2", displayName: "Bob", color: "#ff0000" },
      { id: "user-3", displayName: "Cara", color: "#00ff00" },
    ];
    mocks.loadTripMemberData.mockResolvedValue({
      "user-2": {
        shopping: [
          {
            id: "u2-item",
            textSnapshot: "Bob想買",
            images: [],
            checked: false,
            createdBy: "user-2",
            createdAt: "2026-04-25T00:00:00.000Z",
          },
        ],
      },
      "user-3": {
        shopping: [
          {
            id: "u3-item",
            textSnapshot: "Cara想買",
            images: [],
            checked: false,
            createdBy: "user-3",
            createdAt: "2026-04-25T00:00:00.000Z",
          },
        ],
      },
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<ShoppingTab tripId="trip-1" />);
    });

    const reviewButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("查看大家想買的"),
    );
    await act(async () => {
      reviewButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Nothing selected -> both people's items are shown.
    expect(document.body.textContent).toContain("Bob想買");
    expect(document.body.textContent).toContain("Cara想買");

    // Select the "Cara" person filter chip -> only Cara's item remains.
    const caraChip = Array.from(
      document.querySelectorAll("button.tag-filter-chip"),
    ).find((button) => button.textContent === "Cara");
    await act(async () => {
      caraChip?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(document.body.textContent).not.toContain("Bob想買");
    expect(document.body.textContent).toContain("Cara想買");
  });

  it("filters already linked pool items from the add-from-pool modal", async () => {
    mocks.state.items = [
      {
        id: "pool-1",
        name: "已加入的魚池項目",
        tags: ["日本"],
        images: [],
        purchases: [],
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T00:00:00.000Z",
      },
      {
        id: "pool-2",
        name: "尚未加入的魚池項目",
        tags: ["日本"],
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

  it("defaults the add-from-pool filter to the trip country and matches any selected tag", async () => {
    mocks.state.items = [
      {
        id: "pool-jp",
        name: "日本限定眼罩",
        tags: ["日本", "藥妝"],
        images: [],
        purchases: [],
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T00:00:00.000Z",
      },
      {
        id: "pool-kr",
        name: "韓國保養品",
        tags: ["韓國"],
        images: [],
        purchases: [],
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T00:00:00.000Z",
      },
    ];
    mocks.tripShopping = [];

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ShoppingTab tripId="trip-1" />);
    });

    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("從魚池加入"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const modalBody = document.querySelector(".fullscreen-modal-body");
    expect(modalBody?.textContent).toContain("日本限定眼罩");
    expect(modalBody?.textContent).not.toContain("韓國保養品");

    const koreaTagButton = Array.from(
      modalBody?.querySelectorAll("button") ?? [],
    ).find((button) => button.textContent === "韓國");
    expect(koreaTagButton).not.toBeNull();

    await act(async () => {
      koreaTagButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(modalBody?.textContent).toContain("日本限定眼罩");
    expect(modalBody?.textContent).toContain("韓國保養品");
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

    expect(mocks.setItems).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "pool-1",
        name: "新吹風機",
      }),
    ]);

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

  it("requires confirmation before deleting a pool purchase record", async () => {
    mocks.state.items = [
      {
        id: "pool-1",
        name: "吹風機",
        images: [],
        purchases: [
          {
            id: "purchase-1",
            date: "2026-06-20",
            amount: "4200",
            currency: "JPY",
            tripName: "Tokyo",
          },
        ],
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
      document
        .querySelector<HTMLButtonElement>(
          'button[aria-label="查看購買紀錄"]',
        )
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>(
          'button[aria-label="刪除購買紀錄"]',
        )
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("確定要刪除這筆購買紀錄嗎？");
    expect(mocks.setItems).not.toHaveBeenCalled();

    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .filter((button) => button.textContent === "刪除")
        .at(-1)
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(mocks.setItems).toHaveBeenCalledWith([
      expect.objectContaining({ id: "pool-1", purchases: [] }),
    ]);
  });
});
