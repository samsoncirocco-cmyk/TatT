/**
 * Server-side placement composite — "see it on your own body" over SMS.
 *
 * Real sharp, real pixels: the point of this suite is that the shared
 * `designBackdrop` gate behaves the same on a server buffer as it does on a
 * browser canvas, so a synthetic design and a synthetic photo are cheaper
 * and more honest than mocking the imaging away.
 */
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { compositeOnBody, widthFractionFor } from '../internal/placement';

/** Flash art: a black mark floating on white margins. */
async function flashArtOnWhite(size = 200): Promise<Buffer> {
  const mark = await sharp({
    create: { width: size / 2, height: size / 2, channels: 4, background: '#101010' },
  })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: '#ffffff' },
  })
    .composite([{ input: mark, left: size / 4, top: size / 4 }])
    .png()
    .toBuffer();
}

/** An on-skin render: no white anywhere, so nothing to strip. */
async function onSkinRender(size = 200): Promise<Buffer> {
  return sharp({
    create: { width: size, height: size, channels: 4, background: '#c68666' },
  })
    .png()
    .toBuffer();
}

async function bodyPhoto(width = 800, height = 1000): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: '#b98a6b' },
  })
    .jpeg()
    .toBuffer();
}

describe('compositeOnBody', () => {
  it('lays flash art onto the photo and keeps the photo\'s dimensions', async () => {
    const result = await compositeOnBody(await flashArtOnWhite(), await bodyPhoto());

    expect(result).not.toBe('unusable-design');
    if (result === 'unusable-design') return;
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(1000);
  });

  // The failure the shared gate exists to prevent: multiplying an on-skin
  // render onto the texter's photo lays a STRANGER'S body over their own,
  // and it looks like a working feature.
  it('refuses an opaque on-skin render rather than pasting a stranger\'s body', async () => {
    const result = await compositeOnBody(await onSkinRender(), await bodyPhoto());

    expect(result).toBe('unusable-design');
  });

  it('honours a size hint in the texter\'s own words', async () => {
    const design = await flashArtOnWhite();
    const photo = await bodyPhoto();

    const small = await compositeOnBody(design, photo, widthFractionFor('smaller'));
    const big = await compositeOnBody(design, photo, widthFractionFor('way bigger'));

    expect(small).not.toBe('unusable-design');
    expect(big).not.toBe('unusable-design');
    // Both keep the photo's frame; the difference is how much ink lands.
    if (small === 'unusable-design' || big === 'unusable-design') return;
    const inkDarkness = async (buffer: Buffer) => {
      const { data } = await sharp(buffer).greyscale().raw().toBuffer({ resolveWithObject: true });
      let dark = 0;
      for (let i = 0; i < data.length; i++) if (data[i] < 100) dark++;
      return dark;
    };
    expect(await inkDarkness(big.buffer)).toBeGreaterThan(await inkDarkness(small.buffer));
  });

  it('survives a photo smaller than the design', async () => {
    const result = await compositeOnBody(await flashArtOnWhite(600), await bodyPhoto(200, 200));

    expect(result).not.toBe('unusable-design');
  });
});

describe('widthFractionFor', () => {
  it('defaults to a sane fraction of the photo', () => {
    expect(widthFractionFor('')).toBeGreaterThan(0.2);
    expect(widthFractionFor('')).toBeLessThan(0.8);
  });

  it('moves up and down on the words people actually use', () => {
    expect(widthFractionFor('bigger please')).toBeGreaterThan(widthFractionFor(''));
    expect(widthFractionFor('a bit smaller')).toBeLessThan(widthFractionFor(''));
  });

  it('stays inside bounds however emphatic the hint', () => {
    expect(widthFractionFor('way bigger huge')).toBeLessThanOrEqual(0.9);
    expect(widthFractionFor('way smaller tiny')).toBeGreaterThanOrEqual(0.15);
  });
});
