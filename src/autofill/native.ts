/**
 * native — typed wrapper over the VaultAutofill native module (Kotlin).
 *
 * App side (Settings setup screen): isSupported / hasEnabledService /
 * openAutofillSettings. Autofill activity side: getRequest / fillLogin /
 * fillOtp / cancel. The module is absent on non-Android or if the build is
 * stale, so every call is guarded.
 */

import { NativeModules, Platform } from 'react-native';

type NativeAutofill = {
  isSupported(): Promise<boolean>;
  hasEnabledService(): Promise<boolean>;
  openAutofillSettings(): Promise<boolean>;
  getRequest(): Promise<AutofillRequest | null>;
  fillLogin(username: string | null, password: string | null): Promise<boolean>;
  fillOtp(code: string): Promise<boolean>;
  cancel(): Promise<boolean>;
  close(): Promise<boolean>;
};

export type AutofillRequest = {
  mode: 'fill' | 'save';
  webDomain: string | null;
  packageName: string | null;
  hasUsername: boolean;
  hasPassword: boolean;
  hasOtp: boolean;
  savedUsername: string | null;
  savedPassword: string | null;
};

const M: NativeAutofill | undefined =
  Platform.OS === 'android' ? NativeModules.VaultAutofill : undefined;

/** The native module is present (Android + a build that includes it). */
export const autofillNativeAvailable = !!M;

export const Autofill = {
  isSupported: (): Promise<boolean> => M?.isSupported() ?? Promise.resolve(false),
  hasEnabledService: (): Promise<boolean> =>
    M?.hasEnabledService() ?? Promise.resolve(false),
  openAutofillSettings: (): Promise<boolean> =>
    M?.openAutofillSettings() ?? Promise.resolve(false),
  getRequest: (): Promise<AutofillRequest | null> =>
    M?.getRequest() ?? Promise.resolve(null),
  fillLogin: (username: string | null, password: string | null): Promise<boolean> =>
    M?.fillLogin(username, password) ?? Promise.resolve(false),
  fillOtp: (code: string): Promise<boolean> => M?.fillOtp(code) ?? Promise.resolve(false),
  cancel: (): Promise<boolean> => M?.cancel() ?? Promise.resolve(false),
  close: (): Promise<boolean> => M?.close() ?? Promise.resolve(false),
};
