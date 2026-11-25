// Draws the shareable Ritzz card on a canvas. The canvas is both the preview and the PNG.

// Ritzz status by current Ritzz length (same names and colours as the shop tiers)
const STATUSES = [
  { days: 60, label: "MYTHIC", color: "#FF6B85" },
  { days: 30, label: "LEGENDARY", color: "#F4C542" },
  { days: 15, label: "EPIC", color: "#C49BFF" },
  { days: 7, label: "RARE", color: "#6CC4FF" },
];

export const ritzzStatus = (days) => STATUSES.find((s) => days >= s.days) || null;
const nextStatus = (days) => [...STATUSES].reverse().find((s) => days < s.days) || null;

export const CARD_SIZES = { story: [540, 960], square: [540, 540] };

const FLAME = [[7, 1, 2, 2], [6, 3, 4, 2], [4, 4, 2, 2], [5, 5, 7, 2], [3, 7, 10, 5], [4, 12, 8, 2], [6, 14, 4, 1]];
const FLAME_CORE = [[6, 8, 4, 4], [7, 7, 2, 1], [7, 12, 2, 1]];
const PIXEL = "'Silkscreen', monospace";
const CAP = 0.63; // Silkscreen capital and digit height, in em

const font = (ctx, f) => { ctx.font = f; };

function drawFlame(ctx, x, y, size) {
  const u = size / 16;
  ctx.fillStyle = "#FF7A1A";
  FLAME.forEach(([a, b, w, h]) => ctx.fillRect(x + a * u, y + b * u, w * u, h * u));
  ctx.fillStyle = "#FFD23F";
  FLAME_CORE.forEach(([a, b, w, h]) => ctx.fillRect(x + a * u, y + b * u, w * u, h * u));
}

function pill(ctx, text, right, top, color, size) {
  font(ctx, `${size}px ${PIXEL}`);
  const w = ctx.measureText(text).width + size * 1.8;
  const h = size * 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(right - w, top, w, h, h / 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, right - w / 2, top + h / 2 + size * CAP / 2);
  ctx.textAlign = "left";
}

// Big number with "DAY / RITZZ" beside it, both the same height. Returns the row's width.
function daysRow(ctx, days, x, top, size, color, measureOnly) {
  const small = size * CAP / (1 + CAP);
  font(ctx, `700 ${size}px ${PIXEL}`);
  const numW = ctx.measureText(String(days)).width;
  font(ctx, `700 ${small}px ${PIXEL}`);
  const labelW = ctx.measureText("RITZZ").width;
  const gap = size * 0.12;
  if (measureOnly) return numW + gap + labelW;
  font(ctx, `700 ${size}px ${PIXEL}`);
  ctx.fillStyle = color;
  ctx.fillText(String(days), x, top + size * CAP);
  font(ctx, `700 ${small}px ${PIXEL}`);
  ctx.fillStyle = "#FAFAFA";
  ctx.fillText("DAY", x + numW + gap, top + small * CAP);
  ctx.fillText("RITZZ", x + numW + gap, top + small * (1 + CAP));
  return numW + gap + labelW;
}

function progress(ctx, days, x, y, w) {
  const next = nextStatus(days);
  const prev = ritzzStatus(days);
  ctx.fillStyle = "#262626";
  ctx.beginPath();
  ctx.roundRect(x, y, w, 10, 5);
  ctx.fill();
  ctx.fillStyle = next ? "#FF7A1A" : prev.color;
  ctx.beginPath();
  ctx.roundRect(x, y, next ? Math.max(10, w * days / next.days) : w, 10, 5);
  ctx.fill();
  font(ctx, "13px 'Open Sans', sans-serif");
  ctx.fillStyle = "#A3A3A3";
  ctx.fillText(next ? `${days} / ${next.days} days to ${next.label}` : "Top status reached", x, y + 30);
}

// Heading and line centred over a full-width green button with the user's invite link
function footer(ctx, w, h, pad, cta, invite) {
  const y = h - pad - 108;
  ctx.strokeStyle = "#2E2E2E";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(pad, y - 20);
  ctx.lineTo(w - pad, y - 20);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = "center";
  font(ctx, "700 17px 'Open Sans', sans-serif");
  ctx.fillStyle = "#FAFAFA";
  ctx.fillText(cta, w / 2, y + 6);
  font(ctx, "14px 'Open Sans', sans-serif");
  ctx.fillStyle = "#A3A3A3";
  ctx.fillText(invite ? `Join with my link and get +${invite.bonus} coins.` : "Be real. Stay anonymous.", w / 2, y + 28);
  ctx.fillStyle = "#22C55E";
  ctx.beginPath();
  ctx.roundRect(pad, y + 44, w - pad * 2, 52, 12);
  ctx.fill();
  font(ctx, "600 17px 'Poppins', sans-serif");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(invite ? `mennist.com/i/${invite.code}` : "mennist.com", w / 2, y + 76);
  ctx.textAlign = "left";
}

function drawAvatar(ctx, img, x, y, size) {
  ctx.fillStyle = "#1F1F1F";
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.12);
  ctx.fill();
  if (img) ctx.drawImage(img, x, y, size, size);
}

// avatarSvg: the user's <svg> avatar element (from <Avatar />), drawn crisp at any size
export async function loadAvatarImage(svgEl, px) {
  if (!svgEl) return null;
  const copy = svgEl.cloneNode(true);
  copy.setAttribute("width", px);
  copy.setAttribute("height", px);
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(copy));
  try { await img.decode(); return img; } catch { return null; }
}

export const loadCardFonts = () => Promise.all([
  `700 40px ${PIXEL}`, `40px ${PIXEL}`, "700 17px 'Open Sans'", "14px 'Open Sans'", "600 17px 'Poppins'",
].map((f) => document.fonts.load(f))).catch(() => {});

// Draws at 2x (1080 px wide) so the PNG is sharp on Stories and Status
// invite: { code, bonus } puts the user's invite link on the card
export function drawRitzzCard(canvas, { days, format, avatar, invite }) {
  const [w, h] = CARD_SIZES[format];
  canvas.width = w * 2;
  canvas.height = h * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#0D0D0D";
  ctx.fillRect(0, 0, w, h);

  const status = ritzzStatus(days);
  const accent = status && status.days >= 30 ? status.color : "#FF7A1A";
  const pad = format === "story" ? 44 : 36;

  font(ctx, `700 26px ${PIXEL}`);
  ctx.fillStyle = "#FAFAFA";
  ctx.fillText("mennist", pad, pad + 26 * CAP + 4);
  pill(ctx, status ? status.label : "RITZZ", w - pad, pad - 4, status ? status.color : "#F4C542", 14);

  if (format === "story") {
    drawAvatar(ctx, avatar, (w - 220) / 2, 230, 220);
    const rowW = daysRow(ctx, days, 0, 0, 120, accent, true);
    daysRow(ctx, days, (w - rowW) / 2, 510, 120, accent);
    font(ctx, "16px 'Open Sans', sans-serif");
    ctx.fillStyle = "#D4D4D4";
    ctx.textAlign = "center";
    ctx.fillText(`${days} ${days === 1 ? "day" : "days"} in a row. Still anonymous.`, w / 2, 640);
    ctx.textAlign = "left";
    progress(ctx, days, pad, 710, w - pad * 2);
  } else {
    drawFlame(ctx, pad, 130, 120);
    font(ctx, `700 96px ${PIXEL}`);
    ctx.fillStyle = accent;
    ctx.textAlign = "center";
    ctx.fillText(String(days), pad + 60, 275 + 96 * CAP);
    ctx.textAlign = "left";
    const x = pad + 148;
    drawAvatar(ctx, avatar, x, 160, 60);
    font(ctx, `700 30px ${PIXEL}`);
    ctx.fillStyle = "#FAFAFA";
    // Two 30 px lines centred in the avatar's 60 px height
    ctx.fillText("DAY", x + 72, 175 + 30 * CAP / 2);
    ctx.fillText("RITZZ", x + 72, 205 + 30 * CAP / 2);
    font(ctx, "16px 'Open Sans', sans-serif");
    ctx.fillStyle = "#D4D4D4";
    ctx.fillText(`${days} ${days === 1 ? "day" : "days"} in a row.`, x, 262);
    progress(ctx, days, x, 292, w - pad - x);
  }

  footer(ctx, w, h, pad, days >= 30 ? `Can you beat ${days}?` : "Start your own Ritzz", invite);
}
