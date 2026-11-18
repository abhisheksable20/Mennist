/*
  Mythic avatars: one of one.
  The server gives each owner a fixed seed. The same seed always produces the
  same colours, skin pattern, aura and headpiece, so no two owners look alike
  and nobody can re-roll their look.
*/

const hash = (s) => {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const rng = (seedIn) => {
  let seed = seedIn;
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hsl = (h, sIn, lIn) => {
  const s = sIn / 100;
  const l = lIn / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
};

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

export function mythicLook(seed) {
  const r = rng(hash(String(seed)));
  const hue = Math.floor(r() * 360);
  const skinA = hsl(hue, 45 + r() * 25, 48 + r() * 12);
  const skinB = hsl((hue + 20) % 360, 60, 30 + r() * 10);
  const hairC = hsl((hue + 140 + r() * 80) % 360, 85, 60);
  const glow = hsl((hue + 180) % 360, 95, 62);
  const aura = pick(r, ["fire", "frost", "shadow"]);
  const pattern = pick(r, ["scales", "stripes", "dots", "circuit"]);
  const acc = pick(r, ["acc-crown", "acc-halo", "acc-horns", "acc-visor"]);
  const auraColors = aura === "shadow"
    ? [hsl(hue, 55, 18), hsl(hue, 60, 35)]
    : [hsl((hue + 30) % 360, 90, 55), hsl((hue + 50) % 360, 95, 75)];
  const accColor = acc === "acc-visor" ? glow : hsl((hue + 200) % 360, 80, 62);

  return {
    bg: "gradient",
    bgColors: [hsl(hue, 50, 8), hsl((hue + 60) % 360, 55, 16)],
    aura,
    auraColors,
    skinPattern: pattern === "scales" ? ["scales", skinA, skinB, hsl(hue, 60, 70)] : [pattern, skinA, skinB],
    shadow: hsl(hue, 40, 34),
    hair: hairC,
    eyes: "custom",
    eyeColor: glow,
    acc,
    accColors: [accColor, glow],
    shirt: hsl((hue + 200) % 360, 35, 18),
  };
}
