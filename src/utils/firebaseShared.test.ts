import { describe, expect, it } from "vitest";
import {
  APP_WRITE_VERSION,
  isClientVersionOutdated,
  normalizeItems,
  normalizeSharedTripData,
  normalizeTips,
  normalizeUserTripData,
  stripUndefinedDeep,
  shouldApplyIncomingSnapshot,
} from "./firebase";

describe("normalizeSharedTripData", () => {
  it("fills missing shared trip fields when Firestore doc is partial", () => {
    expect(
      normalizeSharedTripData({
        scheduleNotes: [{ id: "note-1", title: "foo", content: "bar" }],
        hotels: [{ id: "hotel-1", name: "Hotel" }],
        transport: [
          { id: "transport-1", title: "Bus", content: "", isOpen: true },
        ],
        schedule: [
          {
            date: "2026-04-16",
            label: "",
            activities: [{ id: "act-1", name: "Breakfast" }],
          },
        ],
      } as never),
    ).toEqual({
      schedule: [
        {
          date: "2026-04-16",
          label: "",
          activities: [{ id: "act-1", name: "Breakfast", images: [] }],
        },
      ],
      scheduleNotes: [
        { id: "note-1", title: "foo", content: "bar", images: [] },
      ],
      flights: [],
      hotels: [{ id: "hotel-1", name: "Hotel", images: [] }],
      transport: [
        {
          id: "transport-1",
          title: "Bus",
          content: "",
          isOpen: true,
          images: [],
        },
      ],
    });
  });

  it("fills missing user trip fields when Firestore doc is partial", () => {
    expect(
      normalizeUserTripData({
        checklist: [
          { id: "item-1", text: "護照", checked: false, category: "旅遊" },
        ],
      }),
    ).toEqual({
      checklist: [
        { id: "item-1", text: "護照", checked: false, category: "旅遊" },
      ],
      shopping: [],
      preparationNotes: "",
      setupComplete: undefined,
      skipPreparation: false,
      gotReady: false,
    });
  });
});

describe("normalizeTips", () => {
  it("fills missing tip images", () => {
    expect(
      normalizeTips([
        {
          id: "tip-1",
          title: "tip",
          content: "content",
          tags: [],
          createdAt: "2026-04-25T00:00:00.000Z",
          updatedAt: "2026-04-25T00:00:00.000Z",
        },
      ] as never),
    ).toEqual([
      {
        id: "tip-1",
        title: "tip",
        content: "content",
        tags: [],
        images: [],
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T00:00:00.000Z",
      },
    ]);
  });
});

describe("normalizeItems", () => {
  it("fills missing item images and purchases", () => {
    expect(
      normalizeItems([
        {
          id: "item-1",
          name: "dryer",
          isFavorite: true,
          createdAt: "2026-04-25T00:00:00.000Z",
          updatedAt: "2026-04-25T00:00:00.000Z",
        },
      ] as never),
    ).toEqual([
      {
        id: "item-1",
        name: "dryer",
        images: [],
        purchases: [],
        isFavorite: true,
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T00:00:00.000Z",
      },
    ]);
  });
});

describe("shouldApplyIncomingSnapshot", () => {
  it("accepts the first snapshot when nothing is loaded yet", () => {
    expect(shouldApplyIncomingSnapshot(undefined, undefined)).toBe(true);
    expect(
      shouldApplyIncomingSnapshot(undefined, "2026-04-15T12:00:00.000Z"),
    ).toBe(true);
  });

  it("rejects stale or undated snapshots once a newer version is loaded", () => {
    expect(
      shouldApplyIncomingSnapshot(
        "2026-04-15T12:00:00.000Z",
        "2026-04-15T11:59:59.000Z",
      ),
    ).toBe(false);
    expect(
      shouldApplyIncomingSnapshot("2026-04-15T12:00:00.000Z", undefined),
    ).toBe(false);
  });

  it("accepts snapshots that are at least as new as the current version", () => {
    expect(
      shouldApplyIncomingSnapshot(
        "2026-04-15T12:00:00.000Z",
        "2026-04-15T12:00:00.000Z",
      ),
    ).toBe(true);
    expect(
      shouldApplyIncomingSnapshot(
        "2026-04-15T12:00:00.000Z",
        "2026-04-15T12:00:01.000Z",
      ),
    ).toBe(true);
  });
});

describe("isClientVersionOutdated", () => {
  it("treats missing or same-version docs as writable", () => {
    expect(isClientVersionOutdated(undefined)).toBe(false);
    expect(isClientVersionOutdated(APP_WRITE_VERSION)).toBe(false);
  });

  it("blocks writes when the doc comes from a newer app version", () => {
    expect(isClientVersionOutdated(APP_WRITE_VERSION + 1)).toBe(true);
  });
});

describe("stripUndefinedDeep", () => {
  it("removes undefined fields from nested objects and arrays", () => {
    expect(
      stripUndefinedDeep({
        schedule: [
          {
            date: "2026-04-16",
            label: "",
            activities: [
              {
                id: "act-1",
                name: "Breakfast",
                place: undefined,
                booking: {
                  platform: "Klook",
                  amount: undefined,
                },
              },
            ],
          },
        ],
        scheduleNotes: undefined,
      }),
    ).toEqual({
      schedule: [
        {
          date: "2026-04-16",
          label: "",
          activities: [
            {
              id: "act-1",
              name: "Breakfast",
              booking: {
                platform: "Klook",
              },
            },
          ],
        },
      ],
    });
  });
});
