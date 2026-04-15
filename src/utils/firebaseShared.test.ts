import { describe, expect, it } from "vitest";
import {
  normalizeSharedTripData,
  normalizeUserTripData,
  shouldApplyIncomingSnapshot,
} from "./firebase";

describe("normalizeSharedTripData", () => {
  it("fills missing shared trip fields when Firestore doc is partial", () => {
    expect(
      normalizeSharedTripData({
        scheduleNotes: [{ id: "note-1", title: "foo", content: "bar" }],
      }),
    ).toEqual({
      schedule: [],
      scheduleNotes: [{ id: "note-1", title: "foo", content: "bar" }],
      flights: [],
      hotels: [],
      transport: [],
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
    });
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
