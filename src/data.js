import { parseCSV } from "./csv.js";

const NON_RENSEIGNE = "Non renseigné";
const CLOSED_THRESHOLD_YEARS = 5;

// Free/open-data-only heuristic for "probably still open": an OSM entry
// untouched in 5+ years is excluded — no paid API involved (checked: SIRENE
// cross-reference isn't viable, only 2/223 restaurants carry a siret).
// Imprecise by nature — a stable restaurant nobody needed to correct can go
// years without an edit and still be open — but it's the only free signal
// available, and it matches the real closure pattern in a sector with high
// turnover. Exported for testing with an injected `now`.
export function isLikelyStillOpen(lastUpdateRaw, now = new Date()) {
  const lastUpdate = new Date(lastUpdateRaw);
  if (Number.isNaN(lastUpdate.getTime())) return true;
  const ageYears = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  return ageYears < CLOSED_THRESHOLD_YEARS;
}

export function normalizeRestaurant(row) {
  const [lat, lon] = (row.meta_geo_point || "")
    .split(",")
    .map((v) => Number.parseFloat(v.trim()));

  return {
    name: row.name || "",
    cuisine: row.cuisine || "",
    phone: row.phone || "",
    website: row.website || "",
    openingHours: row.opening_hours || "",
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  };
}

export function normalizeAvis(row) {
  return {
    restaurantName: row.Restaurant || "",
    auteur: row.Astronaute || "",
    note: row.Note || "",
    commentaire: row.Commentaire || "",
  };
}

export function getCuisineTags(restaurants) {
  const tags = new Set();
  for (const r of restaurants) {
    const value = r.cuisine.trim();
    if (value === "") {
      tags.add(NON_RENSEIGNE);
      continue;
    }
    value.split(",").forEach((tag) => {
      const trimmed = tag.trim();
      if (trimmed) tags.add(trimmed);
    });
  }
  return [...tags].sort((a, b) => a.localeCompare(b, "fr"));
}

export function filterByCuisine(restaurants, tag) {
  if (!tag || tag === "Tous") return restaurants;
  if (tag === NON_RENSEIGNE) {
    return restaurants.filter((r) => r.cuisine.trim() === "");
  }
  return restaurants.filter((r) =>
    r.cuisine
      .split(",")
      .map((t) => t.trim())
      .includes(tag)
  );
}

export function joinAvis(restaurant, avisList) {
  return avisList.filter((a) => a.restaurantName === restaurant.name);
}

export async function fetchRestaurants(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Échec du chargement des restaurants (${response.status})`);
  const text = await response.text();
  // Some OSM entries have no name at all (confirmed on the live sheet — a
  // "kebab" row with name ""). Filtered here, once, so they never show up
  // anywhere downstream (dropdown, tirage, alternates) — rather than a
  // display-only patch in each place a restaurant's name gets shown.
  return parseCSV(text)
    .filter((row) => isLikelyStillOpen(row.meta_last_update))
    .map(normalizeRestaurant)
    .filter((r) => r.name.trim() !== "");
}

export async function fetchAvis(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Échec du chargement des avis (${response.status})`);
  const text = await response.text();
  return parseCSV(text).map(normalizeAvis);
}
