interface ImageEntry {
  url: string;
  refs: number;
}

const registry = new Map<string, ImageEntry>();

function createRef(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function registerImage(url: string, existingRef?: string) {
  const ref = existingRef || createRef('img');
  const existing = registry.get(ref);
  if (existing) {
    existing.url = url;
    existing.refs += 1;
    registry.set(ref, existing);
    return ref;
  }

  registry.set(ref, { url, refs: 1 });
  return ref;
}

export function retainImageRef(ref?: string | null) {
  if (!ref) return;
  const entry = registry.get(ref);
  if (!entry) return;
  entry.refs += 1;
  registry.set(ref, entry);
}

export function releaseImageRef(ref?: string | null) {
  if (!ref) return;
  const entry = registry.get(ref);
  if (!entry) return;
  const nextRefs = entry.refs - 1;
  if (nextRefs <= 0) {
    registry.delete(ref);
    return;
  }
  registry.set(ref, { ...entry, refs: nextRefs });
}

export function getImageUrl(ref?: string | null) {
  if (!ref) return null;
  return registry.get(ref)?.url || null;
}
