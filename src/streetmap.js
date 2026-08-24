import streets from "./levallois-streets.json";
import { RINGED_PLANET_ICON } from "./radar.js";

const VIEW_SIZE = 300;
const MARGIN = 16;
// Extra padding beyond the raw street data's own bounds, so a restaurant or
// the origin point sitting right at the edge of the fetched street network
// doesn't get clipped by the projection.
const BOUNDS_PADDING_DEG = 0.001;

export function computeBounds(streetList) {
  let minLat = 90;
  let maxLat = -90;
  let minLon = 180;
  let maxLon = -180;
  streetList.forEach((street) => {
    street.forEach(([lat, lon]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    });
  });
  return {
    minLat: minLat - BOUNDS_PADDING_DEG,
    maxLat: maxLat + BOUNDS_PADDING_DEG,
    minLon: minLon - BOUNDS_PADDING_DEG,
    maxLon: maxLon + BOUNDS_PADDING_DEG,
  };
}

// One shared projection for the whole map: longitude scaled by cos(latitude)
// to correct for the earth's curvature at this scale, fit to `viewSize` with
// `margin` px of padding, preserving aspect ratio (the commune isn't square).
export function createProjection(bounds, viewSize = VIEW_SIZE, margin = MARGIN) {
  const { minLat, maxLat, minLon, maxLon } = bounds;
  const centerLat = (minLat + maxLat) / 2;
  const lonScale = Math.cos((centerLat * Math.PI) / 180);
  const width = (maxLon - minLon) * lonScale;
  const height = maxLat - minLat;
  const usable = viewSize - margin * 2;
  const scale = usable / Math.max(width, height);

  return function project(lat, lon) {
    return {
      x: margin + (lon - minLon) * lonScale * scale,
      y: margin + (maxLat - lat) * scale,
    };
  };
}

export function createStreetMap(container, origin) {
  const bounds = computeBounds(streets);
  const project = createProjection(bounds);

  const streetLines = streets
    .map((street) => {
      const points = street
        .map(([lat, lon]) => {
          const { x, y } = project(lat, lon);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
      return `<polyline points="${points}" fill="none" stroke="#fbf192" stroke-opacity="0.35" stroke-width="1"/>`;
    })
    .join("");

  const originPoint = project(origin.lat, origin.lon);

  container.innerHTML = `
    <svg viewBox="0 0 ${VIEW_SIZE} ${VIEW_SIZE}" class="streetmap-svg">
      <g>${streetLines}</g>
      <circle cx="${originPoint.x.toFixed(1)}" cy="${originPoint.y.toFixed(1)}" r="4" fill="#fbf192"/>
      <circle cx="${originPoint.x.toFixed(1)}" cy="${originPoint.y.toFixed(1)}" r="7" fill="none" stroke="#fbf192" stroke-opacity="0.6" stroke-width="1"/>
      <g class="streetmap-resto" style="display:none"></g>
    </svg>
  `;

  const restoGroup = container.querySelector(".streetmap-resto");

  function setRestaurant(lat, lon) {
    if (lat === null || lon === null) {
      restoGroup.style.display = "none";
      return;
    }
    const { x, y } = project(lat, lon);
    restoGroup.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`);
    restoGroup.innerHTML = RINGED_PLANET_ICON;
    restoGroup.style.display = "";
  }

  return { setRestaurant };
}
