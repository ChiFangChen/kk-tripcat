import { describe, expect, it } from "vitest";
import { getAirportDisplay } from "./flightDisplay";

describe("getAirportDisplay", () => {
  it("derives airport code from a space-delimited airport string", () => {
    expect(getAirportDisplay(undefined, "TPE 桃園國際機場")).toEqual({
      code: "TPE",
      name: "桃園國際機場",
      terminal: undefined,
    });
  });

  it("prefers explicit airport code when provided", () => {
    expect(getAirportDisplay("CNX", "清邁國際機場", "T1")).toEqual({
      code: "CNX",
      name: "清邁國際機場",
      terminal: "T1",
    });
  });
});
