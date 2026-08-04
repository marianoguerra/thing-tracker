/**
 * Saves a file, preferring the share sheet where it exists.
 *
 * In a standalone PWA on iOS and Android there is no visible downloads UI, so
 * an `<a download>` can appear to do nothing at all. `navigator.share` with a
 * file puts the export somewhere the user actually chose. The anchor remains
 * the desktop path and the fallback everywhere else.
 */
export async function saveOrShare(content: string, filename: string): Promise<"shared" | "saved"> {
  const blob = new Blob([content], { type: "application/json" });

  if (typeof navigator.canShare === "function" && typeof navigator.share === "function") {
    const file = new File([blob], filename, { type: "application/json" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return "shared";
      } catch (error) {
        // A user-cancelled share must not fall through to a silent download.
        if (error instanceof DOMException && error.name === "AbortError") return "shared";
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next tick; revoking synchronously races the download start
  // in some browsers.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
  return "saved";
}

export function readTextFile(file: File): Promise<string> {
  return file.text();
}
