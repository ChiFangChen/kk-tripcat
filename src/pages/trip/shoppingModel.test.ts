import { describe, expect, it } from "vitest";
import {
  buildPoolItemFromTripShopping,
  detachTripShoppingItemFromPoolItem,
  getOwnPoolPromotionCandidates,
  getPoolPromotionCandidates,
  getTripShoppingResolvedContent,
  isLinkedTripShoppingItem,
  linkTripShoppingItemToPoolItem,
  type Item,
  type TripShoppingItem,
} from "./shoppingTypes";

const poolItem: Item = {
  id: "pool-1",
  name: "吹風機",
  images: [],
  estimatedAmount: "3000",
  currency: "JPY",
  notes: "輕量款",
  purchases: [],
  createdAt: "2026-04-25T00:00:00.000Z",
  updatedAt: "2026-04-25T00:00:00.000Z",
};

describe("shoppingTypes", () => {
  it("identifies linked trip shopping items by itemId", () => {
    expect(
      isLinkedTripShoppingItem({
        id: "trip-1",
        itemId: "pool-1",
        textSnapshot: "吹風機",
        images: [],
        checked: false,
        createdBy: "user-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("resolves linked item content from the pool and keeps checked from trip state", () => {
    const tripItem: TripShoppingItem = {
      id: "trip-1",
      itemId: "pool-1",
      textSnapshot: "舊快照",
      images: [],
      checked: true,
      createdBy: "admin-1",
      createdAt: "2026-04-25T00:00:00.000Z",
    };

    expect(getTripShoppingResolvedContent(tripItem, [poolItem])).toMatchObject({
      id: "trip-1",
      name: "吹風機",
      estimatedAmount: "3000",
      currency: "JPY",
      checked: true,
    });
  });

  it("falls back to trip snapshot values for draft shopping items", () => {
    const tripItem: TripShoppingItem = {
      id: "trip-2",
      textSnapshot: "泡麵",
      images: [],
      estimatedAmount: "120",
      currency: "TWD",
      note: "宵夜",
      checked: false,
      createdBy: "user-2",
      createdAt: "2026-04-25T00:00:00.000Z",
    };

    expect(getTripShoppingResolvedContent(tripItem, [poolItem])).toMatchObject({
      id: "trip-2",
      name: "泡麵",
      estimatedAmount: "120",
      currency: "TWD",
      note: "宵夜",
      checked: false,
    });
  });

  it("filters only unpromoted draft items from other members for the admin review popup", () => {
    const shoppingItems: TripShoppingItem[] = [
      {
        id: "mine",
        textSnapshot: "我自己的",
        images: [],
        checked: false,
        createdBy: "admin-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
      {
        id: "draft-open",
        textSnapshot: "別人想買",
        images: [],
        checked: false,
        createdBy: "user-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
      {
        id: "draft-promoted",
        textSnapshot: "已收編",
        images: [],
        checked: false,
        createdBy: "user-2",
        createdAt: "2026-04-25T00:00:00.000Z",
        promotedToPoolAt: "2026-04-25T01:00:00.000Z",
        promotedBy: "admin-1",
      },
    ];

    expect(getPoolPromotionCandidates(shoppingItems, "admin-1")).toEqual([
      shoppingItems[1],
      shoppingItems[2],
    ]);
  });

  it("filters unpromoted draft items created by the admin for inline pool promotion", () => {
    const shoppingItems: TripShoppingItem[] = [
      {
        id: "mine-open",
        textSnapshot: "我自己的",
        images: [],
        checked: false,
        createdBy: "admin-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
      {
        id: "mine-linked",
        itemId: "pool-1",
        textSnapshot: "已經來自魚池",
        images: [],
        checked: false,
        createdBy: "admin-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
      {
        id: "mine-promoted",
        textSnapshot: "已收編",
        images: [],
        checked: false,
        createdBy: "admin-1",
        createdAt: "2026-04-25T00:00:00.000Z",
        promotedToPoolAt: "2026-04-25T01:00:00.000Z",
        promotedBy: "admin-1",
      },
      {
        id: "other-open",
        textSnapshot: "別人的",
        images: [],
        checked: false,
        createdBy: "user-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
    ];

    expect(getOwnPoolPromotionCandidates(shoppingItems, "admin-1")).toEqual([
      shoppingItems[0],
    ]);
  });

  it("builds a detached pool item from a trip draft snapshot", () => {
    const tripItem: TripShoppingItem = {
      id: "trip-2",
      textSnapshot: "草莓巧克力",
      images: [
        {
          id: "img-1",
          url: "https://files.local/old.jpg",
          path: "tc-images/trips/trip-1/shopping/trip-2/img-1.jpg",
          createdAt: "2026-04-25T00:00:00.000Z",
          width: 320,
          height: 240,
        },
      ],
      estimatedAmount: "250",
      currency: "TWD",
      note: "伴手禮",
      checked: false,
      createdBy: "user-2",
      createdAt: "2026-04-25T00:00:00.000Z",
    };

    expect(
      buildPoolItemFromTripShopping({
        source: tripItem,
        itemId: "pool-new",
        images: [
          {
            id: "img-new",
            url: "https://files.local/new.jpg",
            path: "tc-images/users/admin-1/items/pool-new/img-new.jpg",
            createdAt: "2026-04-25T01:00:00.000Z",
            width: 640,
            height: 480,
          },
        ],
        now: "2026-04-25T01:00:00.000Z",
      }),
    ).toEqual({
      id: "pool-new",
      name: "草莓巧克力",
      images: [
        {
          id: "img-new",
          url: "https://files.local/new.jpg",
          path: "tc-images/users/admin-1/items/pool-new/img-new.jpg",
          createdAt: "2026-04-25T01:00:00.000Z",
          width: 640,
          height: 480,
        },
      ],
      estimatedAmount: "250",
      currency: "TWD",
      notes: "伴手禮",
      purchases: [],
      createdAt: "2026-04-25T01:00:00.000Z",
      updatedAt: "2026-04-25T01:00:00.000Z",
    });
  });

  it("detaches a linked trip shopping item using the latest pool item snapshot", () => {
    const linkedTripItem: TripShoppingItem = {
      id: "trip-1",
      itemId: "pool-1",
      textSnapshot: "舊名稱",
      images: [],
      checked: true,
      createdBy: "admin-1",
      createdAt: "2026-04-25T00:00:00.000Z",
    };
    const copiedImages = [
      {
        id: "copied-img-1",
        url: "https://files.local/trip-copy.jpg",
        path: "tc-images/trips/trip-1/shopping/trip-1/copied-img-1.jpg",
        createdAt: "2026-04-25T01:00:00.000Z",
        width: 320,
        height: 240,
      },
    ];

    expect(
      detachTripShoppingItemFromPoolItem({
        tripItem: linkedTripItem,
        poolItem: {
          ...poolItem,
          name: "最新吹風機",
          images: copiedImages,
          estimatedAmount: "3500",
          notes: "最新備註",
        },
      }),
    ).toEqual({
      id: "trip-1",
      textSnapshot: "最新吹風機",
      images: copiedImages,
      estimatedAmount: "3500",
      currency: "JPY",
      note: "最新備註",
      checked: true,
      createdBy: "admin-1",
      createdAt: "2026-04-25T00:00:00.000Z",
    });
  });

  it("links a promoted trip shopping item to the new pool item and clears local content", () => {
    const draftTripItem: TripShoppingItem = {
      id: "trip-1",
      textSnapshot: "草莓巧克力",
      images: [
        {
          id: "img-1",
          url: "https://files.local/old.jpg",
          path: "tc-images/trips/trip-1/shopping/trip-1/img-1.jpg",
          createdAt: "2026-04-25T00:00:00.000Z",
          width: 320,
          height: 240,
        },
      ],
      estimatedAmount: "250",
      currency: "TWD",
      note: "伴手禮",
      checked: true,
      createdBy: "admin-1",
      createdAt: "2026-04-25T00:00:00.000Z",
      promotedToPoolAt: "2026-04-25T01:00:00.000Z",
      promotedBy: "admin-1",
    };

    expect(
      linkTripShoppingItemToPoolItem({
        tripItem: draftTripItem,
        poolItemId: "pool-new",
      }),
    ).toEqual({
      id: "trip-1",
      itemId: "pool-new",
      textSnapshot: "草莓巧克力",
      images: [],
      checked: true,
      createdBy: "admin-1",
      createdAt: "2026-04-25T00:00:00.000Z",
    });
  });
});
