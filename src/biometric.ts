/**
 * src/biometric.ts — biometric unlock for Larateam Vault.
 *
 * SECURITY TRADEOFF (deliberate, documented — CLAUDE.md roadmap step 5):
 * The vault's master passphrase normally lives ONLY in memory while unlocked.
 * To support biometric unlock, this module stores the master passphrase in the
 * Android Keystore (via react-native-keychain), gated behind a hardware
 * biometric prompt (BIOMETRY_CURRENT_SET) and bound to this device only
 * (WHEN_UNLOCKED_THIS_DEVICE_ONLY). This is the single, intentional exception
 * to the "key lives only in memory" rule, and it is opt-in by the user.
 *
 * Nothing here ever leaves the device: no network, no telemetry, no logging of
 * the master passphrase or any secret. The keystore entry is local hardware-
 * backed storage. The AsyncStorage flag below tracks only enabled/disabled
 * state so we can answer isBiometricEnabled() WITHOUT triggering a biometric
 * prompt.
 */

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVICE = 'com.larateam.vault.biometric';
const ENABLED_FLAG = 'larateam.biometric.enabled';

/** True if the device exposes any supported biometry (fingerprint/face/iris). */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    return !!(await Keychain.getSupportedBiometryType());
  } catch {
    return false;
  }
}

/**
 * True if the user has enabled biometric unlock. Reads a plain AsyncStorage
 * flag, so this never triggers a biometric prompt.
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const flag = await AsyncStorage.getItem(ENABLED_FLAG);
    return flag === '1';
  } catch {
    return false;
  }
}

/**
 * Store the master passphrase behind a biometric gate and mark biometric
 * unlock as enabled. Returns true on success; on any failure returns false and
 * ensures the enabled flag is not set.
 */
export async function enableBiometric(master: string): Promise<boolean> {
  try {
    const result = await Keychain.setGenericPassword('larateam', master, {
      service: SERVICE,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    if (!result) {
      await disableBiometric();
      return false;
    }
    await AsyncStorage.setItem(ENABLED_FLAG, '1');
    return true;
  } catch {
    await disableBiometric();
    return false;
  }
}

/**
 * Prompt for biometrics and return the stored master passphrase, or null if
 * the user cancels, fails, or nothing is stored.
 */
export async function getBiometricMaster(): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({
      service: SERVICE,
      authenticationPrompt: { title: 'Unlock Larateam Vault' },
    });
    return creds ? creds.password : null;
  } catch {
    return null;
  }
}

/**
 * Remove the stored master passphrase and clear the enabled flag. Best-effort:
 * swallows errors so a failed reset still leaves us in a disabled state.
 */
export async function disableBiometric(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch {
    // best-effort
  }
  try {
    await AsyncStorage.setItem(ENABLED_FLAG, '0');
  } catch {
    // best-effort
  }
}
