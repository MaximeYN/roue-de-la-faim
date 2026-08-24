import { describe, it, expect } from "vitest";
import { computeBounds, createProjection, computeZoomTarget } from "../src/streetmap.js";

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

describe("computeZoomTarget", () => {
  it("centers the padded bounding box of the given points on the view", () => {
    const points = [
      { x: 100, y: 100 },
      { x: 200, y: 150 },
    ];
    const target = computeZoomTarget(points, 300);
    expect(target.scale).toBeCloseTo(2, 5);
    expect(target.tx).toBeCloseTo(-150, 5);
    expect(target.ty).toBeCloseTo(-100, 5);
    // The bbox center, transformed, must land exactly on the view's center.
    const cx = 150 * target.scale + target.tx;
    const cy = 125 * target.scale + target.ty;
    expect(cx).toBeCloseTo(150, 5);
    expect(cy).toBeCloseTo(150, 5);
  });

  it("never zooms in tighter than the minimum view span, even for near-identical points", () => {
    const points = [
      { x: 50, y: 50 },
      { x: 50.01, y: 50.01 },
    ];
    const target = computeZoomTarget(points, 300);
    // scale should reflect the MIN_VIEW_SPAN clamp (70), not the near-zero bbox.
    expect(target.scale).toBeCloseTo(300 / 70, 1);
  });

  it("caps the scale so it never zooms in absurdly far", () => {
    const points = [
      { x: 50, y: 50 },
      { x: 50.01, y: 50.01 },
    ];
    // A much larger viewSize would otherwise push scale well past a sane cap.
    const target = computeZoomTarget(points, 1000);
    expect(target.scale).toBe(6);
  });
});
