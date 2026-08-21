import { describe, it, expect, vi, afterEach } from "vitest";
import {
  normalizeRestaurant,
  normalizeAvis,
  getCuisineTags,
  filterByCuisine,
  joinAvis,
  fetchRestaurants,
} from "../src/data.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeRestaurant", () => {
  it("splits meta_geo_point into lat/lon", () => {
    const result = normalizeRestaurant({ name: "Bap Time", cuisine: "korean", meta_geo_point: "48.899,2.283" });
    expect(result.lat).toBeCloseTo(48.899);
    expect(result.lon).toBeCloseTo(2.283);
  });

  it("handles a missing meta_geo_point", () => {
    const result = normalizeRestaurant({ name: "Bap Time", cuisine: "korean" });
    expect(result.lat).toBeNull();
    expect(result.lon).toBeNull();
  });
});

describe("normalizeAvis", () => {
  it("maps the French Form headers", () => {
    const result = normalizeAvis({
      Restaurant: "Bap Time",
      Auteur: "Max",
      Note: "5",
      Commentaire: "Top",
    });
    expect(result).toEqual({
      restaurantName: "Bap Time",
      auteur: "Max",
      note: "5",
      commentaire: "Top",
    });
  });
});

describe("getCuisineTags", () => {
  it("splits, dedupes and sorts cuisine tags, adding Non renseigné for empty values", () => {
    const restaurants = [
      normalizeRestaurant({ name: "A", cuisine: "italian, modern" }),
      normalizeRestaurant({ name: "B", cuisine: "korean" }),
      normalizeRestaurant({ name: "C", cuisine: "italian" }),
      normalizeRestaurant({ name: "D", cuisine: "" }),
    ];
    expect(getCuisineTags(restaurants)).toEqual(["italian", "korean", "modern", "Non renseigné"].sort((a, b) => a.localeCompare(b, "fr")));
  });
});

describe("filterByCuisine", () => {
  const restaurants = [
    normalizeRestaurant({ name: "A", cuisine: "italian, modern" }),
    normalizeRestaurant({ name: "B", cuisine: "korean" }),
    normalizeRestaurant({ name: "C", cuisine: "" }),
  ];

  it("returns everything for Tous", () => {
    expect(filterByCuisine(restaurants, "Tous")).toHaveLength(3);
  });

  it("matches a tag within a comma-separated list", () => {
    const result = filterByCuisine(restaurants, "modern");
    expect(result.map((r) => r.name)).toEqual(["A"]);
  });

  it("matches Non renseigné against empty cuisine restaurants", () => {
    const result = filterByCuisine(restaurants, "Non renseigné");
    expect(result.map((r) => r.name)).toEqual(["C"]);
  });
});

describe("joinAvis", () => {
  it("returns only avis matching the restaurant name", () => {
    const restaurant = normalizeRestaurant({ name: "Bap Time", cuisine: "korean" });
    const avis = [
      normalizeAvis({ Restaurant: "Bap Time", Auteur: "Max", Note: "5", Commentaire: "Top" }),
      normalizeAvis({ Restaurant: "Autre Resto", Auteur: "Yuri", Note: "3", Commentaire: "Bof" }),
    ];
    expect(joinAvis(restaurant, avis)).toEqual([avis[0]]);
  });
});

describe("fetchRestaurants", () => {
  it("fetches and parses CSV into Restaurant objects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('name,cuisine,meta_geo_point\nBap Time,korean,"48.899,2.283"'),
      })
    );
    const result = await fetchRestaurants("https://example.com/restos.csv");
    expect(result).toEqual([{ name: "Bap Time", cuisine: "korean", phone: "", website: "", openingHours: "", lat: 48.899, lon: 2.283 }]);
  });

  it("throws a readable error on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchRestaurants("https://example.com/restos.csv")).rejects.toThrow("500");
  });
});
