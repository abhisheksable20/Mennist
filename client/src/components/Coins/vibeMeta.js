import sadSVG from "../../assets/sad_svg.svg";
import funnySVG from "../../assets/funny_svg.svg";
import emotionalSVG from "../../assets/emotional_svg.svg";
import wholesomeSVG from "../../assets/wholesome_svg.svg";
import toxicSVG from "../../assets/toxic_svg.svg";
import racistSVG from "../../assets/racist_svg.svg";
import relatableSVG from "../../assets/relatable_svg.svg";

// Vibe Check options in the order they appear on a post
export const VIBES = [
  { id: "funny", label: "Funny", icon: funnySVG },
  { id: "relatable", label: "Relatable", icon: relatableSVG },
  { id: "emotional", label: "Emotional", icon: emotionalSVG },
  { id: "wholesome", label: "Wholesome", icon: wholesomeSVG },
  { id: "sad", label: "Sad", icon: sadSVG, alert: true },
  { id: "toxic", label: "Toxic", icon: toxicSVG, alert: true },
  { id: "racist", label: "Racist", icon: racistSVG, alert: true },
];
