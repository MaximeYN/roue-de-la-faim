# La Roue de la Faim — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static web app that picks a Levallois restaurant at random (filtered by cuisine) via a space-themed "radar scan" animation, reading data from two published Google Sheets CSVs.

**Architecture:** Vanilla JS + Vite, no backend, no framework. Pure-logic modules (CSV parsing, data filtering/joining, radar math) are unit-tested with Vitest; DOM wiring is verified manually in the browser.

**Tech Stack:** Vite 5, Vitest 2 (jsdom environment), no runtime dependencies beyond the browser's native `fetch`.

## Global Constraints

- No server, no API keys, no secrets — static build only, deployed on Netlify (`npm run build` → `dist/`).
- Two data sources: Google Sheets tabs "Resaurants" and "Réponses au formulaire 1", each published to web as CSV (`Fichier → Partager → Publier sur le web`), consumed via `fetch()` client-side.
- Cuisine filter matches by splitting the `cuisine` field on commas and checking membership (a restaurant can have multiple cuisine tags in one cell).
- Avis (reviews) are joined to a restaurant by exact match on the `name` field.
- Random pick in v1 is uniform (`Math.random()`) — no weighting by internal notes.
- Radar blips are purely decorative (fixed count/position), and glow based on angular proximity to the current sweep-beam angle, then fade — the actual winner is picked instantly in JS, independent of the blip display.
- UI copy is in French; the action button says "Scanner" (not "Spin"/"Roue").
- Known limitation, explicitly out of scope: no street address field in the data (only lat/lon) — v1 shows a "Voir sur la carte" link built from coordinates.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `netlify.toml`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `test` that every later task relies on.
- Produces: env var names `VITE_RESTOS_CSV_URL` and `VITE_AVIS_CSV_URL`, consumed by `src/main.js` in Task 7.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "roue-de-la-faim",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "vite": "^5.4.8",
    "vitest": "^2.1.1",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    environment: "jsdom",
  },
});
```

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>La Roue de la Faim</title>
  </head>
  <body>
    <main>
      <h1>La Roue de la Faim</h1>
      <div class="controls">
        <select id="cuisine-select"></select>
        <button id="scan-button" type="button">Scanner</button>
      </div>
      <div id="radar-container"></div>
      <div id="result-container"></div>
      <div id="error-container"></div>
    </main>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules
dist
.env
```

- [ ] **Step 5: Create `.env.example`**

```
VITE_RESTOS_CSV_URL=
VITE_AVIS_CSV_URL=
```

- [ ] **Step 6: Create `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

- [ ] **Step 7: Install dependencies and verify dev server boots**

Run: `npm install && npm run dev`
Expected: Vite prints a local URL (e.g. `http://localhost:5173/`); opening it shows a blank page with the "La Roue de la Faim" heading and an empty dropdown/button (no `src/main.js` yet, so check the browser console shows a 404 for `/src/main.js` — expected at this stage). Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 8: Commit**

```bash
git add package.json vite.config.js index.html .gitignore .env.example netlify.toml
git commit -m "chore: project scaffold (Vite, no backend)"
```

---

## Task 2: CSV parser

**Files:**
- Create: `src/csv.js`
- Test: `tests/csv.test.js`

**Interfaces:**
- Produces: `parseCSV(text: string) -> Record<string, string>[]`, consumed by `src/data.js` in Task 3.

- [ ] **Step 1: Write the failing tests**

Create `tests/csv.test.js`:

```js
import { describe, it, expect } from "vitest";
import { parseCSV } from "../src/csv.js";

describe("parseCSV", () => {
  it("parses simple comma-separated rows", () => {
    const result = parseCSV("a,b\n1,2");
    expect(result).toEqual([{ a: "1", b: "2" }]);
  });

  it("parses a quoted field containing a comma", () => {
    const result = parseCSV('name,cuisine\n"Bap Time","Korean, fast food"');
    expect(result).toEqual([{ name: "Bap Time", cuisine: "Korean, fast food" }]);
  });

  it("parses a quoted field containing an embedded newline", () => {
    const result = parseCSV('name,comment\n"Resto A","Super\nrapide"');
    expect(result).toEqual([{ name: "Resto A", comment: "Super\nrapide" }]);
  });

  it("unescapes doubled double-quotes", () => {
    const result = parseCSV('name,note\n"Le ""Bon"" Coin",5');
    expect(result).toEqual([{ name: 'Le "Bon" Coin', note: "5" }]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCSV("")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/csv.js'` (file doesn't exist yet).

- [ ] **Step 3: Write `src/csv.js`**

```js
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r") {
      i += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((r) => !(r.length === 1 && r[0] === ""));
  if (nonEmptyRows.length === 0) return [];

  const [header, ...dataRows] = nonEmptyRows;
  return dataRows.map((cols) => {
    const obj = {};
    header.forEach((key, idx) => {
      obj[key.trim()] = (cols[idx] ?? "").trim();
    });
    return obj;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: `tests/csv.test.js` — 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/csv.js tests/csv.test.js
git commit -m "feat: CSV parser handling quotes, embedded commas and newlines"
```

---

## Task 3: Data layer

**Files:**
- Create: `src/data.js`
- Test: `tests/data.test.js`

**Interfaces:**
- Consumes: `parseCSV` from `src/csv.js` (Task 2).
- Produces: `normalizeRestaurant(row)`, `normalizeAvis(row)`, `getCuisineTags(restaurants) -> string[]`, `filterByCuisine(restaurants, tag) -> Restaurant[]`, `joinAvis(restaurant, avisList) -> Avis[]`, `fetchRestaurants(url) -> Promise<Restaurant[]>`, `fetchAvis(url) -> Promise<Avis[]>`. `Restaurant` shape: `{ name, cuisine, phone, website, openingHours, lat, lon }`. `Avis` shape: `{ restaurantName, auteur, note, commentaire }`. Consumed by `src/radar.js` (Task 4) and `src/main.js` (Task 7).

- [ ] **Step 1: Write the failing tests**

Create `tests/data.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/data.js'`.

- [ ] **Step 3: Write `src/data.js`**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: `tests/csv.test.js` — 5 passed, `tests/data.test.js` — 10 passed.

- [ ] **Step 5: Commit**

```bash
git add src/data.js tests/data.test.js
git commit -m "feat: data layer — normalize, filter by cuisine, join avis"
```

---

## Task 4: Radar math (pure functions)

**Files:**
- Create: `src/radar.js`
- Test: `tests/radar.test.js`

**Interfaces:**
- Produces: `pickWinner(restaurants: Restaurant[]) -> Restaurant | null`, `angularDistance(a: number, b: number) -> number`, `computeBlipIntensity(blipAngleDeg: number, beamAngleDeg: number, maxDistanceDeg?: number) -> number` (0 to 1), `blipPosition(angleDeg: number, radius?: number) -> { x: number, y: number }`. Consumed by `createRadar` (Task 5, same file) and `src/main.js` (Task 7, `pickWinner` only).

- [ ] **Step 1: Write the failing tests**

Create `tests/radar.test.js`:

```js
import { describe, it, expect, vi, afterEach } from "vitest";
import { pickWinner, angularDistance, computeBlipIntensity, blipPosition } from "../src/radar.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pickWinner", () => {
  it("returns null for an empty list", () => {
    expect(pickWinner([])).toBeNull();
  });

  it("returns the element at the Math.random-derived index", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const restaurants = [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }];
    expect(pickWinner(restaurants)).toEqual({ name: "C" });
  });
});

describe("angularDistance", () => {
  it("returns 0 for identical angles", () => {
    expect(angularDistance(100, 100)).toBe(0);
  });

  it("wraps around 360", () => {
    expect(angularDistance(5, 355)).toBe(10);
  });

  it("returns 180 for opposite angles", () => {
    expect(angularDistance(0, 180)).toBe(180);
  });
});

describe("computeBlipIntensity", () => {
  it("is 1 at zero distance", () => {
    expect(computeBlipIntensity(50, 50)).toBe(1);
  });

  it("is 0 beyond the max distance", () => {
    expect(computeBlipIntensity(50, 100, 30)).toBe(0);
  });

  it("decreases proportionally to distance", () => {
    expect(computeBlipIntensity(10, 0, 30)).toBeCloseTo(1 - 10 / 30);
  });
});

describe("blipPosition", () => {
  it("places angle 0 straight up from the center", () => {
    const { x, y } = blipPosition(0, 80);
    expect(x).toBeCloseTo(120);
    expect(y).toBeCloseTo(40);
  });

  it("places angle 90 to the right of the center", () => {
    const { x, y } = blipPosition(90, 80);
    expect(x).toBeCloseTo(200);
    expect(y).toBeCloseTo(120);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/radar.js'`.

- [ ] **Step 3: Write the pure-function part of `src/radar.js`**

```js
export function pickWinner(restaurants) {
  if (restaurants.length === 0) return null;
  const index = Math.floor(Math.random() * restaurants.length);
  return restaurants[index];
}

export function angularDistance(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export function computeBlipIntensity(blipAngleDeg, beamAngleDeg, maxDistanceDeg = 30) {
  const distance = angularDistance(blipAngleDeg, beamAngleDeg);
  if (distance >= maxDistanceDeg) return 0;
  return 1 - distance / maxDistanceDeg;
}

// Position of a point at `angleDeg` clockwise from "straight up", matching
// the rotation convention used by the SVG beam's `rotate(angleDeg 120 120)`
// transform in createRadar (Task 5) — angleDeg 0 points up, 90 points right.
export function blipPosition(angleDeg, radius = 80) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: 120 + radius * Math.sin(rad),
    y: 120 - radius * Math.cos(rad),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: `tests/csv.test.js` — 5 passed, `tests/data.test.js` — 10 passed, `tests/radar.test.js` — 10 passed.

- [ ] **Step 5: Commit**

```bash
git add src/radar.js tests/radar.test.js
git commit -m "feat: radar math — winner pick, angular distance, blip intensity"
```

---

## Task 5: Radar SVG rendering & animation

**Files:**
- Modify: `src/radar.js` (append to the file from Task 4 — do not remove the existing exports)

**Interfaces:**
- Consumes: `computeBlipIntensity`, `blipPosition` (same file, Task 4).
- Produces: `createRadar(container: HTMLElement) -> { start(onComplete: () => void): void }`, consumed by `src/main.js` (Task 7).

- [ ] **Step 1: Append the SVG markup and animation loop to `src/radar.js`**

```js
const BLIP_ANGLES = [40, 95, 160, 210, 260, 320];
const SPIN_DURATION_MS = 2600;
const ROTATIONS = 3;

export function createRadar(container) {
  container.innerHTML = renderRadarMarkup();
  const beam = container.querySelector(".radar-beam");
  const blipEls = [...container.querySelectorAll(".radar-blip")];

  function start(onComplete) {
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / SPIN_DURATION_MS, 1);
      const beamAngle = (progress * ROTATIONS * 360) % 360;
      beam.setAttribute("transform", `rotate(${beamAngle} 120 120)`);

      blipEls.forEach((el, i) => {
        const intensity = computeBlipIntensity(BLIP_ANGLES[i], beamAngle);
        el.setAttribute("opacity", String(0.25 + intensity * 0.75));
      });

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        onComplete();
      }
    }

    requestAnimationFrame(frame);
  }

  return { start };
}

function renderRadarMarkup() {
  const blips = BLIP_ANGLES.map((angle, i) => {
    const { x, y } = blipPosition(angle);
    return `<circle class="radar-blip" data-index="${i}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#facc15" opacity="0.25"/>`;
  }).join("");

  return `
    <svg width="240" height="240" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="sweepGrad" gradientUnits="userSpaceOnUse" x1="120" y1="25" x2="167.5" y2="37.7">
          <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0"/>
          <stop offset="100%" stop-color="#9df9ec" stop-opacity="0.85"/>
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="95" fill="none" stroke="#2dd4bf" stroke-opacity="0.5" stroke-width="1.5"/>
      <circle cx="120" cy="120" r="65" fill="none" stroke="#2dd4bf" stroke-opacity="0.3" stroke-width="1"/>
      <circle cx="120" cy="120" r="35" fill="none" stroke="#2dd4bf" stroke-opacity="0.3" stroke-width="1"/>
      <g stroke="#2dd4bf" stroke-opacity="0.25" stroke-width="1">
        <line x1="120" y1="25" x2="120" y2="215"/>
        <line x1="25" y1="120" x2="215" y2="120"/>
        <line x1="53" y1="53" x2="187" y2="187"/>
        <line x1="187" y1="53" x2="53" y2="187"/>
      </g>
      ${blips}
      <g class="radar-beam">
        <path d="M120,120 L120,25 A95,95 0 0,1 167.5,37.7 Z" fill="url(#sweepGrad)"/>
        <line x1="120" y1="120" x2="167.5" y2="37.7" stroke="#eafff9" stroke-width="1.5"/>
      </g>
      <circle cx="120" cy="120" r="3" fill="#eafff9"/>
    </svg>
  `;
}
```

- [ ] **Step 2: Run the existing test suite to confirm nothing broke**

Run: `npm test`
Expected: `tests/csv.test.js` — 5 passed, `tests/data.test.js` — 10 passed, `tests/radar.test.js` — 10 passed (still — `createRadar` has no dedicated test, it's DOM/animation glue verified manually in Task 7).

- [ ] **Step 3: Commit**

```bash
git add src/radar.js
git commit -m "feat: radar SVG rendering and sweep animation"
```

---

## Task 6: UI rendering functions

**Files:**
- Create: `src/ui.js`
- Test: `tests/ui.test.js`

**Interfaces:**
- Produces: `renderCuisineOptions(selectEl: HTMLSelectElement, tags: string[])`, `renderResultCard(container: HTMLElement, restaurant: Restaurant, avisList: Avis[])`, `renderError(container: HTMLElement, message: string, onRetry: () => void)`, `setScanButtonEnabled(buttonEl: HTMLButtonElement, enabled: boolean)`. Consumed by `src/main.js` (Task 7).

- [ ] **Step 1: Write the failing tests**

Create `tests/ui.test.js`:

```js
import { describe, it, expect, vi } from "vitest";
import { renderCuisineOptions, renderResultCard, renderError, setScanButtonEnabled } from "../src/ui.js";

describe("renderCuisineOptions", () => {
  it("adds Tous first then the given tags", () => {
    const select = document.createElement("select");
    renderCuisineOptions(select, ["italian", "korean"]);
    expect([...select.options].map((o) => o.value)).toEqual(["Tous", "italian", "korean"]);
  });
});

describe("renderResultCard", () => {
  const restaurant = { name: "Bap Time", cuisine: "korean", phone: "", website: "", openingHours: "", lat: null, lon: null };

  it("shows the name and cuisine", () => {
    const container = document.createElement("div");
    renderResultCard(container, restaurant, []);
    expect(container.querySelector("h2").textContent).toBe("Bap Time");
    expect(container.querySelector(".cuisine").textContent).toBe("korean");
  });

  it("shows a placeholder message when there are no avis", () => {
    const container = document.createElement("div");
    renderResultCard(container, restaurant, []);
    expect(container.querySelector(".no-avis").textContent).toBe("Aucun avis pour l'instant.");
  });

  it("lists avis when present", () => {
    const container = document.createElement("div");
    renderResultCard(container, restaurant, [{ restaurantName: "Bap Time", auteur: "Max", note: "5", commentaire: "Top" }]);
    const items = container.querySelectorAll(".avis-list li");
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain("Max");
    expect(items[0].textContent).toContain("Top");
  });

  it("escapes HTML in a commentaire to prevent injection", () => {
    const container = document.createElement("div");
    renderResultCard(container, restaurant, [
      { restaurantName: "Bap Time", auteur: "Max", note: "5", commentaire: "<img src=x onerror=alert(1)>" },
    ]);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".avis-list li").textContent).toContain("<img");
  });
});

describe("renderError", () => {
  it("renders the message and wires the retry button", () => {
    const container = document.createElement("div");
    const onRetry = vi.fn();
    renderError(container, "Panne réseau", onRetry);
    expect(container.textContent).toContain("Panne réseau");
    container.querySelector(".retry-button").click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("setScanButtonEnabled", () => {
  it("disables and enables the button", () => {
    const button = document.createElement("button");
    setScanButtonEnabled(button, false);
    expect(button.disabled).toBe(true);
    setScanButtonEnabled(button, true);
    expect(button.disabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/ui.js'`.

- [ ] **Step 3: Write `src/ui.js`**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all 4 test files pass — csv (5), data (10), radar (10), ui (7) — 32 passed total.

- [ ] **Step 5: Commit**

```bash
git add src/ui.js tests/ui.test.js
git commit -m "feat: UI rendering — cuisine options, result card, error banner"
```

---

## Task 7: App wiring & styling

**Files:**
- Create: `src/main.js`
- Create: `src/style.css`

**Interfaces:**
- Consumes: everything produced in Tasks 3, 5, 6.

- [ ] **Step 1: Write `src/style.css`**

```css
:root {
  --bg: #030614;
  --panel: #0b1230;
  --accent: #2dd4bf;
  --text: #eafff9;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
}

main {
  max-width: 480px;
  width: 100%;
  padding: 24px;
  text-align: center;
}

h1 {
  letter-spacing: 0.05em;
}

.controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

select,
button {
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 1rem;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

#radar-container svg {
  display: block;
  margin: 0 auto;
}

.result-card {
  background: var(--panel);
  border: 1px solid var(--accent);
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
  text-align: left;
}

.avis-list {
  list-style: none;
  padding: 0;
}

.avis-list li {
  border-top: 1px solid rgba(45, 212, 191, 0.2);
  padding: 8px 0;
}

.error-banner {
  background: #3b0d0d;
  border: 1px solid #f87171;
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
}
```

- [ ] **Step 2: Write `src/main.js`**

```js
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
```

- [ ] **Step 3: Publish the two Google Sheets tabs to the web**

In the Google Sheet, for each tab ("Resaurants" and "Réponses au formulaire 1"): `Fichier → Partager → Publier sur le web` → select the specific tab → format CSV → Publier. Copy the resulting URL for each.

- [ ] **Step 4: Create the local `.env` with the real URLs**

Create `.env` (already gitignored, do not commit):

```
VITE_RESTOS_CSV_URL=<url copiée pour l'onglet Resaurants>
VITE_AVIS_CSV_URL=<url copiée pour l'onglet Réponses au formulaire 1>
```

- [ ] **Step 5: Manually verify the full flow in the browser**

Run: `npm run dev`
Expected: opening the printed local URL shows the "Type de cuisine" dropdown populated with real tags from the Sheet, the "Scanner" button enabled. Selecting a cuisine with zero matching restaurants disables the button. Clicking "Scanner" runs the radar animation (beam rotating, blips glowing as it passes) for ~2.6s, then shows a result card with the restaurant's name, cuisine, phone/site/horaires if present, a "Voir sur la carte" link, and either a list of avis or "Aucun avis pour l'instant.". Temporarily breaking one of the `.env` URLs and reloading shows the error banner with a working "Réessayer" button.

- [ ] **Step 6: Run the full automated test suite once more**

Run: `npm test`
Expected: 32 passed, 0 failed (unchanged from Task 6 — this task added no new pure-logic tests, only DOM wiring verified manually above).

- [ ] **Step 7: Commit**

```bash
git add src/main.js src/style.css
git commit -m "feat: wire data, radar and UI together end-to-end"
```

---

## Task 8: README and production build check

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# La Roue de la Faim

App pour tirer au sort un restaurant à Levallois-Perret par type de cuisine, via une animation radar.

## Setup

\`\`\`bash
npm install
cp .env.example .env
\`\`\`

Renseigner dans `.env` les deux URLs de CSV publiés (voir "Sources de données" ci-dessous).

## Lancer en local

\`\`\`bash
npm run dev
\`\`\`

## Build de production

\`\`\`bash
npm run build   # génère dist/
npm run preview # sert dist/ en local pour vérifier avant déploiement
\`\`\`

## Tests

\`\`\`bash
npm test
\`\`\`

## Sources de données

Deux onglets Google Sheets publiés sur le web en CSV (`Fichier → Partager → Publier sur le web`) :

- `VITE_RESTOS_CSV_URL` — onglet "Resaurants" (catalogue, synchronisé depuis OpenDataSoft/OSM via n8n).
- `VITE_AVIS_CSV_URL` — onglet "Réponses au formulaire 1" (avis internes, alimenté par un Google Form).

## Déploiement

Netlify, branché sur ce repo : commande de build `npm run build`, dossier de publication `dist` (voir `netlify.toml`). Penser à définir `VITE_RESTOS_CSV_URL` et `VITE_AVIS_CSV_URL` dans les variables d'environnement Netlify — sans elles le build réussit mais l'app ne charge aucune donnée.

## Hors scope v1

- Pas de pondération du tirage par les notes (tirage uniforme).
- Pas d'intégration carte/geocoding pour une adresse texte (le dataset OSM n'a que des coordonnées).
- Pas d'écriture d'avis depuis l'app — ça reste géré par le Google Form.
```

- [ ] **Step 2: Verify the production build succeeds**

Run: `npm run build`
Expected: exits 0, prints a `dist/` output summary with no errors.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README with setup, deployment and scope notes"
```
