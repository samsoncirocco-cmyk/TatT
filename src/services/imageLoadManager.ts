interface LoadOptions {
  crossOrigin?: string;
  signal?: AbortSignal;
}

export function loadImageWithCancel(url: string, options: LoadOptions = {}) {
  let canceled = false;
  const img = new Image();
  img.crossOrigin = options.crossOrigin || 'anonymous';

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    const handleAbort = () => {
      if (canceled) return;
      canceled = true;
      img.src = '';
      cleanup();
      reject(new Error('Image load aborted'));
    };

    if (options.signal) {
      if (options.signal.aborted) {
        handleAbort();
        return;
      }
      options.signal.addEventListener('abort', handleAbort, { once: true });
    }

    img.onload = () => {
      if (canceled) return;
      cleanup();
      resolve(img);
    };

    img.onerror = () => {
      if (canceled) return;
      cleanup();
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });

  return {
    promise,
    cancel: () => {
      if (canceled) return;
      canceled = true;
      img.src = '';
    }
  };
}
