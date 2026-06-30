/**
 * Clipboard helpers. Sensitive copies are auto-cleared after a timeout so a
 * decrypted password doesn't linger on the system clipboard indefinitely.
 * Best-effort: clipboard clearing can be blocked by the browser when the tab
 * isn't focused, so this reduces — but cannot guarantee — exposure.
 */

export const CLIPBOARD_CLEAR_MS = 20_000;

let clearTimer: ReturnType<typeof setTimeout> | null = null;

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/** Copies a secret and schedules the clipboard to be overwritten after `clearAfterMs`. */
export async function copySensitive(
  text: string,
  clearAfterMs: number = CLIPBOARD_CLEAR_MS,
): Promise<void> {
  await navigator.clipboard.writeText(text);
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    // Only clear if our value is still on the clipboard, so we don't clobber
    // something the user copied in the meantime. If we can't read it (permissions),
    // overwrite anyway — removing the secret takes priority.
    navigator.clipboard
      .readText()
      .then((current) => {
        if (current === text) return navigator.clipboard.writeText("");
      })
      .catch(() => navigator.clipboard.writeText("").catch(() => {}));
  }, clearAfterMs);
}
