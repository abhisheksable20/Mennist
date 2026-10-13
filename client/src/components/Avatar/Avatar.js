import { AVATAR_OPTIONS, DEFAULT_AVATAR } from "./avatarOptions";

export default function Avatar({ avatar, size = 96, className = "", title = "Avatar" }) {
  const a = { ...DEFAULT_AVATAR, ...(avatar || {}) };
  const skinOption = AVATAR_OPTIONS.skin.find((x) => x.id === a.skin) || AVATAR_OPTIONS.skin[2];
  const skin = skinOption.color;
  const shadow = skinOption.shadow;
  const hair = a.hairColor || "#302522";
  const feminine = a.style === "feminine";

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
      {/* Hair behind face: long, bob, ponytail, braids, waves */}
      {["hair-02", "hair-06", "hair-07", "hair-09", "hair-10"].includes(a.hair) && (
        <g fill={hair}>
          <rect x="6" y="7" width="3" height="15" />
          <rect x="23" y="7" width="3" height="15" />
          {a.hair === "hair-06" && <><rect x="6" y="16" width="4" height="7" /><rect x="22" y="16" width="4" height="7" /></>}
          {a.hair === "hair-07" && <><rect x="23" y="5" width="5" height="7" /><rect x="26" y="10" width="3" height="9" /></>}
          {a.hair === "hair-09" && <><rect x="5" y="13" width="3" height="9" /><rect x="24" y="13" width="3" height="9" /><rect x="5" y="21" width="2" height="2" /><rect x="25" y="21" width="2" height="2" /></>}
          {a.hair === "hair-10" && <><rect x="5" y="10" width="3" height="12" /><rect x="24" y="10" width="3" height="12" /><rect x="5" y="19" width="4" height="4" /><rect x="23" y="19" width="4" height="4" /></>}
        </g>
      )}
      {/* Neck and shoulders */}
      <rect x="12" y="23" width="8" height="5" fill={skin} />
      <rect x="12" y="26" width="8" height="2" fill={shadow} />
      <rect x="7" y="28" width="18" height="4" fill="#4B352A" />
      <rect x="10" y="27" width="12" height="2" fill="#4B352A" />
      {/* Ears and face */}
      <rect x="5" y="12" width="3" height="6" fill={skin} />
      <rect x="24" y="12" width="3" height="6" fill={skin} />
      <rect x="8" y="7" width="16" height="16" fill={skin} />
      <rect x="6" y="10" width="2" height="10" fill={skin} />
      <rect x="24" y="10" width="2" height="10" fill={skin} />
      <rect x="8" y="21" width="16" height="2" fill={shadow} />
      <rect x="10" y="23" width="12" height="1" fill={shadow} />
      {/* Front hair styles */}
      {a.hair === "hair-01" && <g fill={hair}><rect x="7" y="5" width="18" height="5" /><rect x="6" y="8" width="3" height="6" /><rect x="9" y="4" width="14" height="2" /><rect x="12" y="9" width="3" height="3" /></g>}
      {a.hair === "hair-02" && <g fill={hair}><rect x="7" y="5" width="18" height="5" /><rect x="9" y="4" width="14" height="2" /></g>}
      {a.hair === "hair-03" && <g fill={hair}><rect x="7" y="7" width="18" height="5" /><rect x="6" y="5" width="5" height="5" /><rect x="12" y="3" width="5" height="6" /><rect x="18" y="5" width="6" height="5" /><rect x="6" y="10" width="3" height="7" /><rect x="23" y="10" width="3" height="7" /></g>}
      {a.hair === "hair-04" && <g fill={hair}><rect x="7" y="7" width="18" height="4" /><rect x="8" y="4" width="4" height="4" /><rect x="12" y="2" width="4" height="6" /><rect x="16" y="4" width="4" height="4" /><rect x="20" y="3" width="4" height="5" /></g>}
      {a.hair === "hair-05" && <g fill={hair}><rect x="7" y="5" width="18" height="4" /><rect x="6" y="8" width="3" height="5" /><rect x="9" y="8" width="5" height="4" /><rect x="14" y="9" width="5" height="3" /><rect x="19" y="8" width="6" height="4" /></g>}
      {a.hair === "hair-06" && <g fill={hair}><rect x="7" y="5" width="18" height="5" /><rect x="6" y="8" width="4" height="14" /><rect x="22" y="8" width="4" height="14" /><rect x="9" y="4" width="14" height="2" /><rect x="10" y="9" width="5" height="3" /></g>}
      {a.hair === "hair-07" && <g fill={hair}><rect x="7" y="5" width="18" height="5" /><rect x="6" y="8" width="3" height="8" /><rect x="9" y="4" width="14" height="2" /><rect x="23" y="5" width="5" height="7" /><rect x="26" y="10" width="3" height="9" /></g>}
      {a.hair === "hair-08" && <g fill={hair}><rect x="7" y="6" width="18" height="5" /><rect x="5" y="3" width="6" height="6" /><rect x="21" y="3" width="6" height="6" /><rect x="9" y="4" width="14" height="3" /></g>}
      {a.hair === "hair-09" && <g fill={hair}><rect x="7" y="5" width="18" height="5" /><rect x="6" y="8" width="3" height="14" /><rect x="23" y="8" width="3" height="14" /><rect x="9" y="4" width="14" height="2" /></g>}
      {a.hair === "hair-10" && <g fill={hair}><rect x="7" y="5" width="18" height="5" /><rect x="5" y="8" width="4" height="14" /><rect x="23" y="8" width="4" height="14" /><rect x="9" y="4" width="14" height="2" /><rect x="9" y="9" width="5" height="3" /></g>}
      {/* Brows and eyes */}
      <rect x="9" y="11" width="5" height="1" fill={hair} />
      <rect x="18" y="11" width="5" height="1" fill={hair} />
      {a.eyes === "eyes-01" && <g><rect x="10" y="13" width="3" height="3" fill="#FFF7E8" /><rect x="19" y="13" width="3" height="3" fill="#FFF7E8" /><rect x="11" y="14" width="2" height="2" fill="#302522" /><rect x="20" y="14" width="2" height="2" fill="#302522" /></g>}
      {a.eyes === "eyes-02" && <g fill="#302522"><rect x="10" y="14" width="4" height="2" /><rect x="18" y="14" width="4" height="2" /></g>}
      {a.eyes === "eyes-03" && <g fill="#302522"><rect x="10" y="14" width="4" height="1" /><rect x="18" y="14" width="4" height="1" /></g>}
      {a.eyes === "eyes-04" && <g><rect x="9" y="12" width="5" height="5" fill="#FFF7E8" /><rect x="18" y="12" width="5" height="5" fill="#FFF7E8" /><rect x="11" y="14" width="2" height="2" fill="#302522" /><rect x="20" y="14" width="2" height="2" fill="#302522" /></g>}
      {/* Nose */}
      {a.nose === "nose-01" && <rect x="15" y="15" width="2" height="2" fill={shadow} />}
      {a.nose === "nose-02" && <rect x="14" y="16" width="4" height="2" fill={shadow} />}
      {a.nose === "nose-03" && <g fill={shadow}><rect x="15" y="15" width="2" height="2" /><rect x="14" y="17" width="4" height="1" /></g>}
      {/* Mouth */}
      {a.mouth === "mouth-01" && <g fill="#713D39"><rect x="12" y="19" width="8" height="1" /><rect x="13" y="20" width="6" height="1" /></g>}
      {a.mouth === "mouth-02" && <rect x="13" y="20" width="6" height="1" fill="#713D39" />}
      {a.mouth === "mouth-03" && <g fill="#713D39"><rect x="13" y="20" width="2" height="1" /><rect x="15" y="19" width="2" height="1" /><rect x="17" y="20" width="2" height="1" /></g>}
      {a.mouth === "mouth-04" && <g><rect x="11" y="19" width="10" height="2" fill="#713D39" /><rect x="13" y="19" width="6" height="1" fill="#FFF7E8" /></g>}
      {/* Facial hair */}
      {a.facialHair === "beard-01" && <g fill={hair}><rect x="12" y="18" width="3" height="2" /><rect x="17" y="18" width="3" height="2" /></g>}
      {a.facialHair === "beard-02" && <g fill={hair}><rect x="9" y="19" width="3" height="3" /><rect x="12" y="21" width="8" height="2" /><rect x="20" y="19" width="3" height="3" /></g>}
      {a.facialHair === "beard-03" && <g fill={hair}><rect x="8" y="18" width="3" height="4" /><rect x="11" y="20" width="10" height="4" /><rect x="21" y="18" width="3" height="4" /></g>}
      {/* Accessories */}
      {a.accessories === "accessory-01" && <g fill="none" stroke="#302522" strokeWidth="1"><rect x="8" y="12" width="7" height="5" /><rect x="17" y="12" width="7" height="5" /><path d="M15 13 H17 M6 13 H8 M24 13 H26" /></g>}
      {a.accessories === "accessory-02" && <rect x="7" y="7" width="18" height="2" fill="#8C4B9B" />}
      {a.accessories === "accessory-03" && <g fill="#F4C542"><rect x="6" y="17" width="2" height="2" /><rect x="24" y="17" width="2" height="2" /></g>}
      {a.accessories === "accessory-04" && <g fill="#C34B43"><rect x="6" y="6" width="20" height="3" /><rect x="9" y="3" width="14" height="4" /><rect x="5" y="8" width="22" height="2" /></g>}
      {a.accessories === "accessory-05" && <g fill="#E86A9A"><rect x="5" y="4" width="5" height="5" /><rect x="10" y="6" width="3" height="3" /><rect x="22" y="4" width="5" height="5" /><rect x="19" y="6" width="3" height="3" /></g>}
      {/* A subtle cheek pixel for feminine style */}
      {feminine && <g fill="#D77B79" opacity="0.7"><rect x="9" y="17" width="3" height="1" /><rect x="20" y="17" width="3" height="1" /></g>}
    </svg>
  );
}
