import { describe, it, expect, vi } from 'vitest';
import {
  selectSharePath,
  shareCapture,
  buildShareText,
  copyLinkToClipboard,
} from '../shareCapture';

/**
 * Share-path selection for the AR capture. The rules under test:
 *  - native ONLY when the browser affirms it can share this file;
 *  - the sheet closing is not an error;
 *  - every failure lands on the fallback, never a throw;
 *  - and the whole module performs zero network I/O.
 */

const file = new File(['png-bytes'], 'tatt-ar-still-1.png', { type: 'image/png' });

describe('selectSharePath', () => {
  it('chooses native when share exists and canShare affirms files', () => {
    const nav = { share: vi.fn(), canShare: vi.fn(() => true) };
    expect(selectSharePath(file, nav)).toBe('native');
    expect(nav.canShare).toHaveBeenCalledWith({ files: [file] });
  });

  it('falls back when navigator.share is missing (older desktop browsers)', () => {
    expect(selectSharePath(file, {})).toBe('fallback');
  });

  it('falls back when canShare is missing — share existing is not enough', () => {
    expect(selectSharePath(file, { share: vi.fn() })).toBe('fallback');
  });

  it('falls back when canShare rejects files (share exists for URLs only)', () => {
    expect(selectSharePath(file, { share: vi.fn(), canShare: () => false })).toBe('fallback');
  });

  it('falls back when canShare throws', () => {
    expect(
      selectSharePath(file, {
        share: vi.fn(),
        canShare: () => {
          throw new TypeError('bad data');
        },
      }),
    ).toBe('fallback');
  });
});

describe('shareCapture', () => {
  it('hands the file, text, and design link to the OS share sheet', async () => {
    const share = vi.fn(async () => {});
    const nav = { share, canShare: () => true };

    const outcome = await shareCapture(
      { file, text: 'should I get this? real answers only.', url: 'https://t.example/share/abc' },
      nav,
    );

    expect(outcome).toEqual({ kind: 'shared' });
    expect(share).toHaveBeenCalledWith({
      files: [file],
      text: 'should I get this? real answers only.',
      url: 'https://t.example/share/abc',
    });
  });

  it('omits the url field entirely when no link exists — no empty-string lies', async () => {
    const share = vi.fn(async () => {});
    await shareCapture({ file, text: 't' }, { share, canShare: () => true });
    expect(share).toHaveBeenCalledWith({ files: [file], text: 't' });
    expect(Object.keys(share.mock.calls[0][0])).not.toContain('url');
  });

  it('treats the user closing the sheet as cancelled, not an error', async () => {
    const abort = Object.assign(new Error('closed'), { name: 'AbortError' });
    const nav = {
      share: vi.fn(async () => {
        throw abort;
      }),
      canShare: () => true,
    };
    expect(await shareCapture({ file, text: 't' }, nav)).toEqual({ kind: 'cancelled' });
  });

  it('degrades to fallback when share rejects for any other reason', async () => {
    const nav = {
      share: vi.fn(async () => {
        throw new TypeError('cannot share');
      }),
      canShare: () => true,
    };
    expect(await shareCapture({ file, text: 't' }, nav)).toEqual({ kind: 'fallback' });
  });

  it('returns fallback without touching share when the path is unsupported', async () => {
    const share = vi.fn();
    expect(await shareCapture({ file, text: 't' }, { share })).toEqual({ kind: 'fallback' });
    expect(share).not.toHaveBeenCalled();
  });
});

describe('buildShareText', () => {
  it('asks the group chat by name when the design has one', () => {
    expect(buildShareText('Death Moth')).toBe('should I get "Death Moth"? real answers only.');
  });

  it('asks plainly when it does not', () => {
    expect(buildShareText()).toBe('should I get this? real answers only.');
    expect(buildShareText('   ')).toBe('should I get this? real answers only.');
  });
});

describe('copyLinkToClipboard', () => {
  it('copies and reports success', async () => {
    const writeText = vi.fn(async () => {});
    expect(await copyLinkToClipboard('https://t.example/s/1', { clipboard: { writeText } })).toBe(
      true,
    );
    expect(writeText).toHaveBeenCalledWith('https://t.example/s/1');
  });

  it('reports false when the clipboard is missing or blocked — no silent no-op', async () => {
    expect(await copyLinkToClipboard('u', {})).toBe(false);
    expect(
      await copyLinkToClipboard('u', {
        clipboard: {
          writeText: async () => {
            throw new Error('denied');
          },
        },
      }),
    ).toBe(false);
  });
});

describe('no-upload guarantee: the share path never touches the network', () => {
  it('runs every share outcome without a single fetch/XHR/sendBeacon', async () => {
    const fetchSpy = vi.fn();
    const xhrOpen = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(xhrOpen);

    // Native success, cancel, failure, and the unsupported path.
    await shareCapture({ file, text: 't', url: 'https://t.example/s/1' }, {
      share: async () => {},
      canShare: () => true,
    });
    await shareCapture({ file, text: 't' }, {
      share: async () => {
        throw Object.assign(new Error('x'), { name: 'AbortError' });
      },
      canShare: () => true,
    });
    await shareCapture({ file, text: 't' }, {
      share: async () => {
        throw new Error('x');
      },
      canShare: () => true,
    });
    await shareCapture({ file, text: 't' }, {});
    await copyLinkToClipboard('https://t.example/s/1', {
      clipboard: { writeText: async () => {} },
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpen).not.toHaveBeenCalled();

    // Static check on the module source too: the transport for a capture is
    // the share sheet or a download, never a request.
    const fs = await import('node:fs');
    const path = await import('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../shareCapture.ts'), 'utf-8');
    // Call-site patterns (the doc comments naming these APIs are the point).
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/new\s+XMLHttpRequest/);
    expect(source).not.toMatch(/sendBeacon\s*\(/);
    expect(source).not.toMatch(/new\s+WebSocket/);

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
