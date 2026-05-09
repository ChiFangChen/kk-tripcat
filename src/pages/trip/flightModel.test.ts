import { describe, expect, it } from "vitest";
import type { FlightLeg } from "../../types";
import {
  createFlightLegFromTemplate,
  shouldShowAddLegMenu,
} from "./flightModel";

describe("flightModel", () => {
  it("creates a new flight leg from a template without reusing the original id", () => {
    const template: FlightLeg = {
      id: "leg-1",
      direction: "去程：台北 → 清邁",
      date: "2026-04-09",
      flightNumber: "CI851",
      aircraft: "A321neo",
      departureTime: "07:30",
      departureAirportCode: "TPE",
      departureAirport: "桃園機場",
      departureTerminal: "T2",
      arrivalTime: "10:45",
      arrivalAirportCode: "CNX",
      arrivalAirport: "清邁機場",
      arrivalTerminal: "T1",
      duration: "3h 15m",
      meal: "早餐",
      seat: "12A",
    };

    const result = createFlightLegFromTemplate(template, () => "leg-2");

    expect(result).toEqual({
      ...template,
      id: "leg-2",
    });
  });

  it("only shows the add menu when a template option is available", () => {
    expect(shouldShowAddLegMenu(0)).toBe(false);
    expect(shouldShowAddLegMenu(1)).toBe(true);
  });
});
