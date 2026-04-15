import type { TripTabType } from "../../types";

export type EntryMode = "none" | "choice" | "template";

export interface SetupState {
  viewOnly?: boolean;
  isMember: boolean;
  setupComplete?: boolean;
  skipPreparation?: boolean;
  setupChoice?: "preparation" | "skip";
}

export function getFirstEntryMode(state: SetupState): EntryMode {
  if (
    state.viewOnly ||
    !state.isMember ||
    state.setupComplete ||
    state.skipPreparation
  ) {
    return "none";
  }

  if (state.setupChoice === "preparation") {
    return "template";
  }

  return "choice";
}

export function getEditableTabs(skipPreparation?: boolean): Array<{
  key: TripTabType;
  label: string;
}> {
  const sharedTabs: Array<{ key: TripTabType; label: string }> = [
    { key: "flight", label: "飛機" },
    { key: "hotel", label: "飯店" },
    { key: "schedule", label: "行程表" },
    { key: "transport", label: "交通" },
    { key: "shopping", label: "購物" },
  ];

  if (skipPreparation) {
    return sharedTabs;
  }

  return [{ key: "preparation", label: "準備" }, ...sharedTabs];
}
