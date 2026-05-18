import type { TabType } from "./types";

export function getEffectiveMainTab(
  activeTab: TabType,
  canAccessNotes: boolean,
): TabType {
  if (activeTab === "notes" && !canAccessNotes) return "trips";
  return activeTab;
}

export function getEffectiveSelectedTripId(
  selectedTripId: string | null,
  visibleTripIds: string[],
): string | null {
  if (!selectedTripId) return null;
  return visibleTripIds.includes(selectedTripId) ? selectedTripId : null;
}
