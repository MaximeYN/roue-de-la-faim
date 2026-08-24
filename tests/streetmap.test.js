import { describe, it, expect } from "vitest";
import { computeBounds, createProjection } from "../src/streetmap.js";

describe("computeBounds", () => {
  it("finds the min/max lat/lon across all streets, with padding", () => {
    const streets = [
      [
        [48.89, 2.29],
        [48.895, 2.295],
      ],
      [[48.885, 2.285]],
    ];
    const bounds = computeBounds(streets);
    expect(bounds.minLat).toBeCloseTo(48.885 - 0.001, 5);
    expect(bounds.maxLat).toBeCloseTo(48.895 + 0.001, 5);
    expect(bounds.minLon).toBeCloseTo(2.285 - 0.001, 5);
    expect(bounds.maxLon).toBeCloseTo(2.295 + 0.001, 5);
  });
});

describe("createProjection", () => {
  const bounds = { minLat: 48.88, maxLat: 48.9, minLon: 2.28, maxLon: 2.3 };
  const project = createProjection(bounds, 300, 16);

  it("places the top-left corner (maxLat, minLon) near the margin", () => {
    const { x, y } = project(48.9, 2.28);
    expect(x).toBeCloseTo(16, 0);
    expect(y).toBeCloseTo(16, 0);
  });

  it("places a point further south and east further down and to the right", () => {
    const topLeft = project(48.9, 2.28);
    const bottomRight = project(48.88, 2.3);
    expect(bottomRight.x).toBeGreaterThan(topLeft.x);
    expect(bottomRight.y).toBeGreaterThan(topLeft.y);
  });

  it("keeps every projected point within the view box (plus margin)", () => {
    const corners = [
      [48.9, 2.28],
      [48.9, 2.3],
      [48.88, 2.28],
      [48.88, 2.3],
    ];
    corners.forEach(([lat, lon]) => {
      const { x, y } = project(lat, lon);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(300);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(300);
    });
  });
});
