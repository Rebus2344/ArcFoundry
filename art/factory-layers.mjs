import { cardFrame } from './factory-card.mjs';
export const WORLDS = ['Basalt', 'Dune', 'Glacier', 'Verdant', 'Pelagic', 'Amethyst', 'Lunar', 'Caustic'];
export const SKY_NAMES = ['Midnight', 'Copper dusk', 'Polar dawn', 'Nebula', 'Solar haze', 'Blue hour', 'Rose horizon', 'Deep space'];
export const MATERIALS = ['Titanium', 'Copper', 'Ceramic', 'Obsidian', 'Cobalt', 'Jade', 'Sandstone', 'Chrome'];
export const POWER_NAMES = ['Amber', 'Ion blue', 'Plasma violet', 'Reactor green', 'Solar gold', 'Ice white', 'Crimson', 'Teal'];
export const ZONES = ['Production', 'Smelter', 'Storage', 'Power', 'Processing', 'Command', 'Logistics'];
export const BUILDINGS = [['Sawtooth hall', 'Twin assembly', 'Heavy forge', 'Robotic assembly'], ['Blast furnace', 'Twin kilns', 'Arc crucible', 'Thermal stacks'], ['Tank farm', 'Grain silos', 'Vault warehouse', 'Pressure vessels'], ['Solar array', 'Wind turbines', 'Fusion chamber', 'Thermal coil'], ['Refinery', 'Chemical works', 'Ore separator', 'Machining block'], ['Control tower', 'Observatory', 'Communications', 'Command center'], ['Freight dock', 'Conveyor', 'Cargo depot', 'Gantry crane']];
export const POSITIONS = [[92, 243], [202, 220], [312, 243], [422, 220], [142, 359], [262, 336], [382, 359]];
export const WORLD_COLORS = [['#403749', '#655264', '#201d2b', '#ed774a'], ['#97634a', '#c68a5c', '#563f37', '#f0bd70'], ['#76a4ac', '#bcdbd7', '#405e75', '#bcffff'], ['#315e55', '#548f6a', '#223a46', '#9ee3a0'], ['#244f72', '#417b93', '#183748', '#79dbe0'], ['#6b4c82', '#a27fa9', '#352c53', '#ddb3ff'], ['#666c81', '#a0a4b3', '#373c51', '#d6ddeb'], ['#495d39', '#91a44e', '#29382f', '#c9f371']];
export const SKY_COLORS = ['#111c35', '#342538', '#243e5b', '#302547', '#52323d', '#1b304f', '#44304f', '#0b1429'];
export const METAL_COLORS = [['#90a5b0', '#536979', '#c7d6d8'], ['#b77551', '#754634', '#e6ad77'], ['#d9d4bc', '#888f91', '#faf1d7'], ['#586274', '#303d52', '#8c9aa9'], ['#477e9d', '#314b70', '#8cc4ce'], ['#6d9c87', '#3c635f', '#b2d6b0'], ['#b69d78', '#766d60', '#e0c7a0'], ['#b1b8cf', '#636e89', '#e8ebf5']];
export const POWER_COLORS = ['#ffb565', '#72dfff', '#c197ff', '#acfa91', '#f9e575', '#dcfcff', '#ff7d81', '#75ecd6'];
export const RARITY_NAMES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Unrevealed'];
export const RARITY_COLORS = ['#9ca3af', '#ffffff', '#4ca9ff', '#b780ff', '#ffb344', '#64748b'];
const rect = (x, y, w, h, c) => `<path d="M${x} ${y}h${w}v${h}h-${w}z" class="${c}"/>`;
const poly = (p, c) => `<path d="M${p.replaceAll(' ', 'L')}Z" class="${c}"/>`;
const line = (x, y, x2, y2, c = 'edge', w = 2) => `<path d="M${x} ${y}L${x2} ${y2}" class="${c}" fill="none" stroke-width="${w}"/>`;
const ellipse = (x, y, rx, ry, c) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" class="${c}"/>`;
function box(x, y, w, d, h) {
  return poly(`${x},${y - h} ${x + w},${y - h - w / 2} ${x + w + d},${y - h - w / 2 + d / 2} ${x + d},${y - h + d / 2}`, 'roof') + poly(`${x},${y - h} ${x + d},${y - h + d / 2} ${x + d},${y + d / 2} ${x},${y}`, 'front') + poly(`${x + d},${y - h + d / 2} ${x + w + d},${y - h - w / 2 + d / 2} ${x + w + d},${y - w / 2 + d / 2} ${x + d},${y + d / 2}`, 'side');
}
function tank(x, y, r, h) {
  return rect(x - r, y - h, r * 2, h, 'front') + ellipse(x, y, r, r / 2, 'side') + rect(x, y - h, r, h, 'side') + ellipse(x, y - h, r, r / 2, 'roof') + rect(x - r + 3, y - h + 3, 2, h - 5, 'shine');
}
function stack(x, y, h) {
  return box(x, y, 8, 8, h) + rect(x + 2, y - h - 4, 11, 5, 'dark') + rect(x + 3, y - h + 8, 10, 4, 'power');
}
function windows(x, y, n = 3) {
  let s = '';
  for (let i = 0; i < n; i++) s += rect(x + i * 8, y - i * 4, 4, 5, 'power');
  return s;
}
function solar(x, y) {
  return poly(`${x},${y} ${x + 24},${y - 12} ${x + 37},${y - 3} ${x + 13},${y + 9}`, 'panel') + line(x + 6, y - 3, x + 19, y + 6, 'glint', 1) + line(x + 12, y - 6, x + 25, y + 3, 'glint', 1) + line(x + 18, y - 9, x + 31, y, 'glint', 1) + rect(x + 16, y + 6, 3, 9, 'dark');
}
function turbine(x, y, h) {
  return rect(x - 2, y - h, 4, h, 'shine') + ellipse(x, y - h, 4, 3, 'power') + poly(`${x},${y - h} ${x - 3},${y - h - 24} ${x + 2},${y - h - 20}`, 'roof') + poly(`${x},${y - h} ${x + 22},${y - h + 10} ${x + 15},${y - h + 12}`, 'roof') + poly(`${x},${y - h} ${x - 19},${y - h + 15} ${x - 19},${y - h + 9}`, 'roof');
}
function layer(g, v) {
  let s = poly('-44,0 0,-22 44,0 0,22', 'pad') + poly('-44,0 0,22 44,0 44,5 0,27 -44,5', 'foundation');
  if (g === 0) {
    if (v === 0) {
      s += box(-30, -3, 38, 23, 30);
      for (let i = 0; i < 3; i++) s += poly(`${-30 + i * 12},${-33 - i * 6} ${-18 + i * 12},${-49 - i * 6} ${5 + i * 12},${-37.5 - i * 6} ${-7 + i * 12},${-21.5 - i * 6}`, 'roof');
      s += windows(-2, -13);
    }
    if (v === 1) s += box(-34, -1, 20, 16, 28) + box(-7, -4, 26, 18, 38) + windows(14, -22, 2);
    if (v === 2) s += box(-33, -2, 38, 24, 43) + rect(-13, -31, 12, 18, 'dark') + rect(-11, -29, 8, 13, 'power') + stack(13, -9, 54);
    if (v === 3) s += box(-34, -2, 43, 22, 23) + windows(-5, -11, 4) + box(-17, -13, 16, 10, 40) + rect(-10, -41, 10, 7, 'power');
  }
  if (g === 1) {
    if (v === 0) s += tank(-8, -3, 16, 50) + stack(14, -3, 66) + rect(-20, -21, 22, 7, 'power');
    if (v === 1) s += tank(-20, 0, 12, 32) + tank(12, -4, 15, 45) + line(-12, -17, 15, -28, 'pipe', 5);
    if (v === 2) s += box(-26, -2, 29, 22, 18) + ellipse(-2, -31, 23, 12, 'dark') + ellipse(-2, -32, 17, 8, 'power') + rect(-6, -29, 8, 30, 'side');
    if (v === 3) for (let i = 0; i < 3; i++) s += stack(-26 + i * 20, 2 - i * 3, 36 + i * 10);
  }
  if (g === 2) {
    if (v === 0) s += tank(-20, 0, 15, 24) + tank(13, -4, 14, 35);
    if (v === 1) for (let i = 0; i < 3; i++) s += tank(-24 + i * 21, 2 - i * 3, 9, 44);
    if (v === 2) s += box(-32, 0, 42, 23, 32) + rect(-23, -23, 14, 16, 'dark') + windows(2, -12, 3);
    if (v === 3) s += box(-28, 2, 38, 20, 8) + ellipse(-13, -21, 17, 18, 'front') + ellipse(16, -31, 14, 15, 'roof') + rect(-17, -5, 5, 10, 'dark') + rect(13, -17, 4, 11, 'dark');
  }
  if (g === 3) {
    if (v === 0) s += solar(-34, -13) + solar(-6, 3);
    if (v === 1) s += turbine(-18, 1, 43) + turbine(18, -8, 54);
    if (v === 2) s += box(-28, 0, 34, 22, 20) + ellipse(-1, -27, 22, 13, 'roof') + ellipse(-1, -29, 11, 7, 'power') + rect(-4, -56, 6, 25, 'shine');
    if (v === 3) {
      s += tank(0, -2, 23, 34);
      for (let i = 0; i < 4; i++) s += ellipse(0, -14 - i * 8, 26, 9, 'coil');
    }
  }
  if (g === 4) {
    if (v === 0) s += tank(-18, 0, 10, 48) + box(-5, 0, 25, 20, 28) + line(-18, -21, 13, -14, 'pipe', 6) + stack(16, -5, 52);
    if (v === 1) s += box(-32, 0, 39, 24, 22) + stack(-20, -10, 46) + stack(0, -12, 60) + windows(7, -14, 2);
    if (v === 2) s += box(-28, 0, 30, 22, 27) + poly('-26,-29 -8,-48 22,-33 5,-14', 'roof') + rect(-11, -31, 18, 6, 'power') + tank(24, -2, 8, 24);
    if (v === 3) s += box(-35, 0, 46, 25, 29) + windows(-3, -11, 4) + box(-25, -18, 10, 10, 34) + box(1, -30, 10, 10, 25);
  }
  if (g === 5) {
    if (v === 0) s += box(-12, 1, 16, 16, 53) + box(-24, -42, 32, 22, 15) + windows(-2, -47, 3);
    if (v === 1) s += box(-29, 0, 36, 22, 19) + `<path d="M-28 -25 Q-5 -75 28 -28 L1 -13Z" class="roof"/>` + line(-4, -55, 3, -18, 'edge', 3);
    if (v === 2) s += box(-25, 1, 31, 21, 15) + rect(-4, -43, 4, 35, 'shine') + `<path d="M-26 -60 Q-5 -19 23 -54 Q-5 -66 -26 -60Z" class="roof"/>` + line(-2, -45, 7, -64, 'pipe', 3);
    if (v === 3) s += box(-32, 0, 41, 25, 33) + windows(-4, -18, 4) + rect(-16, -48, 3, 14, 'shine') + rect(-17, -51, 5, 4, 'power');
  }
  if (g === 6) {
    if (v === 0) s += box(-32, 0, 41, 26, 17) + rect(-15, -12, 12, 16, 'dark') + box(14, 3, 14, 12, 9);
    if (v === 1) {
      s += box(-32, 0, 14, 19, 27) + poly('-17,-22 26,-2 32,-8 -11,-28', 'dark');
      for (let i = 0; i < 5; i++) s += line(-13 + i * 9, -24 + i * 4, -8 + i * 9, -29 + i * 4, 'shine', 2);
    }
    if (v === 2) s += box(-35, 1, 25, 15, 14) + box(-9, -13, 25, 15, 14) + box(8, 6, 24, 16, 15) + windows(-18, -6, 2);
    if (v === 3) s += rect(-28, -48, 5, 48, 'front') + rect(28, -56, 5, 48, 'side') + poly('-28,-48 32,-62 37,-55 -23,-41', 'roof') + line(9, -54, 9, -21, 'pipe', 2) + line(9, -21, 16, -18, 'pipe', 3) + box(-8, 5, 21, 15, 10);
  }
  return `<g class="building">${s}</g>`;
}
export const BUILDING_SVGS = BUILDINGS.map((_, g) => Array.from({
  length: 4
}, (_, v) => layer(g, v)));
export const GROUND = poly('0,262 256,130 512,262 512,512 0,512', 'ground') + poly('26,336 260,211 488,332 264,456', 'land') + poly('26,336 264,456 488,332 488,353 264,479 26,358', 'soil') + poly('56,334 260,229 460,335 263,439', 'surface');
export const ENVIRONMENTS = WORLDS.map((_, w) => {
  let s = '';
  for (let i = 0; i < 9; i++) {
    const x = 16 + i * 59 % 485,
      y = 285 + i * 43 % 145;
    if (w === 0) s += `<path d="M${x} ${y}l14 -8 5 15 17 -3" class="lava" fill="none"/>`;
    if (w === 1) s += `<path d="M${x} ${y}q24 -21 45 0" class="dune" fill="none"/>`;
    if (w === 2 || w === 5) s += poly(`${x},${y} ${x + 8},${y - (w === 2 ? 25 : 36)} ${x + 21},${y - 7} ${x + 12},${y + 7}`, 'crystal');
    if (w === 3) s += rect(x + 7, y - 21, 4, 25, 'stem') + poly(`${x - 1},${y - 17} ${x + 9},${y - 42} ${x + 21},${y - 19} ${x + 9},${y - 6}`, 'flora');
    if (w === 4) s += `<path d="M${x} ${y}q12 -6 23 0t23 0" class="water" fill="none"/>`;
    if (w === 6) s += ellipse(x + 8, y, 14, 7, 'crater') + ellipse(x + 7, y - 2, 10, 4, 'soil');
    if (w === 7) s += ellipse(x + 8, y, 20, 8, 'pool') + ellipse(x + 5, y - 1, 5, 2, 'power');
  }
  return s;
});
export const ATMOSPHERES = Array.from({
  length: 4
}, (_, i) => {
  if (i === 0) return '';
  if (i === 1) return '<path d="M5 148Q170 75 347 159T512 120" stroke="#acdaff" opacity=".18" stroke-width="17" fill="none"/>';
  if (i === 2) return '<path d="M0 178Q165 142 330 188T512 163" stroke="#ffd8b7" opacity=".12" stroke-width="25" fill="none"/>';
  return '<path d="M25 129L173 82M311 134L431 91" stroke="#b6c8ef" opacity=".4" stroke-width="2"/>';
});
export const HORIZONS = Array.from({
  length: 8
}, (_, v) => {
  let points = '0,284 ';
  for (let i = 0; i < 13; i++) points += `${i * 43},${185 + (i * 31 + v * 23) % 57} `;
  return poly(points + '512,286', 'horizon');
});
export const MOONS = Array.from({
  length: 4
}, (_, v) => {
  let s = '';
  for (let i = 0; i <= v; i++) {
    const x = 367 - i * 61,
      y = 100 + i % 2 * 27,
      r = 27 - i * 4;
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#d8d3df" opacity="${.65 - i * .1}"/><circle cx="${x - 8}" cy="${y - 6}" r="${r - 2}" fill="#555779"/>`;
  }
  return s;
});
export const SATELLITES = Array.from({
  length: 4
}, (_, v) => {
  const x = 65 + v * 15,
    y = 108 - v * 6;
  return `<g transform="translate(${x} ${y})">${rect(0, 0, 12, 9, 'shine') + rect(-17, 1, 14, 7, 'panel') + rect(15, 1, 14, 7, 'panel') + line(-3, 4, 15, 4, 'glint', 1) + line(6, 0, 9, -7, 'glint', 1)}</g>`;
});
export const LIGHTS = Array.from({
  length: 4
}, (_, v) => {
  let s = '';
  for (let i = 0; i < 4; i++) {
    const x = 57 + i * 122,
      y = 352 + i % 2 * 58;
    s += rect(x, y - 14 - v * 2, 2, 18 + v * 2, 'dark') + rect(x - 2, y - 17 - v * 2, 6, 4, 'power');
  }
  return s;
});
export const PIPES = Array.from({
  length: 4
}, (_, v) => `<path d="M72 ${285 + v * 3}L211 ${263 + v * 2}L336 ${287 + v * 4}L442 ${266 + v * 3}" class="pipe" fill="none" stroke-width="${3 + v}"/><path d="M110 397L265 ${417 - v * 5}L418 388" class="pipe" fill="none" stroke-width="${3 + v}"/>`);
export const MARKERS = Array.from({
  length: 4
}, (_, v) => {
  let s = '';
  for (let i = 0; i <= v; i++) s += poly(`${239 + i * 8},426 ${246 + i * 8},422 ${253 + i * 8},426 ${246 + i * 8},430`, 'power');
  return s;
});
export const STARS = Array.from({
  length: 26
}, (_, i) => rect(21 + i * 71 % 474, 28 + i * 37 % 141, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1, 'star')).join('');
export function traits(seed) {
  let v = BigInt(seed);
  return {
    world: Number(v & 7n),
    sky: Number(v >> 3n & 7n),
    material: Number(v >> 6n & 7n),
    power: Number(v >> 9n & 7n),
    horizon: Number(v >> 12n & 7n),
    moons: Number(v >> 15n & 3n),
    atmosphere: Number(v >> 17n & 3n),
    satellite: Number(v >> 19n & 3n),
    lights: Number(v >> 21n & 3n),
    pipes: Number(v >> 23n & 3n),
    markers: Number(v >> 25n & 3n)
  };
}
export function cssFor(t) {
  const w = WORLD_COLORS[t.world],
    m = METAL_COLORS[t.material],
    p = POWER_COLORS[t.power];
  return `.ground{fill:${w[2]}}.land{fill:${w[1]}}.soil{fill:${w[2]}}.surface{fill:${w[0]}}.horizon{fill:${w[2]}}.front{fill:${m[0]};stroke:#172336;stroke-width:1}.side{fill:${m[1]};stroke:#172336;stroke-width:1}.roof{fill:${m[2]};stroke:#172336;stroke-width:1}.shine{fill:${m[2]}}.dark{fill:#152237}.power{fill:${p}}.pad{fill:#52616e;stroke:#263245;stroke-width:1}.foundation{fill:#303e50}.panel{fill:#30567e;stroke:#8ab8d4;stroke-width:1}.pipe{stroke:${m[1]}}.edge{stroke:#233147}.glint{stroke:#8fd8e0}.coil{fill:none;stroke:${p};stroke-width:3}.star{fill:#c7d9ee}.lava{stroke:${w[3]};stroke-width:3}.dune{stroke:${w[3]};stroke-width:2}.crystal{fill:${w[3]};stroke:${w[1]};stroke-width:1}.stem{fill:#293747}.flora{fill:${w[3]}}.water{stroke:${w[3]};stroke-width:2}.crater{fill:${w[1]}}.pool{fill:${w[3]}}`;
}
export function factorySVG(blueprint, seed, rarity = 0, pending = false) {
  const t = traits(seed);
  let body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 584" shape-rendering="crispEdges"><style>${cssFor(t)}</style><rect width="512" height="512" fill="${SKY_COLORS[t.sky]}"/>${STARS}${MOONS[t.moons]}${SATELLITES[t.satellite]}${ATMOSPHERES[t.atmosphere]}${HORIZONS[t.horizon]}${GROUND}${ENVIRONMENTS[t.world]}${PIPES[t.pipes]}`;
  for (let g = 0; g < 7; g++) body += `<g transform="translate(${POSITIONS[g][0]} ${POSITIONS[g][1]})">${BUILDING_SVGS[g][blueprint >> g * 2 & 3]}</g>`;
  return body + LIGHTS[t.lights] + MARKERS[t.markers] + cardFrame(pending ? 5 : rarity) + '</svg>';
}
