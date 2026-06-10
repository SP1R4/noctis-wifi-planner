// Naming-convention helpers. A pattern like "{site}-F{floor}-{type}{nn}"
// formats device names and checks existing names against the convention.
// Pure string logic — unit-testable without the DOM.
//
// Tokens:
//   {site}   site/project code (free text, e.g. "HQ")
//   {floor}  1-based floor number
//   {type}   device type tag (AP / CAM / SW)
//   {n}      device number — {nn} zero-pads to 2 digits, {nnn} to 3

const TOKEN_SPLIT = /(\{(?:site|floor|type|nnn|nn|n)\})/;
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Does the pattern contain a number token? Without one every device on a
// floor would format to the same name, so we treat it as "no convention".
export function patternHasNumber(pattern) {
  return /\{n{1,3}\}/.test(String(pattern || ''));
}

// Format a device name from the pattern. ctx: {site, floor, type, n}.
export function formatName(pattern, { site = '', floor = 1, type = 'AP', n = 1 } = {}) {
  return String(pattern || '')
    .split(TOKEN_SPLIT)
    .map((p) => {
      switch (p) {
        case '{site}': return site;
        case '{floor}': return String(floor);
        case '{type}': return type;
        case '{n}': return String(n);
        case '{nn}': return String(n).padStart(2, '0');
        case '{nnn}': return String(n).padStart(3, '0');
        default: return p;
      }
    })
    .join('');
}

// Build a RegExp that matches any device number for the given site/floor/type.
// Returns null when the pattern is empty or has no number token.
export function patternRegex(pattern, { site = '', floor = 1, type = 'AP' } = {}) {
  if (!patternHasNumber(pattern)) return null;
  const out = String(pattern)
    .split(TOKEN_SPLIT)
    .map((p) => {
      switch (p) {
        case '{site}': return reEsc(site);
        case '{floor}': return String(floor);
        case '{type}': return reEsc(type);
        case '{n}': case '{nn}': case '{nnn}': return '\\d+';
        default: return reEsc(p);
      }
    })
    .join('');
  return new RegExp(`^${out}$`);
}

// True when the name follows the convention (or when there is no usable
// convention — absence of a pattern never flags anything).
export function nameMatches(name, pattern, ctx) {
  const re = patternRegex(pattern, ctx);
  return re ? re.test(String(name || '')) : true;
}
