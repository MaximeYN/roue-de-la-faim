import { parseCSV } from "./csv.js";

const NON_RENSEIGNE = "Non renseigné";

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
    auteur: row.Auteur || "",
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
  return parseCSV(text).map(normalizeRestaurant);
}

export async function fetchAvis(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Échec du chargement des avis (${response.status})`);
  const text = await response.text();
  return parseCSV(text).map(normalizeAvis);
}
