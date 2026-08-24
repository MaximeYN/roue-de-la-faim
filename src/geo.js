const EARTH_RADIUS_METERS = 6371000;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  return EARTH_RADIUS_METERS * c;
}

// Rounds to the nearest 10m under 1km (raw GPS/OSM precision doesn't
// support false precision like "347 mètres"), switches to km with one
// decimal beyond that.
export function formatDistance(meters) {
  if (meters < 1000) {
    const rounded = Math.round(meters / 10) * 10;
    return `à ${rounded} mètres`;
  }
  const km = (meters / 1000).toFixed(1).replace(".", ",");
  return `à ${km} km`;
}
