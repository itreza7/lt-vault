/**
 * useAppBackHandler — Android hardware-back navigation.
 *
 *   overlay (autofill / detail / editor / type picker) → its parent
 *   a non-Vault tab                                     → the Vault tab
 *   the Vault tab (root)                                → press back twice to exit
 *   the restore-confirm on Unlock                       → cancel it
 *   anything else (loading / unlock / create)           → default (exit)
 */

import { useEffect, useRef } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';

import type { LaraTabKey } from '../components/lara';
import type { Screen, Route } from './useVaultSession';

type BackParams = {
  screen: Screen;
  tab: LaraTabKey;
  route: Route;
  showAutofill: boolean;
  hasPendingRestore: boolean;
  setTab: (k: LaraTabKey) => void;
  setRoute: (r: Route) => void;
  setShowAutofill: (b: boolean) => void;
  cancelRestore: () => void;
};

const DOUBLE_BACK_MS = 2000;

export function useAppBackHandler({
  screen,
  tab,
  route,
  showAutofill,
  hasPendingRestore,
  setTab,
  setRoute,
  setShowAutofill,
  cancelRestore,
}: BackParams): void {
  const lastBack = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const onBack = (): boolean => {
      if (screen === 'unlock' && hasPendingRestore) {
        cancelRestore();
        return true;
      }
      if (screen !== 'unlocked') {
        return false; // loading / unlock / create → let Android exit
      }
      if (showAutofill) {
        setShowAutofill(false);
        return true;
      }
      switch (route.name) {
        case 'detail':
        case 'pickType':
          setRoute({ name: 'list' });
          return true;
        case 'editor':
          setRoute(
            route.isNew
              ? { name: 'list' }
              : { name: 'detail', id: route.item.id },
          );
          return true;
        default: {
          // On the tabbed list view.
          if (tab !== 'vault') {
            setTab('vault');
            return true;
          }
          const now = Date.now();
          if (now - lastBack.current < DOUBLE_BACK_MS) {
            return false; // second press → let Android close the app
          }
          lastBack.current = now;
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
          return true;
        }
      }
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [
    screen,
    tab,
    route,
    showAutofill,
    hasPendingRestore,
    setTab,
    setRoute,
    setShowAutofill,
    cancelRestore,
  ]);
}
