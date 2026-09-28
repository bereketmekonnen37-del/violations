/**
 * useCopyToClipboard
 *
 * Copies a string to the clipboard and briefly flips a "copied" flag.
 */

import { useCallback, useState } from 'react';

export function useCopyToClipboard(resetMs = 1500) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (value: string) => {
      if (!navigator.clipboard) {
        setCopied(false);
        return false;
      }
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), resetMs);
        return true;
      } catch {
        setCopied(false);
        return false;
      }
    },
    [resetMs],
  );

  return { copied, copy };
}
