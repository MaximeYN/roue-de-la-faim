import streets from "./levallois-streets.json";
import { RINGED_PLANET_ICON } from "./radar.js";
import { buildGraph, nearestNode, findPath } from "./routing.js";

const VIEW_SIZE = 300;
const MARGIN = 16;
// Extra padding beyond the raw street data's own bounds, so a restaurant or
// the origin point sitting right at the edge of the fetched street network
// doesn't get clipped by the projection.
const BOUNDS_PADDING_DEG = 0.001;

const ZOOM_DURATION_MS = 700;
// How much room to leave around the route itself when zooming in on it.
const ZOOM_PADDING_FACTOR = 1.5;
// Never zoom in tighter than this many view units across — keeps a resto
// right next to the origin from producing an absurdly close-up, pixelated
// crop with nothing else on screen for context.
const MIN_VIEW_SPAN = 70;
const MAX_SCALE = 6;

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

// Given the (already-projected, view-space) points a zoom should frame —
// typically a walking route's points — returns the scale/translate that
// centers and fits them, padded, into the view. `translate(tx,ty) scale(s)`
// applied to a point (x,y) gives (x*s+tx, y*s+ty); solving for the target
// center to land on the view's center is where tx/ty come from.
export function computeZoomTarget(points, viewSize = VIEW_SIZE) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const width = Math.max((maxX - minX) * ZOOM_PADDING_FACTOR, MIN_VIEW_SPAN);
  const height = Math.max((maxY - minY) * ZOOM_PADDING_FACTOR, MIN_VIEW_SPAN);
  const scale = Math.min(viewSize / Math.max(width, height), MAX_SCALE);
  return {
    scale,
    tx: viewSize / 2 - cx * scale,
    ty: viewSize / 2 - cy * scale,
  };
}

export function createStreetMap(container, origin) {
  const bounds = computeBounds(streets);
  const project = createProjection(bounds);
  const graph = buildGraph(streets);
  // Origin never moves — its nearest graph node is worth finding once.
  const originNodeKey = nearestNode(graph, origin.lat, origin.lon);
  const originPoint = project(origin.lat, origin.lon);

  const streetLines = streets
    .map((street) => {
      const points = street
        .map(([lat, lon]) => {
          const { x, y } = project(lat, lon);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
      return `<polyline points="${points}" fill="none" stroke="#fbf192" stroke-opacity="0.35" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    })
    .join("");

  // Streets + route live inside `.streetmap-viewport`, which is what the
  // zoom animation scales — their line thickness stays constant on screen
  // via vector-effect regardless. Origin/resto markers live *outside* it and
  // are repositioned (never scaled) every frame, so pins stay pin-sized
  // instead of ballooning as the map zooms in — same convention real map
  // libraries use.
  container.innerHTML = `
    <svg viewBox="0 0 ${VIEW_SIZE} ${VIEW_SIZE}" class="streetmap-svg">
      <g class="streetmap-viewport">
        <g>${streetLines}</g>
        <polyline class="streetmap-path" points="" fill="none" stroke="#fff8be" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" style="display:none"/>
      </g>
      <circle class="streetmap-origin-dot" r="4" fill="#fbf192"/>
      <circle class="streetmap-origin-ring" r="7" fill="none" stroke="#fbf192" stroke-opacity="0.6" stroke-width="1"/>
      <g class="streetmap-resto" style="display:none"></g>
    </svg>
  `;

  const viewportGroup = container.querySelector(".streetmap-viewport");
  const pathLine = container.querySelector(".streetmap-path");
  const originDot = container.querySelector(".streetmap-origin-dot");
  const originRing = container.querySelector(".streetmap-origin-ring");
  const restoGroup = container.querySelector(".streetmap-resto");

  let currentRestoPoint = null;
  let view = { scale: 1, tx: 0, ty: 0 };
  let rafId = null;

  function applyView(scale, tx, ty) {
    view = { scale, tx, ty };
    viewportGroup.setAttribute("transform", `translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(3)})`);

    const originScreen = { x: originPoint.x * scale + tx, y: originPoint.y * scale + ty };
    originDot.setAttribute("cx", originScreen.x.toFixed(1));
    originDot.setAttribute("cy", originScreen.y.toFixed(1));
    originRing.setAttribute("cx", originScreen.x.toFixed(1));
    originRing.setAttribute("cy", originScreen.y.toFixed(1));

    if (currentRestoPoint) {
      const restoScreen = { x: currentRestoPoint.x * scale + tx, y: currentRestoPoint.y * scale + ty };
      restoGroup.setAttribute("transform", `translate(${restoScreen.x.toFixed(1)},${restoScreen.y.toFixed(1)})`);
    }
  }

  applyView(view.scale, view.tx, view.ty);

  function animateViewTo(target) {
    if (rafId !== null) cancelAnimationFrame(rafId);
    const start = { ...view };
    const startTime = performance.now();

    function frame(now) {
      const progress = Math.min((now - startTime) / ZOOM_DURATION_MS, 1);
      const eased = 1 - (1 - progress) ** 3; // ease-out cubic
      applyView(
        start.scale + (target.scale - start.scale) * eased,
        start.tx + (target.tx - start.tx) * eased,
        start.ty + (target.ty - start.ty) * eased
      );
      rafId = progress < 1 ? requestAnimationFrame(frame) : null;
    }

    rafId = requestAnimationFrame(frame);
  }

  function setRestaurant(lat, lon) {
    if (lat === null || lon === null) {
      restoGroup.style.display = "none";
      pathLine.style.display = "none";
      currentRestoPoint = null;
      return;
    }
    currentRestoPoint = project(lat, lon);
    restoGroup.innerHTML = RINGED_PLANET_ICON;
    restoGroup.style.display = "";

    // Highlight the actual shortest walking route along the street graph —
    // not a straight line. Real turn-by-turn stays on the Google Maps link;
    // this is just showing the path visually follows real streets.
    const restoNodeKey = nearestNode(graph, lat, lon);
    const routeNodes = originNodeKey && restoNodeKey ? findPath(graph, originNodeKey, restoNodeKey) : null;
    const routePoints = routeNodes ? routeNodes.map(([nodeLat, nodeLon]) => project(nodeLat, nodeLon)) : null;

    if (routePoints) {
      pathLine.setAttribute("points", routePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "));
      pathLine.style.display = "";
    } else {
      pathLine.style.display = "none";
    }

    // Zoom to frame the route (or just origin+resto if no route was found)
    // rather than the whole commune, so nearby picks stay legible.
    const framePoints = routePoints && routePoints.length > 0 ? routePoints : [originPoint, currentRestoPoint];
    animateViewTo(computeZoomTarget(framePoints));

    applyView(view.scale, view.tx, view.ty); // place the new resto pin immediately, animation catches the rest up
  }

  return { setRestaurant };
}
