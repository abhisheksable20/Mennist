import { useId } from "react";
import { AVATAR_OPTIONS, DEFAULT_AVATAR } from "./avatarOptions";
import { mythicLook } from "./mythic";

/*
  Pixel avatar on a 32x32 grid.
  Free avatars look exactly as before. Premium items from the coin shop add
  layers on top: hair effects, special eyes, accessories, auras, backgrounds,
  frames and full sets (Sakesnake, Ghost, Glitch, Cosmic, Mythic).
*/

const BACK_HAIR = {
  "hair-02": [],
  "hair-06": [[6, 16, 4, 7], [22, 16, 4, 7]],
  "hair-07": [[23, 5, 5, 7], [26, 10, 3, 9]],
  "hair-09": [[5, 13, 3, 9], [24, 13, 3, 9], [5, 21, 2, 2], [25, 21, 2, 2]],
  "hair-10": [[5, 10, 3, 12], [24, 10, 3, 12], [5, 19, 4, 4], [23, 19, 4, 4]],
};
const FRONT_HAIR = {
  "hair-00": [],
  "hair-01": [[7, 5, 18, 5], [6, 8, 3, 6], [9, 4, 14, 2], [12, 9, 3, 3]],
  "hair-02": [[7, 5, 18, 5], [9, 4, 14, 2]],
  "hair-03": [[7, 7, 18, 5], [6, 5, 5, 5], [12, 3, 5, 6], [18, 5, 6, 5], [6, 10, 3, 7], [23, 10, 3, 7]],
  "hair-04": [[7, 7, 18, 4], [8, 4, 4, 4], [12, 2, 4, 6], [16, 4, 4, 4], [20, 3, 4, 5]],
  "hair-05": [[7, 5, 18, 4], [6, 8, 3, 5], [9, 8, 5, 4], [14, 9, 5, 3], [19, 8, 6, 4]],
  "hair-06": [[7, 5, 18, 5], [6, 8, 4, 14], [22, 8, 4, 14], [9, 4, 14, 2], [10, 9, 5, 3]],
  "hair-07": [[7, 5, 18, 5], [6, 8, 3, 8], [9, 4, 14, 2], [23, 5, 5, 7], [26, 10, 3, 9]],
  "hair-08": [[7, 6, 18, 5], [5, 3, 6, 6], [21, 3, 6, 6], [9, 4, 14, 3]],
  "hair-09": [[7, 5, 18, 5], [6, 8, 3, 14], [23, 8, 3, 14], [9, 4, 14, 2]],
  "hair-10": [[7, 5, 18, 5], [5, 8, 4, 14], [23, 8, 4, 14], [9, 4, 14, 2], [9, 9, 5, 3]],
};

const HAIR_FX = {
  electric_blue: { color: "#3DD9FF" },
  toxic_green: { color: "#7CFF4F" },
  sunset_fade: { gradient: ["#FF4DA6", "#FF9A3D"] },
};

// Full sets change the colours and add effects
const SETS = {
  sakesnake: { bg: "jungle", skinPattern: ["scales"], shadow: "#24542F", hair: "#1E4D2B", eyes: "eyes-snake", shirt: "#122A1A", snake: true },
  ghost: { bg: "ghost", skin: "#DDE6F5", shadow: "#B4C2DE", hair: "#F5F7FF", eyes: "hollow", shirt: "#9AA6C4", effect: "ghost" },
  glitch: { bg: "glitchbg", eyes: "eyes-glitch", shirt: "#1E1E2A", effect: "glitch" },
  cosmic: { bg: "cosmos", skinPattern: ["cosmic"], shadow: "#241460", hair: "#E0D4FF", eyes: "eyes-galaxy", shirt: "#1C1660", faceStars: true },
};

const TWINKLE_SKY = [[3, 4], [8, 2], [14, 1], [20, 5], [2, 11], [29, 10], [4, 24], [28, 22], [30, 15], [1, 18]];
const TWINKLE_COSMOS = [[2, 3], [9, 1], [27, 4], [30, 12], [1, 15], [3, 27], [29, 26], [23, 1]];
const FACE_STARS = [[9, 9], [22, 9], [14, 8], [17, 11], [9, 18], [22, 18], [16, 22], [11, 10]];

const delay = (s) => ({ animationDelay: `${s}s` });

function computeLook(a) {
  const skinOption = AVATAR_OPTIONS.skin.find((x) => x.id === a.skin) || AVATAR_OPTIONS.skin[2];
  const look = {
    skin: skinOption.color,
    shadow: skinOption.shadow,
    hair: a.hairColor || "#302522",
    hairGradient: null,
    shirt: "#4B352A",
    eyes: a.eyes,
    eyeColor: null,
    acc: a.accessories,
    accColors: null,
    bg: a.background || null,
    bgColors: null,
    aura: a.aura || null,
    auraColors: null,
    frame: a.frame || null,
    skinPattern: null,
    snake: false,
    effect: null,
    faceStars: false,
  };

  const fx = HAIR_FX[a.hairFx];
  if (fx && fx.color) look.hair = fx.color;
  if (fx && fx.gradient) look.hairGradient = fx.gradient;

  const set = a.set === "mythic" ? mythicLook(a.mythicSeed || "mennist") : SETS[a.set];
  if (set) {
    Object.keys(set).forEach((key) => {
      if (key === "bg") {
        if (!a.background) look.bg = set.bg;
      } else if (key === "aura") {
        if (!a.aura) look.aura = set.aura;
      } else if (key === "eyes") {
        look.eyes = set.eyes;
      } else if (key === "acc") {
        if (!a.accessories || a.accessories === "accessory-00") look.acc = set.acc;
      } else {
        look[key] = set[key];
      }
    });
    if (set.hair) look.hairGradient = null;
  }
  return look;
}

export default function Avatar({ avatar, size = 96, className = "", title = "Avatar" }) {
  const rawId = useId();
  const uid = "av" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const a = { ...DEFAULT_AVATAR, ...(avatar || {}) };
  const look = computeLook(a);
  const feminine = a.style === "feminine";

  const defs = [];
  let skinPaint = look.skin;
  if (look.skinPattern) {
    const [kind, c1, c2, c3] = look.skinPattern;
    skinPaint = `url(#${uid}-skin)`;
    if (kind === "cosmic") {
      defs.push(
        <linearGradient key="skin" id={`${uid}-skin`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B2A9E" /><stop offset=".5" stopColor="#6A2FB8" /><stop offset="1" stopColor="#1C1660" />
        </linearGradient>
      );
    } else {
      defs.push(<SkinPattern key="skin" id={`${uid}-skin`} kind={kind} c1={c1} c2={c2} c3={c3} />);
    }
  }
  let hairPaint = look.hair;
  if (look.hairGradient) {
    hairPaint = `url(#${uid}-hair)`;
    defs.push(
      <linearGradient key="hair" id={`${uid}-hair`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={look.hairGradient[0]} /><stop offset="1" stopColor={look.hairGradient[1]} />
      </linearGradient>
    );
  }
  const browColor = look.hairGradient ? look.hairGradient[1] : look.hair;

  // Draws every part of the person. `mono` repaints all of it in one colour (glitch copies).
  const drawBody = (mono) => {
    const R = (arr, fill, extra = {}) => arr.map(([x, y, w, h], i) => (
      <rect key={`${x}-${y}-${w}-${h}-${i}`} x={x} y={y} width={w} height={h} fill={mono || fill} {...extra} />
    ));
    const parts = [];
    if (BACK_HAIR[a.hair]) {
      parts.push(<g key="backhair">{R([[6, 7, 3, 15], [23, 7, 3, 15], ...BACK_HAIR[a.hair]], hairPaint)}</g>);
    }
    parts.push(
      <g key="neck">
        {R([[12, 23, 8, 5]], skinPaint)}
        {R([[12, 26, 8, 2]], look.shadow)}
        {R([[7, 28, 18, 4], [10, 27, 12, 2]], look.shirt)}
      </g>,
      <g key="face">
        {R([[5, 12, 3, 6], [24, 12, 3, 6], [8, 7, 16, 16], [6, 10, 2, 10], [24, 10, 2, 10]], skinPaint)}
        {R([[8, 21, 16, 2], [10, 23, 12, 1]], look.shadow)}
      </g>
    );
    if (look.faceStars && !mono) {
      parts.push(<g key="stars">{FACE_STARS.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="1" height="1" fill="#E9DFFF" className="mav-twinkle" style={delay(i * 0.33)} />
      ))}</g>);
    }
    parts.push(<g key="fronthair">{R(FRONT_HAIR[a.hair] || [], hairPaint)}</g>);
    parts.push(<g key="brows">{R([[9, 11, 5, 1], [18, 11, 5, 1]], browColor)}</g>);
    parts.push(<g key="eyes">{drawEyes(look.eyes, look.eyeColor, R, mono)}</g>);
    parts.push(<g key="nose">{drawNose(a.nose, look.shadow, R)}</g>);
    parts.push(<g key="mouth">{drawMouth(a.mouth, R)}</g>);
    parts.push(<g key="beard">{drawBeard(a.facialHair, hairPaint, R)}</g>);
    parts.push(<g key="acc">{drawAccessory(look.acc, look.accColors, R, mono)}</g>);
    if (feminine) {
      parts.push(<g key="cheek" opacity="0.7">{R([[9, 17, 3, 1], [20, 17, 3, 1]], "#D77B79")}</g>);
    }
    if (look.snake) parts.push(<g key="snake">{drawSnake(R, mono)}</g>);
    return parts;
  };

  let body;
  if (look.effect === "ghost") {
    body = <g className="mav-ghost">{drawBody()}</g>;
  } else if (look.effect === "glitch") {
    body = (
      <>
        <g className="mav-gR" style={{ mixBlendMode: "screen" }}>{drawBody("#FF2E55")}</g>
        <g className="mav-gC" style={{ mixBlendMode: "screen" }}>{drawBody("#22E1FF")}</g>
        <g className="mav-gMain">{drawBody()}</g>
        <g className="mav-band">
          <rect x="0" y="13" width="32" height="1" fill="#22E1FF" />
          <rect x="0" y="19" width="32" height="2" fill="#22E1FF" />
          <rect x="0" y="9" width="32" height="1" fill="#FF2E55" />
        </g>
      </>
    );
  } else {
    body = drawBody();
  }

  return (
    <svg
      className={`mennist-avatar ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      style={{ imageRendering: "pixelated", shapeRendering: "crispEdges" }}
    >
      <title>{title}</title>
      {defs.length > 0 && <defs>{defs}</defs>}
      {look.bg && drawBackground(look.bg, look.bgColors, uid)}
      {look.aura && drawAura(look.aura, look.auraColors)}
      {body}
      {look.frame && drawFrame(look.frame, uid)}
    </svg>
  );
}

function SkinPattern({ id, kind, c1 = "#3F8F4F", c2 = "#2C6B3A", c3 = "#64B86F" }) {
  if (kind === "stripes") {
    return (
      <pattern id={id} width="1" height="3" patternUnits="userSpaceOnUse">
        <rect width="1" height="3" fill={c1} /><rect width="1" height="1" fill={c2} />
      </pattern>
    );
  }
  if (kind === "dots") {
    return (
      <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill={c1} /><rect x="1" y="1" width="1" height="1" fill={c2} /><rect x="3" y="3" width="1" height="1" fill={c2} />
      </pattern>
    );
  }
  if (kind === "circuit") {
    return (
      <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill={c1} /><rect x="0" y="2" width="4" height="1" fill={c2} />
        <rect x="3" y="2" width="1" height="4" fill={c2} /><rect x="2" y="1" width="1" height="1" fill={c2} />
      </pattern>
    );
  }
  return (
    <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill={c1} />
      <rect x="0" y="0" width="2" height="1" fill={c2} /><rect x="2" y="2" width="2" height="1" fill={c2} />
      <rect x="1" y="1" width="1" height="1" fill={c3} /><rect x="3" y="3" width="1" height="1" fill={c3} />
    </pattern>
  );
}

function drawEyes(kind, color, R, mono) {
  switch (kind) {
    case "eyes-02": return R([[10, 14, 4, 2], [18, 14, 4, 2]], "#302522");
    case "eyes-03": return R([[10, 14, 4, 1], [18, 14, 4, 1]], "#302522");
    case "eyes-04": return <>{R([[9, 12, 5, 5], [18, 12, 5, 5]], "#FFF7E8")}{R([[11, 14, 2, 2], [20, 14, 2, 2]], "#302522")}</>;
    case "eyes-blood": return (
      <>
        {R([[10, 13, 3, 3], [19, 13, 3, 3]], "#2A0B0B")}
        {R([[11, 14, 2, 2], [20, 14, 2, 2]], "#FF2E2E")}
        {!mono && <g className="mav-glow">{R([[9, 13, 1, 2], [22, 13, 1, 2], [11, 13, 2, 1], [20, 13, 2, 1]], "#FF6B6B")}</g>}
      </>
    );
    case "eyes-galaxy": return (
      <>
        {R([[10, 13, 3, 3], [19, 13, 3, 3]], "#1B1240")}
        {R([[11, 14, 2, 2], [20, 14, 2, 2]], "#8B5CF6")}
        {!mono && <>
          <rect x="12" y="14" width="1" height="1" fill="#FFFFFF" className="mav-twinkle" />
          <rect x="20" y="15" width="1" height="1" fill="#FFFFFF" className="mav-twinkle" style={delay(1.1)} />
        </>}
      </>
    );
    case "eyes-snake": return <>{R([[10, 13, 3, 3], [19, 13, 3, 3]], "#F4D03F")}{R([[11, 13, 1, 3], [20, 13, 1, 3]], "#0E0E0E")}</>;
    case "eyes-blink": return (
      <g className={mono ? "" : "mav-blink"}>
        {R([[10, 13, 3, 3], [19, 13, 3, 3]], "#FFF7E8")}{R([[11, 14, 2, 2], [20, 14, 2, 2]], "#302522")}
      </g>
    );
    case "eyes-glitch": return (
      <>
        {R([[10, 13, 3, 3], [19, 13, 3, 3]], "#0E0E12")}
        {mono ? R([[11, 14, 2, 2], [20, 14, 2, 2]], mono)
          : <><rect x="11" y="14" width="2" height="2" className="mav-eyeshift" /><rect x="20" y="14" width="2" height="2" className="mav-eyeshift" /></>}
      </>
    );
    case "hollow": return <>{R([[10, 13, 3, 3], [19, 13, 3, 3]], "#171728")}{R([[11, 14, 1, 1], [20, 14, 1, 1]], "#8FA3FF")}</>;
    case "custom": return (
      <>
        {R([[10, 13, 3, 3], [19, 13, 3, 3]], "#0E0E12")}
        {R([[11, 14, 2, 2], [20, 14, 2, 2]], color)}
        {!mono && <g className="mav-glow">{R([[10, 13, 1, 1], [21, 13, 1, 1]], color)}</g>}
      </>
    );
    default: return <>{R([[10, 13, 3, 3], [19, 13, 3, 3]], "#FFF7E8")}{R([[11, 14, 2, 2], [20, 14, 2, 2]], "#302522")}</>;
  }
}

function drawNose(kind, shadow, R) {
  if (kind === "nose-02") return R([[14, 16, 4, 2]], shadow);
  if (kind === "nose-03") return R([[15, 15, 2, 2], [14, 17, 4, 1]], shadow);
  return R([[15, 15, 2, 2]], shadow);
}

function drawMouth(kind, R) {
  if (kind === "mouth-02") return R([[13, 20, 6, 1]], "#713D39");
  if (kind === "mouth-03") return R([[13, 20, 2, 1], [15, 19, 2, 1], [17, 20, 2, 1]], "#713D39");
  if (kind === "mouth-04") return <>{R([[11, 19, 10, 2]], "#713D39")}{R([[13, 19, 6, 1]], "#FFF7E8")}</>;
  return R([[12, 19, 8, 1], [13, 20, 6, 1]], "#713D39");
}

function drawBeard(kind, hair, R) {
  if (kind === "beard-01") return R([[12, 18, 3, 2], [17, 18, 3, 2]], hair);
  if (kind === "beard-02") return R([[9, 19, 3, 3], [12, 21, 8, 2], [20, 19, 3, 3]], hair);
  if (kind === "beard-03") return R([[8, 18, 3, 4], [11, 20, 10, 4], [21, 18, 3, 4]], hair);
  return null;
}

function drawAccessory(kind, colors, R, mono) {
  const c = colors || [];
  switch (kind) {
    case "accessory-01": return (
      <g fill="none" stroke={mono || "#302522"} strokeWidth="1">
        <rect x="8" y="12" width="7" height="5" /><rect x="17" y="12" width="7" height="5" />
        <path d="M15 13 H17 M6 13 H8 M24 13 H26" />
      </g>
    );
    case "accessory-02": return R([[7, 7, 18, 2]], "#8C4B9B");
    case "accessory-03": return R([[6, 17, 2, 2], [24, 17, 2, 2]], "#F4C542");
    case "accessory-04": return R([[6, 6, 20, 3], [9, 3, 14, 4], [5, 8, 22, 2]], "#C34B43");
    case "accessory-05": return R([[5, 4, 5, 5], [10, 6, 3, 3], [22, 4, 5, 5], [19, 6, 3, 3]], "#E86A9A");
    case "acc-crown": return (
      <>
        {R([[9, 3, 14, 3], [9, 1, 2, 2], [15, 0, 2, 3], [21, 1, 2, 2], [12, 2, 1, 1], [19, 2, 1, 1]], c[0] || "#F4C542")}
        {R([[15, 4, 2, 1]], c[1] || "#E5484D")}
        {R([[11, 4, 1, 1], [20, 4, 1, 1]], "#4DB4FF")}
      </>
    );
    case "acc-halo": return (
      <g className={mono ? "" : "mav-bob"}>
        {R([[10, 0, 12, 1], [9, 1, 1, 1], [22, 1, 1, 1], [10, 2, 12, 1]], c[0] || "#FFE89A")}
      </g>
    );
    case "acc-horns": return (
      <>
        {R([[8, 4, 2, 2], [7, 2, 2, 3], [6, 0, 2, 2], [22, 4, 2, 2], [23, 2, 2, 3], [24, 0, 2, 2]], c[0] || "#C0262D")}
        {R([[6, 0, 1, 1], [25, 0, 1, 1]], "#FF8A8A")}
      </>
    );
    case "acc-visor": return (
      <>
        {R([[7, 12, 18, 5]], "#0E0E12")}
        {R([[8, 13, 16, 3]], c[0] || "#22D3EE")}
        {!mono && <rect x="8" y="13" width="2" height="3" fill="#FFFFFF" opacity=".85" className="mav-scan" />}
      </>
    );
    default: return null;
  }
}

function drawSnake(R, mono) {
  const segs = [[5, 27], [7, 26], [9, 26], [11, 27], [13, 28], [15, 28], [17, 28], [19, 27], [21, 26], [23, 26], [25, 27]];
  return (
    <>
      {segs.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="2" height="2" fill={mono || (i % 2 ? "#2A8A3E" : "#3FBF5A")}
          className={mono ? "" : "mav-wave"} style={delay(i * 0.11)} />
      ))}
      {R([[26, 25, 3, 3]], "#3FBF5A")}
      {R([[27, 25, 1, 1]], "#F4D03F")}
      {!mono && <rect x="29" y="26" width="2" height="1" fill="#E5484D" className="mav-tongue" />}
      {R([[3, 28, 2, 1]], "#2A8A3E")}
    </>
  );
}

function drawBackground(kind, colors, uid) {
  const rect = (fill) => <rect width="32" height="32" fill={fill} />;
  switch (kind) {
    case "night": return (
      <g>
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#090B26" /><stop offset="1" stopColor="#1E1550" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" fill={`url(#${uid}-sky)`} />
        <rect x="25" y="3" width="3" height="3" fill="#F5F1C8" />
        {TWINKLE_SKY.map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="1" height="1" fill="#FFFFFF" className="mav-twinkle" style={delay(i * 0.37)} />
        ))}
      </g>
    );
    case "code": return (
      <g>
        {rect("#03170A")}
        {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 30].map((x, i) => (
          <g key={x} className="mav-fall" style={{ animationDelay: `-${(i * 0.41).toFixed(2)}s` }}>
            {[0, 1, 2, 3, 4].map((k) => (
              <rect key={k} x={x} y={k * 3} width="1" height={k % 2 ? 1 : 2} fill="#22C55E" opacity={(1 - k * 0.18).toFixed(2)} />
            ))}
          </g>
        ))}
      </g>
    );
    case "jungle": return (
      <g>{rect("#0B1A11")}
        {[[0, 26, 4, 6], [28, 24, 4, 8], [2, 22, 2, 4], [29, 20, 2, 4]].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} fill="#14361F" />)}
      </g>
    );
    case "ghost": return <g>{rect("#0F1220")}<rect x="2" y="26" width="28" height="6" fill="#151A2E" /></g>;
    case "glitchbg": return rect("#0A0A10");
    case "cosmos": return (
      <g>{rect("#07061A")}
        {TWINKLE_COSMOS.map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="1" height="1" fill="#C9B8FF" className="mav-twinkle" style={delay(i * 0.5)} />
        ))}
      </g>
    );
    case "gradient": return (
      <g>
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={colors[0]} /><stop offset="1" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <rect width="32" height="32" fill={`url(#${uid}-bg)`} />
      </g>
    );
    default: return null;
  }
}

function drawAura(kind, colors) {
  const c = colors || [];
  const R = (arr, fill) => arr.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />);
  if (kind === "fire") {
    return (
      <g>
        <g className="mav-flick">{R([[4, 9, 3, 7], [25, 9, 3, 7], [6, 5, 3, 5], [23, 5, 3, 5], [10, 2, 3, 4], [19, 2, 3, 4], [14, 0, 4, 4], [3, 15, 3, 8], [26, 15, 3, 8]], c[0] || "#FF7A1A")}</g>
        <g className="mav-flick2">{R([[5, 11, 2, 4], [25, 11, 2, 4], [7, 6, 2, 3], [23, 6, 2, 3], [11, 3, 2, 2], [19, 3, 2, 2], [15, 1, 2, 3]], c[1] || "#FFD23F")}</g>
      </g>
    );
  }
  if (kind === "frost") {
    return (
      <g>
        {R([[3, 10, 2, 2], [27, 10, 2, 2], [2, 16, 2, 2], [28, 16, 2, 2], [6, 3, 2, 2], [24, 3, 2, 2], [15, 0, 2, 2], [4, 22, 2, 2], [26, 22, 2, 2]], c[0] || "#9BE7FF")}
        {[[4, 9], [28, 9], [3, 15], [29, 15], [7, 2], [25, 2], [16, 0], [5, 21], [27, 21]].map(([x, y], i) => (
          <rect key={`t${i}`} x={x} y={y} width="1" height="1" fill={c[1] || "#E9FBFF"} className="mav-twinkle" style={delay(i * 0.3)} />
        ))}
      </g>
    );
  }
  if (kind === "shadow") {
    return (
      <g className="mav-pulse">
        {R([[3, 7, 26, 18], [5, 4, 22, 3], [1, 12, 30, 10]], c[0] || "#3B1458")}
        {R([[4, 9, 2, 4], [26, 9, 2, 4], [9, 4, 3, 2], [20, 4, 3, 2]], c[1] || "#6B2FA0")}
      </g>
    );
  }
  return null;
}

function drawFrame(kind, uid) {
  if (kind === "gold") {
    return (
      <g>
        <rect x=".5" y=".5" width="31" height="31" fill="none" stroke="#F4C542" strokeWidth="1" />
        <rect x="1.5" y="1.5" width="29" height="29" fill="none" stroke="#9C7413" strokeWidth="1" />
        {[[0, 0], [29, 0], [0, 29], [29, 29]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" fill="#F4C542" />)}
      </g>
    );
  }
  if (kind === "holo") {
    return (
      <g>
        <defs>
          <linearGradient id={`${uid}-holo`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4DB4FF" className="mav-holo" /><stop offset="1" stopColor="#FF4DD8" className="mav-holo2" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="30" height="30" fill="none" stroke={`url(#${uid}-holo)`} strokeWidth="2" />
      </g>
    );
  }
  if (kind === "snake") {
    return (
      <g>
        <defs><SkinPattern id={`${uid}-frame`} kind="scales" /></defs>
        <rect x="1" y="1" width="30" height="30" fill="none" stroke={`url(#${uid}-frame)`} strokeWidth="2" />
      </g>
    );
  }
  return null;
}
