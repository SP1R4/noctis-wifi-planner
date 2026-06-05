import { describe, it, expect } from 'vitest';
import { encryptObject, decryptObject, isEncryptedBlob } from '../files/src/crypto.js';

describe('encryptObject / decryptObject', () => {
  const secret = { 'sw1': { user: 'admin', pass: 'hunter2', proto: 'https' } };

  it('round-trips an object with the right passphrase', async () => {
    const blob = await encryptObject(secret, 'correct horse');
    expect(await decryptObject(blob, 'correct horse')).toEqual(secret);
  });

  it('produces a self-describing, recognisable blob with no plaintext', async () => {
    const blob = await encryptObject(secret, 'pw');
    expect(isEncryptedBlob(blob)).toBe(true);
    expect(JSON.stringify(blob)).not.toContain('hunter2');
    expect(JSON.stringify(blob)).not.toContain('admin');
  });

  it('uses a fresh salt + IV each time (different ciphertext)', async () => {
    const a = await encryptObject(secret, 'pw');
    const b = await encryptObject(secret, 'pw');
    expect(a.ct).not.toBe(b.ct);
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
  });

  it('fails to decrypt with a wrong passphrase', async () => {
    const blob = await encryptObject(secret, 'right');
    await expect(decryptObject(blob, 'wrong')).rejects.toBeTruthy();
  });

  it('rejects a non-blob', async () => {
    await expect(decryptObject({ foo: 1 }, 'pw')).rejects.toThrow();
  });
});

describe('isEncryptedBlob', () => {
  it('only recognises our blob shape', () => {
    expect(isEncryptedBlob(null)).toBe(false);
    expect(isEncryptedBlob({ user: 'admin' })).toBe(false);
    expect(isEncryptedBlob({ alg: 'AES-GCM', ct: 'x', salt: 'y', iv: 'z' })).toBe(true);
  });
});
