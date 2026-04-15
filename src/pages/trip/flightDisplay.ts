import type { FlightLeg } from "../../types";

export interface AirportDisplay {
  code: string;
  name: string;
  terminal?: string;
}

export function getAirportDisplay(
  code: string | undefined,
  name: string,
  terminal?: string,
): AirportDisplay {
  return {
    code: code?.trim().toUpperCase() || "",
    name: name.trim(),
    terminal: terminal?.trim() || undefined,
  };
}

export function getFlightNumberLabel(leg: FlightLeg): string {
  if (!leg.aircraft) return leg.flightNumber;
  return `${leg.flightNumber} (${leg.aircraft})`;
}
