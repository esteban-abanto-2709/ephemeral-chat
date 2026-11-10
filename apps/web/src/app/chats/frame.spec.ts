import { decodeFrame, encodeFrame } from './frame';

describe('frame', () => {
  it('round-trips a header and the raw bytes', async () => {
    const header = { type: 'file', name: 'ñandú.txt' };
    const blob = encodeFrame(header, new Blob([new Uint8Array([0, 1, 2, 255])]));
    const decoded = decodeFrame(await blob.arrayBuffer());
    expect(decoded.header).toEqual(header);
    expect(Array.from(decoded.data)).toEqual([0, 1, 2, 255]);
  });
});
