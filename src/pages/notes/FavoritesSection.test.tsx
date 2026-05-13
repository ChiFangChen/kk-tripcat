// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FavoritesSection } from "./FavoritesSection";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = vi.fn();

const copiedImages = [
  {
    id: "copied-img-1",
    url: "https://files.local/trip-copy.jpg",
    path: "tc-images/trips/trip-1/shopping/shopping-1/copied-img-1.jpg",
    createdAt: "2026-04-25T01:00:00.000Z",
    width: 320,
    height: 240,
  },
];

const mocks = vi.hoisted(() => ({
  copyImagesToNewPaths: vi.fn(),
  deleteImage: vi.fn(),
  dispatch: vi.fn(),
  setUserTripData: vi.fn(),
  setTripMemberData: vi.fn(),
  loadTripMemberData: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("../../utils/imageUpload", () => ({
  copyImagesToNewPaths: mocks.copyImagesToNewPaths,
  createPendingImages: vi.fn(),
  persistImagesForRecord: vi.fn(),
}));

vi.mock("../../utils/firebase", () => ({
  deleteImage: mocks.deleteImage,
  uploadImage: vi.fn(),
}));

vi.mock("../../context/AppContext", () => ({
  useApp: () => ({
    state: {
      auth: { currentUser: { id: "admin-1" } },
      trips: [{ id: "trip-1", members: ["admin-1", "user-1"] }],
      items: [
        {
          id: "pool-1",
          name: "最新吹風機",
          images: [
            {
              id: "pool-img-1",
              url: "https://files.local/pool.jpg",
              path: "tc-images/users/admin-1/items/pool-1/pool-img-1.jpg",
              createdAt: "2026-04-25T00:00:00.000Z",
              width: 320,
              height: 240,
            },
          ],
          estimatedAmount: "3500",
          currency: "JPY",
          notes: "最新備註",
          purchases: [],
          isFavorite: true,
          createdAt: "2026-04-25T00:00:00.000Z",
          updatedAt: "2026-04-25T00:00:00.000Z",
        },
      ],
      userTripData: {
        "trip-1": {
          shopping: [
            {
              id: "shopping-1",
              itemId: "pool-1",
              textSnapshot: "舊吹風機",
              images: [],
              checked: false,
              createdBy: "admin-1",
              createdAt: "2026-04-25T00:00:00.000Z",
            },
          ],
        },
      },
    },
    dispatch: mocks.dispatch,
    setUserTripData: mocks.setUserTripData,
    setTripMemberData: mocks.setTripMemberData,
    loadTripMemberData: mocks.loadTripMemberData,
    showToast: mocks.showToast,
  }),
}));

describe("FavoritesSection", () => {
  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("detaches trip shopping references before deleting a pool item", async () => {
    mocks.copyImagesToNewPaths.mockResolvedValue(copiedImages);
    mocks.loadTripMemberData.mockResolvedValue({
      "user-1": {
        shopping: [
          {
            id: "shopping-2",
            itemId: "pool-1",
            textSnapshot: "舊吹風機",
            images: [],
            checked: true,
            createdBy: "user-1",
            createdAt: "2026-04-25T00:00:00.000Z",
          },
        ],
      },
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<FavoritesSection />);
    });

    const buttons = Array.from(document.querySelectorAll("button"));
    await act(async () => {
      buttons[3].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent === "刪除")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const ownShopping = mocks.setUserTripData.mock.calls[0][1].shopping[0];
    expect(ownShopping).toEqual(
      expect.objectContaining({
        textSnapshot: "最新吹風機",
        images: copiedImages,
        estimatedAmount: "3500",
        currency: "JPY",
        note: "最新備註",
      }),
    );
    expect(ownShopping).not.toHaveProperty("itemId");

    const memberShopping = mocks.setTripMemberData.mock.calls[0][2].shopping[0];
    expect(mocks.setTripMemberData.mock.calls[0][0]).toBe("trip-1");
    expect(mocks.setTripMemberData.mock.calls[0][1]).toBe("user-1");
    expect(memberShopping).toEqual(
      expect.objectContaining({
        textSnapshot: "最新吹風機",
        images: copiedImages,
        checked: true,
      }),
    );
    expect(memberShopping).not.toHaveProperty("itemId");
    expect(mocks.deleteImage).toHaveBeenCalledWith(
      "tc-images/users/admin-1/items/pool-1/pool-img-1.jpg",
    );
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "DELETE_ITEM",
      itemId: "pool-1",
    });
  });
});
