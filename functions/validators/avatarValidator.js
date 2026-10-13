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

const ALLOWED_FIELDS = new Set([
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

  for (const [field, allowedValues] of Object.entries(ALLOWED_AVATAR_VALUES)) {
    if (input[field] === undefined) {
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

  avatar.version = 1;

  return {
    valid: true,
    avatar,
  };
}

module.exports = {DEFAULT_AVATAR, validateAvatar};
