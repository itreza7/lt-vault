/**
 * AutofillRoot — JS entry point for VaultAutofillActivity (component
 * "vaultAutofill"). Just provides safe-area context around the unlock screen.
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AutofillUnlockScreen from './AutofillUnlockScreen';

export default function AutofillRoot(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <AutofillUnlockScreen />
    </SafeAreaProvider>
  );
}
