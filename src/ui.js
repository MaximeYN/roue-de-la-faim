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

export function renderResultCard(container, restaurant, avisList) {
  const mapsLink =
    restaurant.lat !== null && restaurant.lon !== null
      ? `<a href="https://www.google.com/maps?q=${restaurant.lat},${restaurant.lon}" target="_blank" rel="noopener">Voir sur la carte</a>`
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
      ${restaurant.phone ? `<p>${escapeHtml(restaurant.phone)}</p>` : ""}
      ${restaurant.website ? `<p><a href="${escapeHtml(restaurant.website)}" target="_blank" rel="noopener">${escapeHtml(restaurant.website)}</a></p>` : ""}
      ${restaurant.openingHours ? `<p>${escapeHtml(restaurant.openingHours)}</p>` : ""}
      ${mapsLink ? `<p>${mapsLink}</p>` : ""}
      ${avisHtml}
    </article>
  `;
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

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}
