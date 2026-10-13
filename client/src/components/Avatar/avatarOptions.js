export const AVATAR_OPTIONS = {
  style: [
    { id: "neutral", label: "Neutral" },
    { id: "masculine", label: "Masculine" },
    { id: "feminine", label: "Feminine" },
  ],
  skin: [
    { id: "skin-01", label: "Light", color: "#F6D5B8", shadow: "#DDAF91" },
    { id: "skin-02", label: "Fair", color: "#E9B995", shadow: "#C98D69" },
    { id: "skin-03", label: "Medium", color: "#C88960", shadow: "#A66B49" },
    { id: "skin-04", label: "Brown", color: "#965C3B", shadow: "#75452F" },
    { id: "skin-05", label: "Deep", color: "#623B2D", shadow: "#45271F" },
  ],
  hair: [
    { id: "hair-00", label: "Bald" },
    { id: "hair-01", label: "Short" },
    { id: "hair-02", label: "Long" },
    { id: "hair-03", label: "Curly" },
    { id: "hair-04", label: "Spiky" },
    { id: "hair-05", label: "Fringe" },
    { id: "hair-06", label: "Bob" },
    { id: "hair-07", label: "Ponytail" },
    { id: "hair-08", label: "Twin buns" },
    { id: "hair-09", label: "Braids" },
    { id: "hair-10", label: "Long waves" },
  ],
  eyes: [
    { id: "eyes-01", label: "Round" },
    { id: "eyes-02", label: "Happy" },
    { id: "eyes-03", label: "Sleepy" },
    { id: "eyes-04", label: "Wide" },
  ],
  nose: [
    { id: "nose-01", label: "Small" },
    { id: "nose-02", label: "Wide" },
    { id: "nose-03", label: "Pixel" },
  ],
  mouth: [
    { id: "mouth-01", label: "Smile" },
    { id: "mouth-02", label: "Neutral" },
    { id: "mouth-03", label: "Sad" },
    { id: "mouth-04", label: "Grin" },
  ],
  accessories: [
    { id: "accessory-00", label: "None" },
    { id: "accessory-01", label: "Glasses" },
    { id: "accessory-02", label: "Headband" },
    { id: "accessory-03", label: "Earrings" },
    { id: "accessory-04", label: "Cap" },
    { id: "accessory-05", label: "Bow" },
  ],
  facialHair: [
    { id: "beard-00", label: "None" },
    { id: "beard-01", label: "Mustache" },
    { id: "beard-02", label: "Short beard" },
    { id: "beard-03", label: "Full beard" },
  ],
};

export const HAIR_COLORS = [
  { id: "black", label: "Black", color: "#302522" },
  { id: "brown", label: "Brown", color: "#5A3825" },
  { id: "blonde", label: "Blonde", color: "#A86E35" },
  { id: "red", label: "Red", color: "#B84A42" },
  { id: "silver", label: "Silver", color: "#D6D6D6" },
  { id: "purple", label: "Purple", color: "#6C5CE7" },
  { id: "teal", label: "Teal", color: "#22A699" },
];

export const DEFAULT_AVATAR = {
  version: 1,
  style: "neutral",
  skin: "skin-03",
  hair: "hair-01",
  hairColor: "#302522",
  eyes: "eyes-01",
  nose: "nose-01",
  mouth: "mouth-01",
  accessories: "accessory-00",
  facialHair: "beard-00",
};

export const AVATAR_CATEGORIES = [
  { id: "style", label: "Style" },
  { id: "skin", label: "Skin" },
  { id: "hair", label: "Hair" },
  { id: "eyes", label: "Eyes" },
  { id: "nose", label: "Nose" },
  { id: "mouth", label: "Mouth" },
  { id: "accessories", label: "Accessories" },
  { id: "facialHair", label: "Facial hair" },
];
