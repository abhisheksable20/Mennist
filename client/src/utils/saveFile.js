export const safeFileName = (name) =>
    String(name || `Mennist_${Date.now()}`).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 200);

// Saves a Blob to the user's device. Re-wrapping as octet-stream means the browser
// can never render it (no inline PDF/HTML/SVG execution), it always downloads.
export function saveBlobToDevice(blob, name) {
    const url = URL.createObjectURL(new Blob([blob], { type: "application/octet-stream" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = safeFileName(name);
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}