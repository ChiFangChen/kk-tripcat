import type { FlightLeg } from "../../types";

export function createFlightLegFromTemplate(
  template: FlightLeg,
  createId: () => string,
): FlightLeg {
  return {
    ...template,
    id: createId(),
  };
}

export function shouldShowAddLegMenu(legCount: number): boolean {
  return legCount > 0;
}
