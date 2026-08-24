import { fetchRestaurants, fetchAvis, getCuisineTags, filterByCuisine, joinAvis } from "./data.js";
import { createRadar, pickSelection } from "./radar.js";
import { haversineDistanceMeters, formatDistance } from "./geo.js";
import {
  renderCuisineOptions,
  renderResultCard,
  renderAlternates,
  renderError,
  setScanButtonEnabled,
  renderScanHint,
} from "./ui.js";
import "./style.css";

const SELECTION_SIZE = 5;

// Fixed point of departure for the distance shown on the featured card.
const ORIGIN = { lat: 48.892213, lon: 2.29132 };

const RESTOS_CSV_URL = import.meta.env.VITE_RESTOS_CSV_URL;
const AVIS_CSV_URL = import.meta.env.VITE_AVIS_CSV_URL;

const cuisineSelect = document.querySelector("#cuisine-select");
const scanButton = document.querySelector("#scan-button");
const scanHint = document.querySelector("#scan-hint");
const radarContainer = document.querySelector("#radar-container");
const resultContainer = document.querySelector("#result-container");
const alternatesContainer = document.querySelector("#alternates-container");
const errorContainer = document.querySelector("#error-container");

let restaurants = [];
let avis = [];
let radar = null;
// Featured pick at index 0, up to 4 alternates after it. Clicking an
// alternate swaps it with index 0 and re-renders — no new radar spin.
let selection = [];

async function init() {
  errorContainer.innerHTML = "";

  if (!RESTOS_CSV_URL || !AVIS_CSV_URL) {
    renderError(
      errorContainer,
      "Configuration manquante : VITE_RESTOS_CSV_URL et/ou VITE_AVIS_CSV_URL ne sont pas définies (fichier .env).",
      init
    );
    return;
  }

  try {
    [restaurants, avis] = await Promise.all([fetchRestaurants(RESTOS_CSV_URL), fetchAvis(AVIS_CSV_URL)]);
    renderCuisineOptions(cuisineSelect, getCuisineTags(restaurants));
    radar = createRadar(radarContainer);
    updateScanAvailability();
    cuisineSelect.addEventListener("change", updateScanAvailability);
    scanButton.addEventListener("click", handleScan);
  } catch (error) {
    renderError(errorContainer, error.message, init);
  }
}

function updateScanAvailability() {
  const filtered = filterByCuisine(restaurants, cuisineSelect.value);
  const hasResults = filtered.length > 0;
  setScanButtonEnabled(scanButton, hasResults);
  renderScanHint(scanHint, hasResults);
}

function handleScan() {
  const filtered = filterByCuisine(restaurants, cuisineSelect.value);
  selection = pickSelection(filtered, SELECTION_SIZE);
  if (selection.length === 0) return;

  resultContainer.innerHTML = "";
  alternatesContainer.innerHTML = "";
  scanButton.disabled = true;
  radar.start(() => {
    renderSelection();
    updateScanAvailability();
  });
}

function renderSelection() {
  const [featured, ...alternates] = selection;
  renderResultCard(resultContainer, featured, joinAvis(featured, avis), distanceLabelFor(featured));
  renderAlternates(alternatesContainer, alternates, (alternateIndex) => {
    const selectionIndex = alternateIndex + 1;
    [selection[0], selection[selectionIndex]] = [selection[selectionIndex], selection[0]];
    renderSelection();
  });
}

function distanceLabelFor(restaurant) {
  if (restaurant.lat === null || restaurant.lon === null) return null;
  const meters = haversineDistanceMeters(ORIGIN.lat, ORIGIN.lon, restaurant.lat, restaurant.lon);
  return formatDistance(meters);
}

init();
