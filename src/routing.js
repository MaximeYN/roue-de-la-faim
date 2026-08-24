import { haversineDistanceMeters } from "./geo.js";

function nodeKey(lat, lon) {
  return `${lat},${lon}`;
}

// Builds a walking graph from the street segments: consecutive points along
// a street become connected nodes, and two streets that share an exact
// coordinate (a real intersection — OSM ways share the same node there, and
// rounding is deterministic so it survives the simplification step) get
// connected there too, for free, with no separate intersection-detection pass.
export function buildGraph(streets) {
  const graph = new Map();

  function ensureNode(lat, lon) {
    const key = nodeKey(lat, lon);
    if (!graph.has(key)) graph.set(key, { lat, lon, edges: [] });
    return key;
  }

  streets.forEach((street) => {
    for (let i = 0; i < street.length - 1; i++) {
      const [lat1, lon1] = street[i];
      const [lat2, lon2] = street[i + 1];
      const key1 = ensureNode(lat1, lon1);
      const key2 = ensureNode(lat2, lon2);
      const distance = haversineDistanceMeters(lat1, lon1, lat2, lon2);
      graph.get(key1).edges.push({ key: key2, distance });
      graph.get(key2).edges.push({ key: key1, distance });
    }
  });

  return graph;
}

export function nearestNode(graph, lat, lon) {
  let closestKey = null;
  let closestDistance = Infinity;
  graph.forEach((node, key) => {
    const distance = haversineDistanceMeters(lat, lon, node.lat, node.lon);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestKey = key;
    }
  });
  return closestKey;
}

// ponytail: O(V^2) Dijkstra (array/Set scan for the minimum instead of a
// priority queue) — the street graph has ~2000 nodes, comfortably within
// range for this. Swap in a binary heap if the map ever covers a much
// bigger area and this starts showing up as real reveal-time lag.
export function findPath(graph, startKey, endKey) {
  if (!graph.has(startKey) || !graph.has(endKey)) return null;

  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set(graph.keys());
  graph.forEach((_, key) => distances.set(key, Infinity));
  distances.set(startKey, 0);

  while (unvisited.size > 0) {
    let currentKey = null;
    let currentDistance = Infinity;
    unvisited.forEach((key) => {
      const distance = distances.get(key);
      if (distance < currentDistance) {
        currentDistance = distance;
        currentKey = key;
      }
    });

    if (currentKey === null || currentKey === endKey) break;
    unvisited.delete(currentKey);

    graph.get(currentKey).edges.forEach(({ key: neighborKey, distance: edgeDistance }) => {
      if (!unvisited.has(neighborKey)) return;
      const candidate = currentDistance + edgeDistance;
      if (candidate < distances.get(neighborKey)) {
        distances.set(neighborKey, candidate);
        previous.set(neighborKey, currentKey);
      }
    });
  }

  if (startKey !== endKey && !previous.has(endKey)) return null;

  const path = [];
  let step = endKey;
  while (step !== undefined) {
    const node = graph.get(step);
    path.unshift([node.lat, node.lon]);
    step = previous.get(step);
  }
  return path;
}
