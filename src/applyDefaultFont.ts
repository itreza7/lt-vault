/**
 * applyDefaultFont — set Plus Jakarta Sans as the app-wide default typeface.
 *
 * RN Text doesn't inherit fontFamily from parents and React 19 dropped
 * defaultProps, so we inject the family as the *base* of every Text/TextInput's
 * style — per-style fontFamily (e.g. the JetBrains Mono code spots) and
 * fontWeight still win. Importing this module once (before any Text renders)
 * applies the patch; the guard makes it idempotent across Fast Refresh.
 */

import { cloneElement, type ReactElement } from 'react';
import { Text, TextInput } from 'react-native';

import { font } from './laraTheme';

function patchDefaultFont(Comp: unknown) {
  const c = Comp as {
    render?: (...a: unknown[]) => unknown;
    __fontPatched?: boolean;
  };
  if (!c || c.__fontPatched || typeof c.render !== 'function') {
    return;
  }
  const orig = c.render;
  c.render = function patched(...args: unknown[]) {
    const el = orig.apply(this, args) as
      | { props?: { style?: unknown } }
      | null
      | undefined;
    if (!el) {
      return el;
    }
    return cloneElement(el as ReactElement<{ style?: unknown }>, {
      style: [{ fontFamily: font }, el.props?.style],
    });
  };
  c.__fontPatched = true;
}

patchDefaultFont(Text);
patchDefaultFont(TextInput);
