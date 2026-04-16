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
  const trimmedName = name.trim();
  const [firstToken, ...restTokens] = trimmedName.split(/\s+/).filter(Boolean);
  const derivedCode =
    !code?.trim() && firstToken && /^[A-Za-z]{3,4}$/.test(firstToken)
      ? firstToken.toUpperCase()
      : "";
  const derivedName =
    derivedCode && restTokens.length > 0 ? restTokens.join(" ") : trimmedName;

  return {
    code: code?.trim().toUpperCase() || derivedCode,
    name: derivedName,
    terminal: terminal?.trim() || undefined,
  };
}

export function getFlightNumberLabel(leg: FlightLeg): string {
  if (!leg.aircraft) return leg.flightNumber;
  return `${leg.flightNumber} (${leg.aircraft})`;
}
