/**
 * useKeyboardShortcut
 *
 * Wires up a single global keyboard shortcut. Consumers pass a combo like
 * "ctrl+k" and a handler.
 */

import { useEffect } from 'react';

function normalizeCombo(combo: string): string {
  return combo.toLowerCase().split('+').sort().join('+');
}

function eventKey(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  parts.push(event.key.toLowerCase());
  return parts.sort().join('+');
}

export function useKeyboardShortcut(
  combo: string,
  handler: (event: KeyboardEvent) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const normalized = normalizeCombo(combo);
    const listener = (event: KeyboardEvent) => {
      if (eventKey(event) === normalized) {
        event.preventDefault();
        handler(event);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [combo, handler, enabled]);
}
