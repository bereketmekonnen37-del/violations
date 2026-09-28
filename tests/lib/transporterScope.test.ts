import { describe, it, expect } from 'vitest';
import { filterFilesByTransporter } from '../../src/lib/transporterScope';

interface Block {
  vid?: string | null;
  transporter?: string | null;
  driverName?: string | null;
}
interface File {
  id: string;
  drivers: Block[];
}

const files: File[] = [
  {
    id: 'f1',
    drivers: [
      { vid: 'V1', transporter: 'AcmeCo' },
      { vid: 'V2', transporter: 'Beta Ltd' },
    ],
  },
  {
    id: 'f2',
    drivers: [{ vid: 'V3', transporter: 'Gamma' }],
  },
];

const matcher = (assigned: string[]) => (b: Block) =>
  Boolean(b.transporter && assigned.includes(b.transporter));

describe('filterFilesByTransporter', () => {
  it('returns files unchanged for a boss (not scoped)', () => {
    const out = filterFilesByTransporter(files, false, () => false);
    expect(out).toBe(files);
  });

  it('keeps only blocks that match the predicate', () => {
    const out = filterFilesByTransporter(files, true, matcher(['AcmeCo']));
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('f1');
    expect(out[0].drivers).toEqual([{ vid: 'V1', transporter: 'AcmeCo' }]);
  });

  it('drops files whose block list becomes empty', () => {
    const out = filterFilesByTransporter(files, true, matcher(['Nothing']));
    expect(out).toEqual([]);
  });

  it('does not mutate the underlying array', () => {
    const before = JSON.stringify(files);
    filterFilesByTransporter(files, true, matcher(['AcmeCo']));
    expect(JSON.stringify(files)).toBe(before);
  });

  it('handles multiple assigned transporters across files', () => {
    const out = filterFilesByTransporter(files, true, matcher(['AcmeCo', 'Gamma']));
    expect(out.map((f) => f.id)).toEqual(['f1', 'f2']);
    expect(out[0].drivers).toHaveLength(1);
    expect(out[1].drivers).toHaveLength(1);
  });
});
