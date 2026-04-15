import { describe, expect, it } from "vitest";
import {
  getFirstEntryMode,
  getEditableTabs,
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
    ]);
  });
});
