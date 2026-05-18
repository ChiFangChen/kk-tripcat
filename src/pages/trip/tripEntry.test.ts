import { describe, expect, it } from "vitest";
import {
  getFirstEntryMode,
  getEditableTabs,
  getEffectiveTripTab,
  getOrderedTripTabs,
  getTripTabGroups,
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

  it("moves preparation out of the main tabs after the user got ready", () => {
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
    ]);
  });

  it("places preparation in the hidden tab group after the user got ready", () => {
    const groups = getTripTabGroups({
      skipPreparation: false,
      gotReady: true,
      completed: false,
    });

    expect(groups.mainTabs.map((tab) => tab.key)).toEqual([
      "flight",
      "hotel",
      "schedule",
      "transport",
      "shopping",
      "memories",
    ]);
    expect(groups.menuTabs.map((tab) => tab.key)).toEqual(["preparation"]);
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

  it("labels the memories tab as records", () => {
    expect(
      getEditableTabs(true).find((tab) => tab.key === "memories")?.label,
    ).toBe("記錄");
    expect(
      getViewerTabs(true).find((tab) => tab.key === "memories")?.label,
    ).toBe("記錄");
  });

  it("falls back to the default trip tab when the active tab is unavailable", () => {
    expect(
      getEffectiveTripTab({
        activeTab: "preparation",
        defaultTab: "flight",
        tabs: [{ key: "flight", label: "飛機" }],
      }),
    ).toBe("flight");
  });

  it("keeps the active trip tab when it is available", () => {
    expect(
      getEffectiveTripTab({
        activeTab: "shopping",
        defaultTab: "flight",
        tabs: [
          { key: "flight", label: "飛機" },
          { key: "shopping", label: "購物" },
        ],
      }),
    ).toBe("shopping");
  });
});
