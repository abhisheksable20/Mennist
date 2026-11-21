import { render, screen, fireEvent } from "@testing-library/react";
import ConversationItem from "../components/ConversationItem";

const base = { fromMe: false, plainMsg: "Mennist_1795.mp4", timestamp: Date.now(), type: "video/mp4", fileSize: 140e6, firebaseId: "f1" };
const renderItem = (chat, extra = {}) => {
  const fileDownload = jest.fn();
  render(<ConversationItem chat={{ ...base, ...chat }} fileDownload={fileDownload} {...extra} />);
  return { fileDownload, card: screen.getByRole("button", { name: /Mennist_1795/ }) };
};

describe("attachment card", () => {
  test("not downloaded yet: shows size and can be downloaded", () => {
    const { card, fileDownload } = renderItem({});
    expect(card).toBeEnabled();
    expect(card).toHaveTextContent("MB");
    fireEvent.click(card);
    expect(fileDownload).toHaveBeenCalled();
  });
  test("saved to device: no second download", () => {
    const { card } = renderItem({ savedToDisk: true, downloaded: true });
    expect(card).toBeDisabled();
    expect(card).toHaveTextContent("Saved to your device");
  });
  test("older records with only `downloaded` are treated as saved", () => {
    const { card } = renderItem({ downloaded: true });
    expect(card).toBeDisabled();
    expect(card).toHaveTextContent("Saved to your device");
  });
  test("gone from the server: no retry loop", () => {
    const { card } = renderItem({ gone: true });
    expect(card).toBeDisabled();
    expect(card).toHaveTextContent("No longer available");
  });
  test("failed download offers a retry", () => {
    const { card } = renderItem({}, { downloadStatus: "failed" });
    expect(card).toBeEnabled();
    expect(card).toHaveTextContent("Tap to retry");
  });
  test("download progress", () => {
    const { card } = renderItem({}, { downloadStatus: "downloading", downloadProgress: 42 });
    expect(card).toBeDisabled();
    expect(card).toHaveTextContent("Downloading 42%");
  });
  test("my own file with a local copy can be opened again", () => {
    const blob = new Blob(["x"], { type: "application/pdf" });
    const { card } = renderItem({ fromMe: true, type: "application/pdf", imageBlob: blob });
    expect(card).toBeEnabled();
  });
});
