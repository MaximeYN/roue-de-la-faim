import { fetchRestaurants, fetchAvis, getCuisineTags, filterByCuisine, joinAvis } from "./data.js";
import { createRadar, pickWinner } from "./radar.js";
import { renderCuisineOptions, renderResultCard, renderError, setScanButtonEnabled } from "./ui.js";
import "./style.css";

const RESTOS_CSV_URL = import.meta.env.VITE_RESTOS_CSV_URL;
const AVIS_CSV_URL = import.meta.env.VITE_AVIS_CSV_URL;

const cuisineSelect = document.querySelector("#cuisine-select");
const scanButton = document.querySelector("#scan-button");
const radarContainer = document.querySelector("#radar-container");
const resultContainer = document.querySelector("#result-container");
const errorContainer = document.querySelector("#error-container");

let restaurants = [];
let avis = [];
let radar = null;

async function init() {
  errorContainer.innerHTML = "";
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
  setScanButtonEnabled(scanButton, filtered.length > 0);
}

function handleScan() {
  const filtered = filterByCuisine(restaurants, cuisineSelect.value);
  const winner = pickWinner(filtered);
  if (!winner) return;

  resultContainer.innerHTML = "";
  scanButton.disabled = true;
  radar.start(() => {
    renderResultCard(resultContainer, winner, joinAvis(winner, avis));
    scanButton.disabled = false;
  });
}

init();
