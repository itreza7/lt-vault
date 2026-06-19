/**
 * clipboard — copy secrets to the OS clipboard with a security auto-clear.
 *
 * A password manager that leaves secrets on the clipboard forever is a leak.
 * copyWithAutoClear puts the value on the clipboard, then wipes it after a
 * delay — but only if the user hasn't copied something else in the meantime
 * (we don't clobber unrelated clipboard contents).
 *
 * Stays on-device: the clipboard is local OS state; nothing is transmitted.
 */

import Clipboard from '@react-native-clipboard/clipboard';

/** Seconds before a copied secret is wiped from the clipboard. */
export const CLIPBOARD_CLEAR_SECONDS = 30;

let pendingClear: ReturnType<typeof setTimeout> | null = null;

/**
 * Copy `value` to the clipboard and schedule it to be cleared after
 * `seconds`. If the clipboard contents change before then (the user copied
 * something else), the clear is skipped. Returns the delay used so callers can
 * tell the user when it will vanish.
 */
export async function copyWithAutoClear(
  value: string,
  seconds: number = CLIPBOARD_CLEAR_SECONDS,
): Promise<number> {
  Clipboard.setString(value);

  if (pendingClear) {
    clearTimeout(pendingClear);
    pendingClear = null;
  }
  pendingClear = setTimeout(async () => {
    try {
      const current = await Clipboard.getString();
      if (current === value) {
        Clipboard.setString('');
      }
    } catch {
      // If we can't read it back, leave the clipboard alone rather than guess.
    } finally {
      pendingClear = null;
    }
  }, seconds * 1000);

  return seconds;
}
