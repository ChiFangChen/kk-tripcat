import { describe, expect, it } from "vitest";
import {
  getFirstEntryMode,
  getEditableTabs,
  getOrderedTripTabs,
  getViewerTabs,
  type SetupState,
} from "./tripEntry";

describe("tripEntry", () => {
  it("shows choice screen for first-time member without setup", () => {
    const state: SetupState = {
      viewOnly: false,
      isMember: true,
      setupComplete: false,
      skipPreparation: false,
    };

    expect(getFirstEntryMode(state)).toBe("choice");
  });

  it("shows template editor after choosing preparation flow", () => {
    const state: SetupState = {
      viewOnly: false,
      isMember: true,
      setupComplete: false,
      skipPreparation: false,
      setupChoice: "preparation",
    };

    expect(getFirstEntryMode(state)).toBe("template");
  });

  it("hides preparation tab when user skipped preparation for this trip", () => {
    expect(getEditableTabs(true).map((tab) => tab.key)).toEqual([
      "flight",
      "hotel",
      "schedule",
      "transport",
      "shopping",
      "memories",
    ]);
  });

  it("moves preparation to the end after the user got ready", () => {
    expect(
      getOrderedTripTabs({
        skipPreparation: false,
        gotReady: true,
        completed: false,
      }).map((tab) => tab.key),
    ).toEqual([
      "flight",
      "hotel",
      "schedule",
      "transport",
      "shopping",
      "memories",
      "preparation",
    ]);
  });

  it("hides preparation after the trip is completed", () => {
    expect(
      getOrderedTripTabs({
        skipPreparation: false,
        gotReady: true,
        completed: true,
      }).map((tab) => tab.key),
    ).toEqual([
      "flight",
      "hotel",
      "schedule",
      "transport",
      "shopping",
      "memories",
    ]);
  });

  it("shows memories in viewer mode only when enabled", () => {
    expect(getViewerTabs(false).map((tab) => tab.key)).toEqual([
      "flight",
      "hotel",
      "schedule",
      "transport",
    ]);
    expect(getViewerTabs(true).map((tab) => tab.key)).toEqual([
      "flight",
      "hotel",
      "schedule",
      "transport",
      "memories",
    ]);
  });
});
