const DEFAULT_AVATAR = {
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

const ALLOWED_AVATAR_VALUES = {
  style: new Set(["neutral", "masculine", "feminine"]),

  skin: new Set([
    "skin-01",
    "skin-02",
    "skin-03",
    "skin-04",
    "skin-05",
  ]),

  hair: new Set([
    "hair-00",
    "hair-01",
    "hair-02",
    "hair-03",
    "hair-04",
    "hair-05",
    "hair-06",
    "hair-07",
    "hair-08",
    "hair-09",
    "hair-10",
  ]),

  eyes: new Set([
    "eyes-01",
    "eyes-02",
    "eyes-03",
    "eyes-04",
  ]),

  nose: new Set([
    "nose-01",
    "nose-02",
    "nose-03",
  ]),

  mouth: new Set([
    "mouth-01",
    "mouth-02",
    "mouth-03",
    "mouth-04",
  ]),

  accessories: new Set([
    "accessory-00",
    "accessory-01",
    "accessory-02",
    "accessory-03",
    "accessory-04",
    "accessory-05",
  ]),

  facialHair: new Set([
    "beard-00",
    "beard-01",
    "beard-02",
    "beard-03",
  ]),
};

const ALLOWED_HAIR_COLORS = new Set([
  "#302522",
  "#5A3825",
  "#A86E35",
  "#B84A42",
  "#D6D6D6",
  "#6C5CE7",
  "#22A699",
]);

// Premium items from the coin shop: slot -> value -> shop item id
const {SHOP_ITEMS} = require("../config/coins");
const PREMIUM = {};
Object.keys(SHOP_ITEMS).forEach((id) => {
  const item = SHOP_ITEMS[id];
  if (item.category === "avatar") {
    PREMIUM[item.slot] = PREMIUM[item.slot] || {};
    PREMIUM[item.slot][item.value] = id;
  }
});
// Slots that only exist for premium items (empty = not worn)
const PREMIUM_ONLY_SLOTS = ["hairFx", "aura", "background", "frame", "set"];
// Filled in by the server when reading; ignored when saving
const SERVER_FIELDS = new Set(["tier", "mythicSeed", "mythicEdition"]);
const TIER_RANK = {rare: 1, epic: 2, legendary: 3, mythic: 4};

const ALLOWED_FIELDS = new Set([
  ...PREMIUM_ONLY_SLOTS,
  ...SERVER_FIELDS,
  "version",
  "style",
  "skin",
  "hair",
  "hairColor",
  "eyes",
  "nose",
  "mouth",
  "accessories",
  "facialHair",
]);

function validateAvatar(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      valid: false,
      message: "Avatar must be an object.",
    };
  }

  const unknownFields = Object.keys(input).filter((field) => !ALLOWED_FIELDS.has(field));

  if (unknownFields.length > 0) {
    return {
      valid: false,
      message: `Unsupported avatar field: ${unknownFields[0]}`,
    };
  }

  const avatar = {...DEFAULT_AVATAR};
  const premiumItems = [];

  for (const [field, allowedValues] of Object.entries(ALLOWED_AVATAR_VALUES)) {
    if (input[field] === undefined) {
      continue;
    }

    // Premium eyes / accessories from the shop
    if (PREMIUM[field] && typeof input[field] === "string" && PREMIUM[field][input[field]]) {
      avatar[field] = input[field];
      premiumItems.push(PREMIUM[field][input[field]]);
      continue;
    }

    if (typeof input[field] !== "string" || !allowedValues.has(input[field])) {
      return {
        valid: false,
        message: `Invalid avatar ${field}.`,
      };
    }

    avatar[field] = input[field];
  }

  if (input.hairColor !== undefined) {
    if (typeof input.hairColor !== "string" || !ALLOWED_HAIR_COLORS.has(input.hairColor)) {
      return {
        valid: false,
        message: "Invalid avatar hairColor.",
      };
    }

    avatar.hairColor = input.hairColor;
  }

  for (const slot of PREMIUM_ONLY_SLOTS) {
    const value = input[slot];
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (typeof value !== "string" || !PREMIUM[slot] || !PREMIUM[slot][value]) {
      return {
        valid: false,
        message: `Invalid avatar ${slot}.`,
      };
    }
    avatar[slot] = value;
    premiumItems.push(PREMIUM[slot][value]);
  }

  avatar.version = 1;

  return {
    valid: true,
    avatar,
    premiumItems,
  };
}

// Highest tier among the premium items worn, or null for a free avatar
function avatarTier(premiumItems) {
  let best = null;
  (premiumItems || []).forEach((id) => {
    const tier = SHOP_ITEMS[id] && SHOP_ITEMS[id].tier;
    if (tier && (!best || TIER_RANK[tier] > TIER_RANK[best])) {
      best = tier;
    }
  });
  return best;
}

module.exports = {DEFAULT_AVATAR, validateAvatar, avatarTier};
