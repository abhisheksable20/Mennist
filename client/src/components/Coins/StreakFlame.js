// Pixel flame for streaks. `big` draws the detailed version used in the reward popup.
export default function StreakFlame({ size = 16, big = false, dim = false, className = "" }) {
  const orange = dim ? "#5A4636" : "#FF7A1A";
  const yellow = dim ? "#6B5B3E" : "#FFD23F";
  if (big) {
    return (
      <svg className={`streak-flame ${className}`.trim()} width={size} height={size} viewBox="0 0 16 16" aria-hidden="true"
        style={{ shapeRendering: "crispEdges", flex: "none" }}>
        <g className="streak-flame-flicker">
          <rect x="7" y="1" width="2" height="2" fill={orange} />
          <rect x="6" y="3" width="4" height="2" fill={orange} />
          <rect x="4" y="4" width="2" height="2" fill={orange} />
          <rect x="5" y="5" width="7" height="2" fill={orange} />
          <rect x="3" y="7" width="10" height="5" fill={orange} />
          <rect x="4" y="12" width="8" height="2" fill={orange} />
          <rect x="6" y="14" width="4" height="1" fill={orange} />
          <rect x="6" y="8" width="4" height="4" fill={yellow} />
          <rect x="7" y="7" width="2" height="1" fill={yellow} />
          <rect x="7" y="12" width="2" height="1" fill={yellow} />
        </g>
      </svg>
    );
  }
  return (
    <svg className={`streak-flame ${className}`.trim()} width={size} height={size} viewBox="0 0 8 8" aria-hidden="true"
      style={{ shapeRendering: "crispEdges", flex: "none" }}>
      <rect x="3" y="0" width="2" height="2" fill={orange} />
      <rect x="2" y="2" width="4" height="2" fill={orange} />
      <rect x="1" y="3" width="6" height="4" fill={orange} />
      <rect x="2" y="7" width="4" height="1" fill={orange} />
      <rect x="3" y="4" width="2" height="3" fill={yellow} />
    </svg>
  );
}
