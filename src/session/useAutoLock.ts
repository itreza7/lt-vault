/**
 * useAutoLock — lock the vault when the app returns to the foreground after
 * being away for at least `minutes` (0 = lock on any background). Active only
 * while `enabled` (i.e. while unlocked).
 */

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export function useAutoLock(
  enabled: boolean,
  minutes: number,
  onLock: () => void,
): void {
  const backgroundedAt = useRef<number | null>(null);
  const lockRef = useRef(onLock);
  lockRef.current = onLock;

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (!enabled) {
        return;
      }
      if (state === 'background' || state === 'inactive') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active' && backgroundedAt.current != null) {
        const elapsed = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (minutes === 0 || elapsed >= minutes * 60_000) {
          lockRef.current();
        }
      }
    });
    return () => sub.remove();
  }, [enabled, minutes]);
}
