import { describe, it, expect } from "vitest";
import { haversineDistanceMeters, formatDistance } from "../src/geo.js";

describe("haversineDistanceMeters", () => {
  it("is 0 for the same point", () => {
    expect(haversineDistanceMeters(48.892213, 2.29132, 48.892213, 2.29132)).toBe(0);
  });

  it("matches the known ~111.2km for one degree of latitude", () => {
    expect(haversineDistanceMeters(0, 0, 1, 0)).toBeCloseTo(111194.93, 1);
  });

  it("computes the real distance from the app's origin to a known restaurant", () => {
    // Origin: office coordinates. Target: B'bim, from the live restaurant sheet.
    const distance = haversineDistanceMeters(48.892213, 2.29132, 48.8945937789142, 2.28025614853661);
    expect(distance).toBeCloseTo(851.06, 1);
  });
});

describe("formatDistance", () => {
  it("rounds sub-kilometer distances to the nearest 10 meters", () => {
    expect(formatDistance(287)).toBe("à 290 mètres");
    expect(formatDistance(0)).toBe("à 0 mètres");
  });

  it("switches to kilometers with a comma decimal beyond 1000m", () => {
    expect(formatDistance(1450)).toBe("à 1,4 km");
  });
});
