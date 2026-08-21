import { describe, it, expect, vi, afterEach } from "vitest";
import { pickWinner, angularDistance, computeBlipIntensity, blipPosition } from "../src/radar.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pickWinner", () => {
  it("returns null for an empty list", () => {
    expect(pickWinner([])).toBeNull();
  });

  it("returns the element at the Math.random-derived index", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const restaurants = [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }];
    expect(pickWinner(restaurants)).toEqual({ name: "C" });
  });
});

describe("angularDistance", () => {
  it("returns 0 for identical angles", () => {
    expect(angularDistance(100, 100)).toBe(0);
  });

  it("wraps around 360", () => {
    expect(angularDistance(5, 355)).toBe(10);
  });

  it("returns 180 for opposite angles", () => {
    expect(angularDistance(0, 180)).toBe(180);
  });
});

describe("computeBlipIntensity", () => {
  it("is 1 at zero distance", () => {
    expect(computeBlipIntensity(50, 50)).toBe(1);
  });

  it("is 0 beyond the max distance", () => {
    expect(computeBlipIntensity(50, 100, 30)).toBe(0);
  });

  it("decreases proportionally to distance", () => {
    expect(computeBlipIntensity(10, 0, 30)).toBeCloseTo(1 - 10 / 30);
  });
});

describe("blipPosition", () => {
  it("places angle 0 straight up from the center", () => {
    const { x, y } = blipPosition(0, 80);
    expect(x).toBeCloseTo(120);
    expect(y).toBeCloseTo(40);
  });

  it("places angle 90 to the right of the center", () => {
    const { x, y } = blipPosition(90, 80);
    expect(x).toBeCloseTo(200);
    expect(y).toBeCloseTo(120);
  });
});
