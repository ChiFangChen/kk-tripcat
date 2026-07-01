import { describe, expect, it } from "vitest";
import {
  buildPoolItemFromTripShopping,
  buildShoppingPriceBadges,
  detachTripShoppingItemFromPoolItem,
  filterPoolItemsByTags,
  getOwnPoolPromotionCandidates,
  getPoolItemTags,
  getWishlistShareCandidates,
  getTripShoppingResolvedContent,
  isLinkedTripShoppingItem,
  linkTripShoppingItemToPoolItem,
  type Item,
  type TripShoppingItem,
} from "./shoppingTypes";

const poolItem: Item = {
  id: "pool-1",
  name: "吹風機",
  brand: "Panasonic",
  spec: "EH-NA9M",
  images: [],
  estimatedAmount: "3000",
  currency: "JPY",
  notes: "輕量款",
  purchases: [],
  createdAt: "2026-04-25T00:00:00.000Z",
  updatedAt: "2026-04-25T00:00:00.000Z",
};

describe("shoppingTypes", () => {
  it("builds price badges with suggested, lowest, and latest labels", () => {
    expect(
      buildShoppingPriceBadges({
        estimatedAmount: "3000",
        currency: "JPY",
        purchases: [
          {
            id: "purchase-latest",
            date: "2026-05-01",
            amount: "2500",
            currency: "JPY",
          },
          {
            id: "purchase-lowest",
            date: "2026-04-01",
            amount: "2199",
            currency: "JPY",
          },
        ],
      }),
    ).toEqual([
      { label: "suggested", value: "3000 JPY" },
      { label: "lowest", value: "2199 JPY" },
      { label: "latest", value: "2500 JPY" },
    ]);
  });

  it("collects unique pool item tags", () => {
    expect(
      getPoolItemTags([
        { ...poolItem, tags: ["日本", "藥妝", "日本"] },
        { ...poolItem, id: "pool-2", tags: [" 韓國 ", ""] },
        { ...poolItem, id: "pool-3" },
      ]),
    ).toEqual(["日本", "藥妝", "韓國"]);
  });

  it("filters pool items by matching any selected tag", () => {
    const items: Item[] = [
      { ...poolItem, id: "pool-jp", tags: ["日本", "藥妝"] },
      { ...poolItem, id: "pool-kr", tags: ["韓國"] },
      { ...poolItem, id: "pool-empty" },
    ];

    expect(filterPoolItemsByTags(items, ["韓國", "美國"]).map((item) => item.id))
      .toEqual(["pool-kr"]);
    expect(filterPoolItemsByTags(items, ["日本", "韓國"]).map((item) => item.id))
      .toEqual(["pool-jp", "pool-kr"]);
    expect(filterPoolItemsByTags(items, []).map((item) => item.id)).toEqual([
      "pool-jp",
      "pool-kr",
      "pool-empty",
    ]);
  });

  it("filters untagged pool items when includeUntagged is set", () => {
    const items: Item[] = [
      { ...poolItem, id: "pool-jp", tags: ["日本", "藥妝"] },
      { ...poolItem, id: "pool-kr", tags: ["韓國"] },
      { ...poolItem, id: "pool-empty" },
      { ...poolItem, id: "pool-blank", tags: ["", "  "] },
    ];

    expect(
      filterPoolItemsByTags(items, [], { includeUntagged: true }).map(
        (item) => item.id,
      ),
    ).toEqual(["pool-empty", "pool-blank"]);
    expect(
      filterPoolItemsByTags(items, ["日本"], { includeUntagged: true }).map(
        (item) => item.id,
      ),
    ).toEqual(["pool-jp", "pool-empty", "pool-blank"]);
    expect(
      filterPoolItemsByTags(items, [], { includeUntagged: false }).map(
        (item) => item.id,
      ),
    ).toEqual(["pool-jp", "pool-kr", "pool-empty", "pool-blank"]);
  });

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

    expect(
      getTripShoppingResolvedContent(tripItem, [
        {
          ...poolItem,
          purchases: [
            {
              id: "purchase-latest",
              date: "2026-05-01",
              amount: "219",
              currency: "JPY",
            },
            {
              id: "purchase-old",
              date: "2026-04-01",
              amount: "250",
              currency: "JPY",
            },
          ],
        },
      ]),
    ).toMatchObject({
      id: "trip-1",
      name: "吹風機",
      brand: "Panasonic",
      spec: "EH-NA9M",
      purchaseAmount: "219",
      purchaseCurrency: "JPY",
      estimatedAmount: "3000",
      currency: "JPY",
      checked: true,
    });
  });

  it("falls back to trip snapshot values for draft shopping items", () => {
    const tripItem: TripShoppingItem = {
      id: "trip-2",
      textSnapshot: "泡麵",
      brand: "日清",
      spec: "海鮮杯麵",
      images: [],
      purchaseAmount: "99",
      purchaseCurrency: "TWD",
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
      brand: "日清",
      spec: "海鮮杯麵",
      purchaseAmount: "99",
      purchaseCurrency: "TWD",
      estimatedAmount: "120",
      currency: "TWD",
      note: "宵夜",
      checked: false,
    });
  });

  it("shares only non-private, unbought, unlinked draft items in the wishlist view", () => {
    const shoppingItems: TripShoppingItem[] = [
      {
        id: "draft-open",
        textSnapshot: "別人想買",
        images: [],
        checked: false,
        createdBy: "user-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
      {
        id: "draft-private",
        textSnapshot: "秘密的",
        images: [],
        checked: false,
        private: true,
        createdBy: "user-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
      {
        id: "draft-bought",
        textSnapshot: "已買",
        images: [],
        checked: true,
        createdBy: "user-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
      {
        id: "linked",
        itemId: "pool-1",
        textSnapshot: "來自魚池",
        images: [],
        checked: false,
        createdBy: "user-1",
        createdAt: "2026-04-25T00:00:00.000Z",
      },
    ];

    expect(getWishlistShareCandidates(shoppingItems)).toEqual([
      shoppingItems[0],
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
      brand: "Meiji",
      spec: "12 入",
      purchaseAmount: "199",
      purchaseCurrency: "TWD",
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
        purchaseId: "purchase-pool-new",
        tripId: "trip-1",
        tripName: "東京",
        tags: ["日本", "伴手禮", "日本"],
      }),
    ).toEqual({
      id: "pool-new",
      name: "草莓巧克力",
      brand: "Meiji",
      spec: "12 入",
      tags: ["日本", "伴手禮"],
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
      purchases: [
        {
          id: "purchase-pool-new",
          date: "2026-04-25",
          amount: "199",
          currency: "TWD",
          tripId: "trip-1",
          tripName: "東京",
        },
      ],
      createdAt: "2026-04-25T01:00:00.000Z",
      updatedAt: "2026-04-25T01:00:00.000Z",
    });
  });

  it("omits empty optional fields when building a pool item", () => {
    const tripItem: TripShoppingItem = {
      id: "trip-2",
      textSnapshot: "草莓巧克力",
      images: [],
      checked: false,
      createdBy: "user-2",
      createdAt: "2026-04-25T00:00:00.000Z",
    };

    const poolItem = buildPoolItemFromTripShopping({
      source: tripItem,
      itemId: "pool-new",
      images: [],
      now: "2026-04-25T01:00:00.000Z",
    });

    expect(poolItem).toStrictEqual({
      id: "pool-new",
      name: "草莓巧克力",
      images: [],
      purchases: [],
      createdAt: "2026-04-25T01:00:00.000Z",
      updatedAt: "2026-04-25T01:00:00.000Z",
    });
    expect("estimatedAmount" in poolItem).toBe(false);
    expect("currency" in poolItem).toBe(false);
    expect("notes" in poolItem).toBe(false);
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
          brand: "Dyson",
          spec: "HD08",
          purchases: [
            {
              id: "purchase-latest",
              date: "2026-05-01",
              amount: "4300",
              currency: "JPY",
            },
          ],
          images: copiedImages,
          estimatedAmount: "3500",
          notes: "最新備註",
        },
      }),
    ).toEqual({
      id: "trip-1",
      textSnapshot: "最新吹風機",
      brand: "Dyson",
      spec: "HD08",
      purchaseAmount: "4300",
      purchaseCurrency: "JPY",
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
      private: true,
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
      private: true,
      createdBy: "admin-1",
      createdAt: "2026-04-25T00:00:00.000Z",
    });
  });

  it("defaults private to false when linking a trip item without the flag", () => {
    expect(
      linkTripShoppingItemToPoolItem({
        tripItem: {
          id: "trip-2",
          textSnapshot: "無私密旗標",
          images: [],
          checked: false,
          createdBy: "user-1",
          createdAt: "2026-04-25T00:00:00.000Z",
        },
        poolItemId: "pool-x",
      }),
    ).toMatchObject({ private: false });
  });
});
