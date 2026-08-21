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
