import { validateIncomingMeta } from "../utils/scanFile";
import { getExt, isPreviewable, BIG_FILE, MAX_FILE_SIZE, isAttachmentType } from "../config/attachmentConfig";
import { safeFileName } from "../utils/saveFile";

describe("incoming file checks (the sender is untrusted)", () => {
  test("accepts a normal file", () => {
    expect(validateIncomingMeta("photo.jpg", "image/jpeg", 1000)).toBeNull();
    expect(validateIncomingMeta("notes.PDF", "application/pdf", 5)).toBeNull();
  });
  test("refuses blocked or mismatched types", () => {
    expect(validateIncomingMeta("run.exe", "image/jpeg", 10)).not.toBeNull();
    expect(validateIncomingMeta("photo.png", "image/jpeg", 10)).not.toBeNull();
    expect(validateIncomingMeta("doc.docm", "application/msword", 10)).not.toBeNull();
    expect(validateIncomingMeta("noext", "image/jpeg", 10)).not.toBeNull();
  });
  test("refuses impossible sizes", () => {
    expect(validateIncomingMeta("a.jpg", "image/jpeg", 0)).not.toBeNull();
    expect(validateIncomingMeta("a.jpg", "image/jpeg", -5)).not.toBeNull();
    expect(validateIncomingMeta("a.jpg", "image/jpeg", 1.5)).not.toBeNull();
    expect(validateIncomingMeta("a.jpg", "image/jpeg", MAX_FILE_SIZE + 1)).not.toBeNull();
    expect(validateIncomingMeta("a.jpg", "image/jpeg", "10")).not.toBeNull();
  });
});

describe("attachment helpers", () => {
  test("extensions", () => {
    expect(getExt("a.tar.GZ")).toBe("gz");
    expect(getExt("README")).toBe("");
    expect(getExt()).toBe("");
  });
  test("only small images get an inline preview", () => {
    expect(isPreviewable("image/png", 1000)).toBe(true);
    expect(isPreviewable("image/png", BIG_FILE + 1)).toBe(false);
    expect(isPreviewable("application/pdf", 10)).toBe(false);
  });
  test("plain text messages are not attachments", () => {
    expect(isAttachmentType("plain/text")).toBe(false);
    expect(isAttachmentType("image/png")).toBe(true);
    expect(isAttachmentType(undefined)).toBe(false);
  });
  test("saved file names can't escape the downloads folder", () => {
    const name = safeFileName("../../etc/passwd");
    expect(name).not.toMatch(/[\\/]/);
  });
});
