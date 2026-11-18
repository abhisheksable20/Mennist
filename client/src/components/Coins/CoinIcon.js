// Pixel coin used next to every coin amount
export default function CoinIcon({ size = 16, className = "" }) {
  return (
    <svg className={`coin-icon ${className}`.trim()} width={size} height={size} viewBox="0 0 8 8" aria-hidden="true"
      style={{ shapeRendering: "crispEdges", flex: "none" }}>
      <rect x="2" y="0" width="4" height="8" fill="#F4C542" />
      <rect x="0" y="2" width="8" height="4" fill="#F4C542" />
      <rect x="1" y="1" width="6" height="6" fill="#F4C542" />
      <rect x="3" y="2" width="2" height="4" fill="#9C7413" />
    </svg>
  );
}
