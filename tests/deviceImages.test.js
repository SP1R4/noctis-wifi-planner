// Resolver for device product images: per-device override → bundled model image
// → type-aware placeholder. Pure (no DOM), so it unit-tests in isolation.
import {describe, it, expect} from 'vitest';
import {modelImageUrl, MODEL_IMAGES, MODEL_IMAGE_PLACEHOLDERS} from '../files/src/constants.js';

describe('modelImageUrl', () => {
  it('returns a per-device override verbatim (highest priority)', () => {
    expect(modelImageUrl({imageUrl: 'https://x/y.png', model: 'U6 Pro'}, 'ap'))
      .toBe('https://x/y.png');
  });

  it('maps a known catalog model to its bundled image path', () => {
    const [model, path] = Object.entries(MODEL_IMAGES)[0];
    expect(modelImageUrl({model}, 'ap')).toBe(path);
  });

  it('falls back to the category placeholder for an unknown model', () => {
    expect(modelImageUrl({model: '__no_such_model__'}, 'ap')).toBe(MODEL_IMAGE_PLACEHOLDERS.ap);
    expect(modelImageUrl({model: '__no_such_model__'}, 'cam')).toBe(MODEL_IMAGE_PLACEHOLDERS.cam);
    expect(modelImageUrl({model: '__no_such_model__'}, 'sw')).toBe(MODEL_IMAGE_PLACEHOLDERS.sw);
  });

  it('uses the default placeholder when the type is missing/unknown', () => {
    expect(modelImageUrl({model: '__no_such_model__'})).toBe(MODEL_IMAGE_PLACEHOLDERS.default);
    expect(modelImageUrl({}, /** @type {any} */ ('bogus'))).toBe(MODEL_IMAGE_PLACEHOLDERS.default);
  });

  it('ignores a blank/whitespace override and falls through to the placeholder', () => {
    expect(modelImageUrl({imageUrl: '   ', model: '__no_such_model__'}, 'ap'))
      .toBe(MODEL_IMAGE_PLACEHOLDERS.ap);
  });

  it('placeholders are self-contained inline SVG data URIs (offline-safe)', () => {
    for (const k of ['ap', 'cam', 'sw', 'default']) {
      expect(MODEL_IMAGE_PLACEHOLDERS[k]).toMatch(/^data:image\/svg\+xml/);
    }
  });
});
