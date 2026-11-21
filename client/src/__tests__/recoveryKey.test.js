import { formatKeyInput, keyCharCount, findKeyInText, keyGroup, KEY_LENGTH } from "../components/Recovery/recoveryApi";

const KEY = "K7F2-9QXM-4TPD-W8HN-R3JC-6YVA";

describe("recovery key input", () => {
  test("adds dashes every 4 characters and uppercases", () => {
    expect(formatKeyInput("k7f29qxm4t")).toBe("K7F2-9QXM-4T");
  });
  test("drops characters outside the alphabet (0, O, 1, I, symbols, spaces)", () => {
    expect(formatKeyInput("K7F2 0O1I-9Q!XM")).toBe("K7F2-9QXM");
  });
  test("never grows past 24 characters", () => {
    const long = formatKeyInput(KEY + "-ABCD-EFGH");
    expect(keyCharCount(long)).toBe(KEY_LENGTH);
  });
  test("empty and odd input", () => {
    expect(formatKeyInput("")).toBe("");
    expect(formatKeyInput(null)).toBe("");
    expect(keyCharCount("")).toBe(0);
  });
  test("finds a key inside a downloaded key file or a pasted note", () => {
    const file = `Mennist recovery key\n\n${KEY}\n\nKeep it private.`;
    expect(findKeyInText(file)).toBe(KEY);
    expect(findKeyInText(`my key: ${KEY.toLowerCase()} thanks`)).toBe(KEY);
    expect(findKeyInText(KEY.replace(/-/g, " "))).toBe(KEY);
  });
  test("ignores text with no full key", () => {
    expect(findKeyInText("K7F2-9QXM-4TPD")).toBeNull();
    expect(findKeyInText("hello world")).toBeNull();
  });
  test("reads one group for the confirm step", () => {
    expect(keyGroup(KEY, 2)).toBe("9QXM");
    expect(keyGroup(KEY, 9)).toBe("");
  });
});
