// Fisher-Yates shuffle, then take the first `count` — gives up to `count`
// distinct restaurants with no repeats, in random order. The first element
// is the featured pick, the rest are the alternates.
export function pickSelection(restaurants, count = 5) {
  const shuffled = [...restaurants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
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
  const blips = BLIP_ANGLES.map((angle) => {
    const { x, y } = blipPosition(angle);
    return `<circle class="radar-blip" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#facc15" opacity="0.25"/>`;
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
