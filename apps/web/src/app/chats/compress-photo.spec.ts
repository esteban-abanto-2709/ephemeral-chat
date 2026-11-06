import { compressPhoto } from './compress-photo';

describe('compressPhoto', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubCanvas(output: Blob) {
    const sizes: number[][] = [];
    vi.stubGlobal('createImageBitmap', async () => ({ width: 4000, height: 3000, close() {} }));
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(width: number, height: number) {
          sizes.push([width, height]);
        }
        getContext() {
          return { fillRect() {}, drawImage() {} };
        }
        async convertToBlob() {
          return output;
        }
      },
    );
    return sizes;
  }

  it('shrinks a photo to 1600 px on its long side as a JPEG', async () => {
    const sizes = stubCanvas(new Blob(['small']));
    const photo = await compressPhoto(
      new File(['a big photo'], 'beach.png', { type: 'image/png' }),
    );
    expect(sizes).toEqual([[1600, 1200]]);
    expect(photo.name).toBe('beach.jpg');
    expect(photo.type).toBe('image/jpeg');
  });

  it('keeps the original when it is not a photo, can not be read or would grow', async () => {
    const gif = new File(['gif'], 'party.gif', { type: 'image/gif' });
    expect(await compressPhoto(gif)).toBe(gif);

    const png = new File(['png'], 'icon.png', { type: 'image/png' });
    expect(await compressPhoto(png)).toBe(png);

    stubCanvas(new Blob(['much bigger than before']));
    expect(await compressPhoto(png)).toBe(png);
  });
});
