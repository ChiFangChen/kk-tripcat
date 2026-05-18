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
    { key: "memories", label: "記錄" },
  ];

  if (skipPreparation) {
    return sharedTabs;
  }

  return [{ key: "preparation", label: "準備" }, ...sharedTabs];
}

export function getViewerTabs(memoriesVisibleToViewers?: boolean): Array<{
  key: TripTabType;
  label: string;
}> {
  const tabs: Array<{ key: TripTabType; label: string }> = [
    { key: "flight", label: "飛機" },
    { key: "hotel", label: "飯店" },
    { key: "schedule", label: "行程表" },
    { key: "transport", label: "交通" },
  ];

  if (memoriesVisibleToViewers) {
    tabs.push({ key: "memories", label: "記錄" });
  }

  return tabs;
}

export function getEffectiveTripTab({
  activeTab,
  defaultTab,
  tabs,
}: {
  activeTab: TripTabType;
  defaultTab: TripTabType;
  tabs: Array<{ key: TripTabType; label: string }>;
}): TripTabType {
  return tabs.some((tab) => tab.key === activeTab) ? activeTab : defaultTab;
}

export function getOrderedTripTabs({
  skipPreparation,
  gotReady,
  completed,
}: {
  skipPreparation?: boolean;
  gotReady?: boolean;
  completed?: boolean;
}): Array<{ key: TripTabType; label: string }> {
  return getTripTabGroups({ skipPreparation, gotReady, completed }).mainTabs;
}

export function getTripTabGroups({
  skipPreparation,
  gotReady,
  completed,
}: {
  skipPreparation?: boolean;
  gotReady?: boolean;
  completed?: boolean;
}): {
  mainTabs: Array<{ key: TripTabType; label: string }>;
  menuTabs: Array<{ key: TripTabType; label: string }>;
} {
  const tabs = getEditableTabs(skipPreparation);

  if (completed || skipPreparation) {
    return {
      mainTabs: tabs.filter((tab) => tab.key !== "preparation"),
      menuTabs: [],
    };
  }

  if (!gotReady) {
    return {
      mainTabs: tabs,
      menuTabs: [],
    };
  }

  return {
    mainTabs: tabs.filter((tab) => tab.key !== "preparation"),
    menuTabs: tabs.filter((tab) => tab.key === "preparation"),
  };
}
