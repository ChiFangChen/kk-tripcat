import { describe, expect, it } from "vitest";
import {
  getEffectiveMainTab,
  getEffectiveSelectedTripId,
} from "./navigationState";

describe("navigationState", () => {
  it("falls back to trips when notes are not accessible", () => {
    expect(getEffectiveMainTab("notes", false)).toBe("trips");
  });

  it("keeps notes when they are accessible", () => {
    expect(getEffectiveMainTab("notes", true)).toBe("notes");
  });

  it("clears a selected trip that is no longer visible", () => {
    expect(getEffectiveSelectedTripId("trip-2", ["trip-1"])).toBeNull();
  });

  it("keeps a visible selected trip", () => {
    expect(getEffectiveSelectedTripId("trip-1", ["trip-1"])).toBe("trip-1");
  });
});
