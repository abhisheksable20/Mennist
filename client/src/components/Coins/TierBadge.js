import { TIER_LABELS } from "./coinApi";

// Small badge shown next to premium avatars ("Legendary", "Mythic #022")
export default function TierBadge({ tier, edition, className = "" }) {
  if (!tier || !TIER_LABELS[tier]) return null;
  const label = tier === "mythic" && edition
    ? `Mythic #${String(edition).padStart(3, "0")}`
    : TIER_LABELS[tier];
  return <span className={`tier-badge tier-${tier} ${className}`.trim()}>{label}</span>;
}
