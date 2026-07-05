import { describe, it, expect } from 'vitest';
import { parseDxf } from '../files/src/dxf.js';

// Build a minimal ASCII DXF around an ENTITIES section.
const dxf = (entities) => [
  '0', 'SECTION', '2', 'ENTITIES',
  ...entities,
  '0', 'ENDSEC', '0', 'EOF',
].join('\n');

describe('parseDxf', () => {
  it('reads LINE entities', () => {
    const { segments, minX, maxY } = parseDxf(dxf([
      '0', 'LINE', '8', '0', '10', '1.5', '20', '2.5', '11', '10', '21', '2.5',
    ]));
    expect(segments).toEqual([{ x1: 1.5, y1: 2.5, x2: 10, y2: 2.5 }]);
    expect(minX).toBe(1.5);
    expect(maxY).toBe(2.5);
  });

  it('reads open and closed LWPOLYLINE entities', () => {
    const open = parseDxf(dxf([
      '0', 'LWPOLYLINE', '90', '3', '70', '0',
      '10', '0', '20', '0', '10', '10', '20', '0', '10', '10', '20', '10',
    ]));
    expect(open.segments.length).toBe(2);
    const closed = parseDxf(dxf([
      '0', 'LWPOLYLINE', '90', '3', '70', '1',
      '10', '0', '20', '0', '10', '10', '20', '0', '10', '10', '20', '10',
    ]));
    expect(closed.segments.length).toBe(3);   // closing edge added
  });

  it('reads legacy POLYLINE/VERTEX/SEQEND chains', () => {
    const { segments } = parseDxf(dxf([
      '0', 'POLYLINE', '66', '1', '70', '0',
      '0', 'VERTEX', '10', '0', '20', '0',
      '0', 'VERTEX', '10', '5', '20', '5',
      '0', 'VERTEX', '10', '9', '20', '5',
      '0', 'SEQEND',
    ]));
    expect(segments.length).toBe(2);
    expect(segments[1]).toEqual({ x1: 5, y1: 5, x2: 9, y2: 5 });
  });

  it('ignores entities outside ENTITIES and unsupported types', () => {
    const text = [
      '0', 'SECTION', '2', 'TABLES',
      '0', 'LINE', '10', '0', '20', '0', '11', '5', '21', '5',
      '0', 'ENDSEC',
      '0', 'SECTION', '2', 'ENTITIES',
      '0', 'CIRCLE', '10', '3', '20', '3', '40', '2',
      '0', 'LINE', '10', '0', '20', '0', '11', '7', '21', '0',
      '0', 'ENDSEC', '0', 'EOF',
    ].join('\n');
    const { segments } = parseDxf(text);
    expect(segments).toEqual([{ x1: 0, y1: 0, x2: 7, y2: 0 }]);
  });

  it('handles empty/garbage input without throwing', () => {
    expect(parseDxf('').segments).toEqual([]);
    expect(parseDxf('not a dxf at all').segments).toEqual([]);
  });
});
