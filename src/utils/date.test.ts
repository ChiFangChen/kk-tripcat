import { describe, expect, it } from "vitest";
import { formatDateWithWeekday } from "./date";

describe("formatDateWithWeekday", () => {
  it("formats YYYY-MM-DD as YYYY/M/D with Chinese weekday", () => {
    expect(formatDateWithWeekday("2026-04-09")).toBe("2026/4/9（四）");
  });

  it("returns the original value when date is invalid", () => {
    expect(formatDateWithWeekday("not-a-date")).toBe("not-a-date");
  });
});
