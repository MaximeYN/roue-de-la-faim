export function renderCuisineOptions(selectEl, tags) {
  selectEl.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "Tous";
  allOption.textContent = "Tous";
  selectEl.appendChild(allOption);

  tags.forEach((tag) => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    selectEl.appendChild(option);
  });
}

export function renderResultCard(container, restaurant, avisList, distanceLabel) {
  // Directions to the raw coordinates, not a name-based search: searching
  // "name + coords" (tried first) fails outright when Google can't match the
  // name to a listing near that point ("Impossible de trouver Itto ..." in
  // practice) — coordinates alone always resolve, and give the itinerary
  // directly instead of a search result. Free, key-less "Maps URLs"
  // directions action — not the paid Places API.
  const mapsLink =
    restaurant.lat !== null && restaurant.lon !== null
      ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lon}" target="_blank" rel="noopener">Itinéraire Google Maps</a>`
      : "";

  const avisHtml =
    avisList.length === 0
      ? `<p class="no-avis">Aucun avis pour l'instant.</p>`
      : `<ul class="avis-list">${avisList
          .map(
            (a) =>
              `<li><strong>${escapeHtml(a.auteur)}</strong> (${escapeHtml(a.note)}) — ${escapeHtml(a.commentaire)}</li>`
          )
          .join("")}</ul>`;

  container.innerHTML = `
    <article class="result-card">
      <h2>${escapeHtml(restaurant.name)}</h2>
      <p class="cuisine">${escapeHtml(restaurant.cuisine || "Non renseigné")}</p>
      ${distanceLabel ? `<p class="distance">${escapeHtml(distanceLabel)}</p>` : ""}
      ${safeWebsiteLink(restaurant.website)}
      ${restaurant.openingHours ? `<p>${escapeHtml(restaurant.openingHours)}</p>` : ""}
      ${mapsLink ? `<p>${mapsLink}</p>` : ""}
      ${avisHtml}
    </article>
  `;
}

export function renderAlternates(container, alternates, onSelect) {
  if (alternates.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <ul class="alternates-list">
      ${alternates
        .map(
          (r, i) =>
            `<li><button type="button" class="alternate-button" data-index="${i}">${escapeHtml(r.name)} — ${escapeHtml(r.cuisine || "Non renseigné")}</button></li>`
        )
        .join("")}
    </ul>
  `;

  container.querySelectorAll(".alternate-button").forEach((button) => {
    button.addEventListener("click", () => onSelect(Number(button.dataset.index)));
  });
}

export function renderError(container, message, onRetry) {
  container.innerHTML = `
    <div class="error-banner">
      <p>${escapeHtml(message)}</p>
      <button type="button" class="retry-button">Réessayer</button>
    </div>
  `;
  container.querySelector(".retry-button").addEventListener("click", onRetry);
}

export function setScanButtonEnabled(buttonEl, enabled) {
  buttonEl.disabled = !enabled;
  buttonEl.title = enabled ? "" : "Aucun resto pour ce type de cuisine";
}

const SCAN_DISABLED_MESSAGE = "Aucun resto pour ce type de cuisine.";

export function renderScanHint(hintEl, enabled) {
  hintEl.textContent = enabled ? "" : SCAN_DISABLED_MESSAGE;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  // .innerHTML alone does not escape `"` (only needed inside attribute values,
  // never inside text-node serialization) — without this, a website value
  // used in an href attribute could break out via a literal quote.
  return div.innerHTML.replaceAll('"', "&quot;");
}

function safeWebsiteLink(website) {
  if (!/^https?:\/\//i.test(website || "")) return "";
  const safe = escapeHtml(website);
  return `<p><a href="${safe}" target="_blank" rel="noopener">${safe}</a></p>`;
}
