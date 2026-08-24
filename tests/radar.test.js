import { describe, it, expect, vi, afterEach } from "vitest";
import { pickSelection, angularDistance, computeBlipIntensity, blipPosition } from "../src/radar.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pickSelection", () => {
  it("returns an empty array for an empty list", () => {
    expect(pickSelection([], 5)).toEqual([]);
  });

  it("returns every item, in shuffled order, when count exceeds the list length", () => {
    const restaurants = [{ name: "A" }, { name: "B" }, { name: "C" }];
    const result = pickSelection(restaurants, 5);
    expect(result).toHaveLength(3);
    expect(result).toEqual(expect.arrayContaining(restaurants));
  });

  it("returns exactly `count` distinct items when there are enough candidates", () => {
    const restaurants = Array.from({ length: 20 }, (_, i) => ({ name: `R${i}` }));
    const result = pickSelection(restaurants, 5);
    expect(result).toHaveLength(5);
    // No duplicates: 5 unique names among the 5 results.
    expect(new Set(result.map((r) => r.name)).size).toBe(5);
    // Every result actually came from the input list.
    result.forEach((r) => expect(restaurants).toContainEqual(r));
  });

  it("defaults to a selection of 5 when count is omitted", () => {
    const restaurants = Array.from({ length: 20 }, (_, i) => ({ name: `R${i}` }));
    expect(pickSelection(restaurants)).toHaveLength(5);
  });

  it("produces a deterministic order for a known Math.random sequence", () => {
    // Fisher-Yates over [A,B,C,D] walking i = 3,2,1 with fixed random() values.
    // i=3: j = floor(0.0 * 4) = 0  -> swap indices 3 and 0 -> [D,B,C,A]
    // i=2: j = floor(0.5 * 3) = 1  -> swap indices 2 and 1 -> [D,C,B,A]
    // i=1: j = floor(0.99 * 2) = 1 -> swap indices 1 and 1 -> [D,C,B,A]
    const sequence = [0.0, 0.5, 0.99];
    let call = 0;
    vi.spyOn(Math, "random").mockImplementation(() => sequence[call++]);
    const restaurants = [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }];
    expect(pickSelection(restaurants, 4)).toEqual([{ name: "D" }, { name: "C" }, { name: "B" }, { name: "A" }]);
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
