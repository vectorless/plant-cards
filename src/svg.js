const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, parent = null) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

// Deterministic pseudo-random from string seed — same plant always looks the same.
function seedRand(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967295;
  };
}

const RAINBOW_STOPS = [
  '#ff5050', '#ff9a3a', '#ffd844', '#5cc862', '#3a8ad8', '#7a5ad8', '#d050d8',
];

export function buildPlantSVG(plant) {
  const svg = el('svg', { viewBox: '0 0 100 120', preserveAspectRatio: 'xMidYMid meet' });
  const rand = seedRand(plant.id);
  const groundY = 110;
  const stemBaseX = 50;
  const stemHeight = plant.stem?.height ?? 0;
  const bloomY = groundY - Math.max(stemHeight, plant.bloom ? 25 : 0);

  // Defs for rainbow gradient if needed
  if (plant.bloom?.color === 'rainbow') {
    const defs = el('defs', {}, svg);
    const grad = el('linearGradient', { id: 'rainbow-' + plant.id,
      x1: '0%', y1: '0%', x2: '100%', y2: '100%' }, defs);
    RAINBOW_STOPS.forEach((c, i) => {
      el('stop', { offset: (i / (RAINBOW_STOPS.length - 1)) * 100 + '%',
        'stop-color': c }, grad);
    });
  }

  // Pot
  drawPot(svg, groundY);

  // Stem (drawn first so leaves overlap on top)
  if (plant.stem) drawStem(svg, plant.stem, stemBaseX, groundY, rand);

  // Leaves
  if (plant.leaves) drawLeaves(svg, plant.leaves, stemBaseX, groundY, stemHeight, rand);

  // Bloom
  if (plant.bloom) drawBloom(svg, plant.bloom, stemBaseX, bloomY, plant.id, rand);

  return svg;
}

function drawPot(svg, groundY) {
  el('path', {
    d: `M 26 ${groundY} L 30 120 L 70 120 L 74 ${groundY} Z`,
    fill: '#6a4028', stroke: '#3a200c', 'stroke-width': 1,
  }, svg);
  el('rect', {
    x: 25, y: groundY - 3, width: 50, height: 5,
    fill: '#7a4a2e', stroke: '#3a200c', 'stroke-width': 1,
  }, svg);
}

function drawStem(svg, stem, x, y, rand) {
  const top = y - stem.height;
  if (stem.style === 'gnarled') {
    const c1x = x + (rand() - 0.5) * 30;
    const c1y = y - stem.height * 0.4;
    const c2x = x + (rand() - 0.5) * 30;
    const c2y = y - stem.height * 0.7;
    el('path', {
      d: `M ${x} ${y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x} ${top}`,
      stroke: stem.color, 'stroke-width': 4, fill: 'none',
      'stroke-linecap': 'round',
    }, svg);
  } else {
    const wobbleX = x + (rand() - 0.5) * 6;
    el('path', {
      d: `M ${x} ${y} Q ${wobbleX} ${y - stem.height / 2} ${x} ${top}`,
      stroke: stem.color, 'stroke-width': 2.5, fill: 'none',
      'stroke-linecap': 'round',
    }, svg);
  }
}

function drawLeaves(svg, leaves, x, baseY, stemHeight, rand) {
  const { style, color, count } = leaves;
  switch (style) {
    case 'blade':    return drawBlades(svg, x, baseY, count, color, rand);
    case 'clump':    return drawClump(svg, x, baseY, count, color, rand);
    case 'frond':    return drawFronds(svg, x, baseY, count, color, rand, stemHeight);
    case 'trefoil':  return drawTrefoil(svg, x, baseY - stemHeight, color);
    case 'jagged':   return drawJagged(svg, x, baseY, count, color, rand);
    case 'oval':     return drawAlongStem(svg, x, baseY, stemHeight, count, color, rand, 'oval');
    case 'serrated': return drawAlongStem(svg, x, baseY, stemHeight, count, color, rand, 'serrated');
    case 'heart':    return drawAlongStem(svg, x, baseY, stemHeight, count, color, rand, 'heart');
    case 'curly':    return drawClump(svg, x, baseY - 8, count, color, rand, true);
    case 'paddle':   return drawAlongStem(svg, x, baseY, stemHeight, count, color, rand, 'paddle');
    case 'monstera': return drawAlongStem(svg, x, baseY, stemHeight, count, color, rand, 'monstera');
    case 'spike':    return drawSpikes(svg, x, baseY, count, color, rand);
    default:         return drawClump(svg, x, baseY, count, color, rand);
  }
}

function drawBlades(svg, x, baseY, count, color, rand) {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (i / (count - 1)) - 0.5;
    const dx = t * 28 + (rand() - 0.5) * 4;
    const tipX = x + dx + (rand() - 0.5) * 4;
    const tipY = baseY - 20 - rand() * 30;
    el('path', {
      d: `M ${x + dx * 0.4} ${baseY} Q ${x + dx * 0.8} ${(baseY + tipY) / 2} ${tipX} ${tipY}`,
      stroke: color, 'stroke-width': 2 + rand(), fill: 'none', 'stroke-linecap': 'round',
    }, svg);
  }
}

function drawClump(svg, x, baseY, count, color, rand, curly = false) {
  for (let i = 0; i < count; i++) {
    const cx = x + (rand() - 0.5) * 32;
    const cy = baseY - 4 - rand() * 14;
    const r = 5 + rand() * 5;
    el('circle', {
      cx, cy, r,
      fill: color, stroke: shade(color, -20), 'stroke-width': 0.8,
      opacity: 0.85 + rand() * 0.15,
    }, svg);
    if (curly) {
      el('circle', { cx: cx + 2, cy: cy - 2, r: r * 0.4,
        fill: shade(color, 15), opacity: 0.7 }, svg);
    }
  }
}

function drawFronds(svg, x, baseY, count, color, rand, stemHeight) {
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1 || 1);
    const side = i % 2 === 0 ? -1 : 1;
    const y = baseY - 8 - t * (stemHeight + 10);
    const len = 18 + rand() * 6;
    const tipX = x + side * len;
    const tipY = y - 6;
    el('path', {
      d: `M ${x} ${y} Q ${x + side * len * 0.4} ${y - 4} ${tipX} ${tipY}`,
      stroke: color, 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round',
    }, svg);
    // mini sub-leaflets
    for (let j = 1; j <= 4; j++) {
      const jt = j / 5;
      const px = x + side * len * jt * 0.9;
      const py = y - jt * 5 - 2;
      el('ellipse', { cx: px, cy: py, rx: 2.5, ry: 1.4,
        transform: `rotate(${side * 30} ${px} ${py})`,
        fill: color, opacity: 0.85 }, svg);
    }
  }
}

function drawTrefoil(svg, x, topY, color) {
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i - 1) * (Math.PI / 2.4);
    const lx = x + Math.cos(a) * 9;
    const ly = topY + Math.sin(a) * 9;
    el('circle', { cx: lx, cy: ly, r: 7,
      fill: color, stroke: shade(color, -25), 'stroke-width': 0.8 }, svg);
    el('path', {
      d: `M ${lx} ${ly + 2} L ${lx} ${ly + 5}`,
      stroke: shade(color, -30), 'stroke-width': 1, fill: 'none',
    }, svg);
  }
}

function drawJagged(svg, x, baseY, count, color, rand) {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (i / (count - 1)) - 0.5;
    const dx = t * 30;
    const tipX = x + dx;
    const tipY = baseY - 16 - rand() * 12;
    const w = 6;
    el('path', {
      d: `M ${x + dx * 0.4} ${baseY - 2}
          L ${tipX - w} ${(baseY + tipY) / 2 - 2}
          L ${tipX - 2} ${(baseY + tipY) / 2 + 1}
          L ${tipX + w * 0.7} ${(baseY + tipY) / 2 - 4}
          L ${tipX} ${tipY} Z`,
      fill: color, stroke: shade(color, -25), 'stroke-width': 0.8,
    }, svg);
  }
}

function drawAlongStem(svg, x, baseY, stemHeight, count, color, rand, shape) {
  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1);
    const side = i % 2 === 0 ? -1 : 1;
    const cy = baseY - t * stemHeight;
    const cx = x + side * 11;
    const rot = side * 30;
    leafShape(svg, shape, cx, cy, rot, color, rand);
  }
}

function leafShape(svg, shape, cx, cy, rot, color, rand) {
  const dark = shade(color, -25);
  const t = `rotate(${rot} ${cx} ${cy})`;
  if (shape === 'oval') {
    el('ellipse', { cx, cy, rx: 8, ry: 4.5, transform: t,
      fill: color, stroke: dark, 'stroke-width': 0.8 }, svg);
  } else if (shape === 'serrated') {
    const d = `M ${cx - 8} ${cy}
               Q ${cx - 4} ${cy - 5} ${cx} ${cy - 4}
               Q ${cx + 4} ${cy - 5} ${cx + 8} ${cy}
               Q ${cx + 4} ${cy + 4} ${cx} ${cy + 3}
               Q ${cx - 4} ${cy + 4} ${cx - 8} ${cy} Z`;
    el('path', { d, transform: t, fill: color,
      stroke: dark, 'stroke-width': 0.8 }, svg);
    // teeth
    el('path', { d: `M ${cx - 6} ${cy - 2} L ${cx - 4} ${cy - 3.5} L ${cx - 2} ${cy - 2}`,
      transform: t, fill: 'none', stroke: dark, 'stroke-width': 0.6 }, svg);
  } else if (shape === 'heart') {
    el('path', {
      d: `M ${cx} ${cy + 5}
          C ${cx - 9} ${cy} ${cx - 9} ${cy - 7} ${cx - 4} ${cy - 6}
          C ${cx - 1} ${cy - 6} ${cx} ${cy - 3} ${cx} ${cy - 1}
          C ${cx} ${cy - 3} ${cx + 1} ${cy - 6} ${cx + 4} ${cy - 6}
          C ${cx + 9} ${cy - 7} ${cx + 9} ${cy} ${cx} ${cy + 5} Z`,
      transform: t, fill: color, stroke: dark, 'stroke-width': 0.8,
    }, svg);
  } else if (shape === 'paddle') {
    el('ellipse', { cx, cy, rx: 13, ry: 7, transform: t,
      fill: color, stroke: dark, 'stroke-width': 1 }, svg);
    el('path', { d: `M ${cx - 12} ${cy} L ${cx + 12} ${cy}`,
      transform: t, stroke: dark, 'stroke-width': 0.6, fill: 'none' }, svg);
  } else if (shape === 'monstera') {
    el('ellipse', { cx, cy, rx: 14, ry: 8, transform: t,
      fill: color, stroke: dark, 'stroke-width': 1 }, svg);
    // holes/slits
    for (let i = 0; i < 3; i++) {
      const hx = cx - 6 + i * 5;
      el('ellipse', { cx: hx, cy: cy + 1, rx: 2, ry: 1.5, transform: t,
        fill: '#0c1410' }, svg);
    }
  }
}

function drawSpikes(svg, x, baseY, count, color, rand) {
  // For dragon fruit — long thick segmented arms
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const offset = Math.floor(i / 2);
    const len = 26 + rand() * 6;
    const baseLeftX = x + side * (4 + offset * 2);
    const tipX = baseLeftX + side * len * 0.4;
    const tipY = baseY - 32 - offset * 8 - rand() * 6;
    el('path', {
      d: `M ${baseLeftX} ${baseY - 2}
          Q ${baseLeftX + side * 6} ${(baseY + tipY) / 2}
            ${tipX} ${tipY}`,
      stroke: color, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round',
    }, svg);
    // little thorns
    for (let j = 0; j < 4; j++) {
      const jt = (j + 1) / 5;
      const px = baseLeftX + (tipX - baseLeftX) * jt;
      const py = baseY - 2 - (baseY - 2 - tipY) * jt;
      el('circle', { cx: px + side * 3, cy: py, r: 1, fill: shade(color, -30) }, svg);
    }
  }
}

function drawBloom(svg, bloom, x, y, plantId, rand) {
  const fill = bloom.color === 'rainbow' ? `url(#rainbow-${plantId})` : bloom.color;
  const dark = bloom.color === 'rainbow' ? '#444' : shade(bloom.color, -30);
  switch (bloom.kind) {
    case 'puff':     return drawPuff(svg, x, y, bloom, fill, rand);
    case 'petals':   return drawPetals(svg, x, y, bloom, fill, dark);
    case 'cluster':  return drawCluster(svg, x, y, bloom, fill, dark, rand);
    case 'rose':     return drawRose(svg, x, y, bloom, fill, dark);
    case 'cup':      return drawCup(svg, x, y, bloom, fill, dark);
    case 'spike':    return drawSpikeBloom(svg, x, y, bloom, fill, dark, rand);
    case 'trumpet':  return drawTrumpet(svg, x, y, bloom, fill, dark);
    case 'iris':     return drawIris(svg, x, y, bloom, fill, dark);
    case 'jaws':     return drawJaws(svg, x, y, bloom, fill, dark);
    case 'paradise': return drawParadise(svg, x, y, bloom, fill, dark);
    case 'spathe':   return drawSpathe(svg, x, y, bloom, fill, dark);
    case 'dragon':   return drawDragon(svg, x, y, bloom, fill, dark, rand);
    case 'orchid':   return drawOrchid(svg, x, y, bloom, fill, dark);
    default:         return drawPetals(svg, x, y, bloom, fill, dark);
  }
}

function drawPuff(svg, x, y, bloom, fill, rand) {
  el('circle', { cx: x, cy: y, r: bloom.size,
    fill, opacity: 0.85 }, svg);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const r = bloom.size * (0.8 + rand() * 0.4);
    el('circle', {
      cx: x + Math.cos(a) * r,
      cy: y + Math.sin(a) * r,
      r: 2 + rand() * 1.5,
      fill, opacity: 0.7,
    }, svg);
  }
  el('circle', { cx: x, cy: y, r: bloom.size * 0.45,
    fill: bloom.centerColor }, svg);
}

function drawPetals(svg, x, y, bloom, fill, dark) {
  const n = bloom.petals;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const px = x + Math.cos(a) * bloom.size * 0.55;
    const py = y + Math.sin(a) * bloom.size * 0.55;
    el('ellipse', {
      cx: px, cy: py, rx: bloom.size * 0.45, ry: bloom.size * 0.25,
      transform: `rotate(${(a * 180 / Math.PI)} ${px} ${py})`,
      fill, stroke: dark, 'stroke-width': 0.6, opacity: 0.95,
    }, svg);
  }
  el('circle', { cx: x, cy: y, r: bloom.size * 0.35,
    fill: bloom.centerColor, stroke: dark, 'stroke-width': 0.8 }, svg);
}

function drawCluster(svg, x, y, bloom, fill, dark, rand) {
  const n = bloom.petals;
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * bloom.size * 0.6;
    const cx = x + Math.cos(a) * r;
    const cy = y + Math.sin(a) * r;
    el('circle', { cx, cy, r: 4 + rand() * 2,
      fill, stroke: dark, 'stroke-width': 0.5, opacity: 0.9 }, svg);
    el('circle', { cx: cx + 1, cy: cy - 1, r: 1.2,
      fill: bloom.centerColor, opacity: 0.7 }, svg);
  }
}

function drawRose(svg, x, y, bloom, fill, dark) {
  for (let layer = 3; layer >= 0; layer--) {
    const r = bloom.size * (0.4 + layer * 0.18);
    el('circle', { cx: x, cy: y, r,
      fill: layer % 2 === 0 ? fill : shade(typeof fill === 'string' && fill.startsWith('#') ? fill : '#aaa', -10 * (layer + 1)),
      stroke: dark, 'stroke-width': 0.6, opacity: 0.95 }, svg);
  }
  // Spiral indication
  el('path', {
    d: `M ${x} ${y}
        Q ${x + 3} ${y - 3} ${x + 5} ${y}
        Q ${x + 3} ${y + 4} ${x - 2} ${y + 2}
        Q ${x - 5} ${y - 2} ${x - 1} ${y - 4}`,
    stroke: dark, 'stroke-width': 0.8, fill: 'none',
  }, svg);
}

function drawCup(svg, x, y, bloom, fill, dark) {
  const w = bloom.size * 0.7, h = bloom.size * 0.95;
  el('path', {
    d: `M ${x - w} ${y + h * 0.3}
        Q ${x - w * 1.1} ${y - h} ${x} ${y - h}
        Q ${x + w * 1.1} ${y - h} ${x + w} ${y + h * 0.3}
        Q ${x} ${y + h * 0.55} ${x - w} ${y + h * 0.3} Z`,
    fill, stroke: dark, 'stroke-width': 1,
  }, svg);
  el('path', {
    d: `M ${x} ${y - h} L ${x} ${y + h * 0.4}`,
    stroke: dark, 'stroke-width': 0.6, fill: 'none', opacity: 0.6,
  }, svg);
}

function drawSpikeBloom(svg, x, y, bloom, fill, dark, rand) {
  const h = bloom.size;
  for (let i = 0; i < 10; i++) {
    const t = i / 10;
    const yy = y - h * 0.5 + t * h;
    const w = 3 + (1 - Math.abs(t - 0.5) * 2) * 4;
    el('ellipse', { cx: x, cy: yy, rx: w, ry: 3,
      fill, stroke: dark, 'stroke-width': 0.5, opacity: 0.9 }, svg);
  }
}

function drawTrumpet(svg, x, y, bloom, fill, dark) {
  const r = bloom.size * 0.55;
  for (let i = 0; i < bloom.petals; i++) {
    const a = (i / bloom.petals) * Math.PI * 2 - Math.PI / 2;
    const tx = x + Math.cos(a) * r;
    const ty = y + Math.sin(a) * r;
    el('path', {
      d: `M ${x} ${y} Q ${(x + tx) / 2 + Math.cos(a + 1) * 4} ${(y + ty) / 2 + Math.sin(a + 1) * 4} ${tx} ${ty}`,
      stroke: dark, 'stroke-width': 0.6, fill: 'none',
    }, svg);
    el('ellipse', { cx: tx, cy: ty, rx: 5, ry: 8,
      transform: `rotate(${(a * 180 / Math.PI) + 90} ${tx} ${ty})`,
      fill, stroke: dark, 'stroke-width': 0.6 }, svg);
  }
  el('circle', { cx: x, cy: y, r: bloom.size * 0.18,
    fill: bloom.centerColor }, svg);
}

function drawIris(svg, x, y, bloom, fill, dark) {
  // 3 up + 3 down
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i - 1) * (Math.PI / 3);
    const px = x + Math.cos(a) * 8;
    const py = y + Math.sin(a) * 8;
    el('ellipse', { cx: px, cy: py, rx: 5, ry: 9,
      transform: `rotate(${(a * 180 / Math.PI) + 90} ${px} ${py})`,
      fill, stroke: dark, 'stroke-width': 0.7 }, svg);
  }
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i - 1) * (Math.PI / 3);
    const px = x + Math.cos(a) * 9;
    const py = y + Math.sin(a) * 9;
    el('ellipse', { cx: px, cy: py, rx: 5, ry: 7,
      transform: `rotate(${(a * 180 / Math.PI) + 90} ${px} ${py})`,
      fill: shade(typeof fill === 'string' && fill.startsWith('#') ? fill : '#aaa', -15),
      stroke: dark, 'stroke-width': 0.7 }, svg);
  }
  el('circle', { cx: x, cy: y, r: 3, fill: bloom.centerColor }, svg);
}

function drawJaws(svg, x, y, bloom, fill, dark) {
  // Two open jaws shaped like a V with red interior
  for (const side of [-1, 1]) {
    el('path', {
      d: `M ${x} ${y + 5}
          Q ${x + side * 10} ${y - 2} ${x + side * 14} ${y - 8}
          Q ${x + side * 6} ${y - 5} ${x + side * 4} ${y + 2} Z`,
      fill, stroke: dark, 'stroke-width': 0.8,
    }, svg);
    // teeth
    for (let i = 0; i < 4; i++) {
      const t = i / 4 + 0.1;
      const tx = x + side * (4 + t * 10);
      const ty = y - 1 - t * 5;
      el('path', { d: `M ${tx} ${ty} l ${side * 1.5} -3 l 1 3 z`,
        fill: '#f4f4e0', stroke: dark, 'stroke-width': 0.3 }, svg);
    }
  }
  el('ellipse', { cx: x, cy: y + 1, rx: 5, ry: 3, fill: bloom.centerColor, opacity: 0.7 }, svg);
}

function drawParadise(svg, x, y, bloom, fill, dark) {
  // Crest of orange spikes + blue accent
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.35;
    const tx = x + Math.cos(a) * bloom.size;
    const ty = y + Math.sin(a) * bloom.size;
    el('path', {
      d: `M ${x} ${y + 4} L ${tx} ${ty} L ${x + Math.cos(a + 0.15) * (bloom.size - 6)} ${y + Math.sin(a + 0.15) * (bloom.size - 6)} Z`,
      fill, stroke: dark, 'stroke-width': 0.6,
    }, svg);
  }
  el('path', {
    d: `M ${x - 4} ${y + 6} Q ${x} ${y - 2} ${x + 4} ${y + 6} Z`,
    fill: bloom.centerColor, stroke: dark, 'stroke-width': 0.5,
  }, svg);
  // base sheath
  el('path', {
    d: `M ${x - 12} ${y + 4} Q ${x} ${y + 14} ${x + 12} ${y + 4} Q ${x} ${y + 8} ${x - 12} ${y + 4} Z`,
    fill: '#5a6a3a', stroke: dark, 'stroke-width': 0.5,
  }, svg);
}

function drawSpathe(svg, x, y, bloom, fill, dark) {
  el('path', {
    d: `M ${x - 9} ${y + 8}
        Q ${x - 14} ${y - 8} ${x} ${y - 14}
        Q ${x + 14} ${y - 8} ${x + 9} ${y + 8}
        Q ${x} ${y + 4} ${x - 9} ${y + 8} Z`,
    fill, stroke: dark, 'stroke-width': 0.8,
  }, svg);
  el('rect', { x: x - 1, y: y - 12, width: 2, height: 14,
    rx: 1, fill: bloom.centerColor }, svg);
  el('rect', { x: x - 1, y: y - 12, width: 2, height: 14,
    rx: 1, fill: 'none', stroke: shade(bloom.centerColor, -20), 'stroke-width': 0.4 }, svg);
}

function drawDragon(svg, x, y, bloom, fill, dark, rand) {
  // Pink fruit with green spikes
  el('ellipse', { cx: x, cy: y, rx: bloom.size * 0.7, ry: bloom.size * 0.85,
    fill, stroke: dark, 'stroke-width': 1 }, svg);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = bloom.size * 0.85;
    const px = x + Math.cos(a) * r * 0.7;
    const py = y + Math.sin(a) * r * 0.85;
    el('path', {
      d: `M ${px} ${py} l ${Math.cos(a) * 6} ${Math.sin(a) * 6} l ${Math.cos(a + 0.4) * -3} ${Math.sin(a + 0.4) * -3} z`,
      fill: bloom.centerColor, stroke: dark, 'stroke-width': 0.4,
    }, svg);
  }
  el('ellipse', { cx: x, cy: y, rx: bloom.size * 0.35, ry: bloom.size * 0.45,
    fill: shade(typeof fill === 'string' && fill.startsWith('#') ? fill : '#aaa', 15), opacity: 0.6 }, svg);
}

function drawOrchid(svg, x, y, bloom, fill, dark) {
  // ethereal 5-petal
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    const px = x + Math.cos(a) * bloom.size * 0.45;
    const py = y + Math.sin(a) * bloom.size * 0.45;
    el('path', {
      d: `M ${x} ${y} Q ${px} ${py - 2} ${px + Math.cos(a) * 8} ${py + Math.sin(a) * 8} Q ${px - 2} ${py + 2} ${x} ${y} Z`,
      fill, stroke: dark, 'stroke-width': 0.5, opacity: 0.85,
    }, svg);
  }
  // ghost glow
  el('circle', { cx: x, cy: y, r: bloom.size * 0.9, fill: fill, opacity: 0.15 }, svg);
  el('circle', { cx: x, cy: y, r: 3, fill: bloom.centerColor }, svg);
}

function shade(hex, pct) {
  // Adjust hex color brightness by pct (-100..100). Returns hex.
  if (!hex || !hex.startsWith('#')) return '#444';
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const t = pct < 0 ? 0 : 255;
  const p = Math.abs(pct) / 100;
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// ── Card builder ──────────────────────────────────────────────────────────

export function buildCard(plant, opts = {}) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.rarity = plant.rarity;

  if (opts.unowned) card.classList.add('unowned');
  if (opts.landscape) card.classList.add('landscape');

  const art = document.createElement('div');
  art.className = 'art';
  art.appendChild(opts.unowned ? buildSilhouette() : buildPlantSVG(plant));
  card.appendChild(art);

  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = opts.unowned ? '???' : plant.name;

  const rarity = document.createElement('div');
  rarity.className = 'rarity';
  rarity.textContent = plant.rarity;

  if (opts.landscape) {
    const info = document.createElement('div');
    info.className = 'info';
    info.appendChild(name);
    info.appendChild(rarity);
    card.appendChild(info);
  } else {
    card.appendChild(name);
    card.appendChild(rarity);
  }

  if (opts.count && opts.count > 1) {
    const count = document.createElement('div');
    count.className = 'count';
    count.textContent = '×' + opts.count;
    card.appendChild(count);
  }

  if (opts.isNew) {
    const ribbon = document.createElement('div');
    ribbon.className = 'new-ribbon';
    ribbon.textContent = 'NEW!';
    card.appendChild(ribbon);
  }

  return card;
}

function buildSilhouette() {
  const svg = el('svg', { viewBox: '0 0 100 120' });
  const t = el('text', {
    x: 50, y: 70, 'text-anchor': 'middle',
    'font-size': 50, fill: '#2a3a30',
  }, svg);
  t.textContent = '?';
  return svg;
}
