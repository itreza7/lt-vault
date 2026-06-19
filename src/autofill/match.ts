/**
 * match — pair an autofill request (web domain or app package) with stored
 * logins. No URL helpers existed before; this normalizes a login's freeform
 * `fields.url` and the request host to compare them, plus a fuzzy
 * package-name match for native apps.
 */

import { passwordOf, type Item } from '../model';
import type { AutofillRequest } from './native';

/** Reduce a freeform URL/host to a bare lowercase host (no scheme/www/path/port). */
export function hostFromUrl(raw: string): string {
  let s = (raw || '').trim().toLowerCase();
  if (!s) {
    return '';
  }
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, ''); // scheme://
  s = s.split('/')[0].split('?')[0].split('#')[0]; // path/query/hash
  const at = s.split('@');
  s = at[at.length - 1]; // userinfo@
  s = s.split(':')[0]; // :port
  if (s.startsWith('www.')) {
    s = s.slice(4);
  }
  return s;
}

/** Last two labels — a loose registrable-domain approximation (login.github.com → github.com). */
export function baseDomain(host: string): string {
  const parts = host.split('.').filter(Boolean);
  return parts.length <= 2 ? host : parts.slice(-2).join('.');
}

/** True if a stored login URL plausibly belongs to the requested host. */
export function domainMatch(loginUrl: string, requestHost: string): boolean {
  const a = hostFromUrl(loginUrl);
  const b = hostFromUrl(requestHost);
  if (!a || !b) {
    return false;
  }
  if (a === b || a.endsWith('.' + b) || b.endsWith('.' + a)) {
    return true;
  }
  return baseDomain(a) === baseDomain(b);
}

const PKG_STOPWORDS = new Set([
  'com', 'org', 'net', 'io', 'app', 'apps', 'android', 'mobile', 'co', 'www',
]);

/** Fuzzy match a native app package (com.spotify.music) against a login's url/title. */
export function packageMatch(item: Item, pkg: string): boolean {
  const tokens = (pkg || '')
    .toLowerCase()
    .split('.')
    .filter(t => t.length > 2 && !PKG_STOPWORDS.has(t));
  if (tokens.length === 0) {
    return false;
  }
  const hay = (
    hostFromUrl(item.fields.url || '') +
    ' ' +
    (item.title || '')
  ).toLowerCase();
  return tokens.some(t => hay.includes(t));
}

/** A login usable for autofill: type 'login' with a non-empty password. */
export function isFillableLogin(item: Item): boolean {
  return item.type === 'login' && !!passwordOf(item);
}

/**
 * Split logins into [matches, others] for the request. `matches` are the
 * best candidates (same site / app); `others` lets the user still pick anything.
 */
export function rankLogins(
  items: Item[],
  req: AutofillRequest,
): { matches: Item[]; others: Item[] } {
  const logins = items.filter(isFillableLogin);
  const host = req.webDomain ? hostFromUrl(req.webDomain) : '';
  const isMatch = (it: Item): boolean => {
    if (host) {
      return domainMatch(it.fields.url || '', host);
    }
    if (req.packageName) {
      return packageMatch(it, req.packageName);
    }
    return false;
  };
  const matches: Item[] = [];
  const others: Item[] = [];
  for (const it of logins) {
    (isMatch(it) ? matches : others).push(it);
  }
  const byTitle = (a: Item, b: Item) =>
    (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
  matches.sort(byTitle);
  others.sort(byTitle);
  return { matches, others };
}
