import { describe, it, expect } from 'vitest';
import { crc32, zipStore } from '../files/src/zip.js';

const enc = new TextEncoder();
const WHEN = new Date(2026, 5, 10, 12, 0, 0);

describe('crc32', () => {
  it('matches the standard test vector', () => {
    // CRC-32 of "123456789" is the canonical check value 0xCBF43926.
    expect(crc32(enc.encode('123456789'))).toBe(0xcbf43926);
  });
  it('returns 0 for empty input', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe('zipStore', () => {
  it('produces a structurally valid archive', () => {
    const zip = zipStore([
      { name: 'a.txt', data: 'hello' },
      { name: 'dir/b.csv', data: enc.encode('x,y\n1,2') },
    ], WHEN);
    const dv = new DataView(zip.buffer);
    // Local header magic at the start, EOCD magic at the end.
    expect(dv.getUint32(0, true)).toBe(0x04034b50);
    expect(dv.getUint32(zip.length - 22, true)).toBe(0x06054b50);
    // EOCD entry counts.
    expect(dv.getUint16(zip.length - 22 + 8, true)).toBe(2);
    expect(dv.getUint16(zip.length - 22 + 10, true)).toBe(2);
  });

  it('stores file bytes verbatim (STORE, no compression)', () => {
    const zip = zipStore([{ name: 'a.txt', data: 'hello' }], WHEN);
    // Local header is 30 bytes + name; payload follows uncompressed.
    const name = 'a.txt';
    const payload = zip.slice(30 + name.length, 30 + name.length + 5);
    expect(new TextDecoder().decode(payload)).toBe('hello');
  });

  it('writes a central directory consistent with the file contents', () => {
    const files = [
      { name: 'one.txt', data: 'first file' },
      { name: 'two.txt', data: 'second file, longer content here' },
    ];
    const zip = zipStore(files, WHEN);
    const dv = new DataView(zip.buffer);
    const cdOfs = dv.getUint32(zip.length - 22 + 16, true);
    let p = cdOfs;
    for (const f of files) {
      expect(dv.getUint32(p, true)).toBe(0x02014b50);
      const nameLen = dv.getUint16(p + 28, true);
      const name = new TextDecoder().decode(zip.slice(p + 46, p + 46 + nameLen));
      expect(name).toBe(f.name);
      const size = dv.getUint32(p + 24, true);
      expect(size).toBe(f.data.length);
      const crc = dv.getUint32(p + 16, true);
      expect(crc).toBe(crc32(enc.encode(f.data)));
      p += 46 + nameLen;
    }
  });

  it('handles an empty file list', () => {
    const zip = zipStore([], WHEN);
    expect(zip.length).toBe(22); // EOCD only
  });
});
