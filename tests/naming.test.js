import { describe, it, expect } from 'vitest';
import {
  formatName,
  patternRegex,
  nameMatches,
  patternHasNumber,
} from '../files/src/naming.js';

const ctx = { site: 'HQ', floor: 2, type: 'AP', n: 7 };

describe('formatName', () => {
  it('substitutes every token', () => {
    expect(formatName('{site}-F{floor}-{type}{nn}', ctx)).toBe('HQ-F2-AP07');
  });
  it('pads {nn} and {nnn}, leaves {n} bare', () => {
    expect(formatName('{n}|{nn}|{nnn}', { n: 7 })).toBe('7|07|007');
    expect(formatName('{nnn}', { n: 1234 })).toBe('1234'); // no truncation
  });
  it('leaves unknown braces alone', () => {
    expect(formatName('{site}-{room}', { site: 'HQ' })).toBe('HQ-{room}');
  });
  it('handles an empty pattern', () => {
    expect(formatName('', ctx)).toBe('');
  });
});

describe('patternRegex / nameMatches', () => {
  it('matches any device number for the same site/floor/type', () => {
    expect(nameMatches('HQ-F2-AP01', '{site}-F{floor}-{type}{nn}', ctx)).toBe(true);
    expect(nameMatches('HQ-F2-AP99', '{site}-F{floor}-{type}{nn}', ctx)).toBe(true);
  });
  it('rejects the wrong floor, type, or shape', () => {
    const p = '{site}-F{floor}-{type}{nn}';
    expect(nameMatches('HQ-F3-AP01', p, ctx)).toBe(false);
    expect(nameMatches('HQ-F2-CAM01', p, ctx)).toBe(false);
    expect(nameMatches('AP-01', p, ctx)).toBe(false);
  });
  it('escapes regex metacharacters in literals and site codes', () => {
    expect(nameMatches('A.B (1) AP1', '{site} AP{n}', { site: 'A.B (1)' })).toBe(true);
    expect(nameMatches('AXB (1) AP1', '{site} AP{n}', { site: 'A.B (1)' })).toBe(false);
  });
  it('treats a pattern without a number token as no convention', () => {
    expect(patternHasNumber('{site}-{type}')).toBe(false);
    expect(patternRegex('{site}-{type}', ctx)).toBeNull();
    expect(nameMatches('anything', '{site}-{type}', ctx)).toBe(true);
    expect(nameMatches('anything', '', ctx)).toBe(true);
  });
});
