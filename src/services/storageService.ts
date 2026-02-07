/**
 * Storage Service
 * 
 * Centralized storage management with migration path to backend.
 * Enforces best practices: no base64 blobs in localStorage, size limits, expiry.
 * 
 * Current: localStorage + IndexedDB (MVP)
 * Future: Supabase/Convex with per-user auth
 */

// ===== Type Definitions =====

export interface StorageQuota {
  usedMB: number;
  quotaMB: number;
  percentUsed: number;
  available: number;
}

export interface StorageSetResult {
  success: boolean;
  sizeKB?: number;
  recovered?: boolean;
  error?: string;
  code?: 'QUOTA_EXCEEDED' | 'STORAGE_ERROR';
}

export interface DesignValidation {
  valid: boolean;
  errors: string[];
}

export interface StorageStats {
  quota: StorageQuota | null;
  localStorageKB: string;
  designCount: number;
  designLimit: number;
  expiryDays: number;
}

export interface MigrationDesign {
  id: string;
  imageUrl: string;
  metadata: {
    style?: string;
    subject?: string;
    bodyPart?: string;
    size?: string;
    savedAt?: string;
    prompt?: string;
  };
  favorite: boolean;
  tags: string[];
  notes: string;
}

interface DesignForValidation {
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface StoredDesign {
  id: string;
  imageUrl: string;
  metadata: {
    savedAt: string;
    [key: string]: unknown;
  };
  userInput?: {
    style?: string;
    subject?: string;
    bodyPart?: string;
    size?: string;
    [key: string]: unknown;
  };
  favorite: boolean;
  tags: string[];
  notes: string;
}

// ===== Constants =====

const STORAGE_KEYS = {
  DESIGNS: 'tattester_design_library',
  API_USAGE: 'tattester_api_usage',
  USER_PREFS: 'tattester_user_preferences',
  PLACEMENTS: 'tattester_saved_placements'
} as const;

const LIMITS = {
  MAX_DESIGNS: 50,
  MAX_STORAGE_MB: 50, // Total storage limit
  DESIGN_EXPIRY_DAYS: 90 // Auto-purge old designs
} as const;

// ===== Public API =====

/**
 * Storage quota check
 */
export async function checkStorageQuota(): Promise<StorageQuota | null> {
  if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    
    const usedMB = parseFloat((usage / (1024 * 1024)).toFixed(2));
    const quotaMB = parseFloat((quota / (1024 * 1024)).toFixed(2));
    const percentUsed = quota > 0 ? parseFloat(((usage / quota) * 100).toFixed(1)) : 0;

    return {
      usedMB,
      quotaMB,
      percentUsed,
      available: quota - usage
    };
  }

  return null;
}

/**
 * Purge expired designs
 */
export function purgeExpiredDesigns(): number {
  if (typeof localStorage === 'undefined') return 0;
  
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DESIGNS);
    const designs: StoredDesign[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const expiryMs = LIMITS.DESIGN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    const active = designs.filter(design => {
      const savedAt = new Date(design.metadata.savedAt).getTime();
      const age = now - savedAt;

      // Keep favorites and recent designs
      return design.favorite || age < expiryMs;
    });

    if (active.length < designs.length) {
      localStorage.setItem(STORAGE_KEYS.DESIGNS, JSON.stringify(active));
      console.log(`[Storage] Purged ${designs.length - active.length} expired designs`);
      return designs.length - active.length;
    }

    return 0;
  } catch (error) {
    console.error('[Storage] Error purging designs:', error);
    return 0;
  }
}

/**
 * Validate design before saving
 * Ensures we don't store base64 blobs
 */
export function validateDesign(design: DesignForValidation): DesignValidation {
  const errors: string[] = [];

  // Check for base64 in imageUrl
  if (design.imageUrl && design.imageUrl.startsWith('data:')) {
    errors.push('Design contains base64 data URL. Store external URLs only.');
  }

  // Check for oversized metadata
  const metadataSize = JSON.stringify(design.metadata || {}).length;
  if (metadataSize > 10000) { // 10KB limit for metadata
    errors.push('Metadata exceeds size limit (10KB)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Safe localStorage wrapper with error handling
 */
export function safeLocalStorageSet(key: string, value: unknown): StorageSetResult {
  if (typeof localStorage === 'undefined') {
    return { success: false, error: 'localStorage not available', code: 'STORAGE_ERROR' };
  }
  
  try {
    const serialized = JSON.stringify(value);
    const sizeKB = parseFloat((serialized.length / 1024).toFixed(2));

    // Warn if approaching localStorage limits (5MB typical)
    if (serialized.length > 4 * 1024 * 1024) {
      console.warn(`[Storage] Large localStorage write (${sizeKB}KB). Consider migrating to backend.`);
    }

    localStorage.setItem(key, serialized);
    return { success: true, sizeKB };
  } catch (error) {
    const err = error as Error & { name?: string };
    
    if (err.name === 'QuotaExceededError') {
      console.error('[Storage] localStorage quota exceeded. Attempting cleanup...');
      purgeExpiredDesigns();

      // Try again after cleanup
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return { success: true, recovered: true };
      } catch {
        return {
          success: false,
          error: 'Storage quota exceeded. Please delete some designs.',
          code: 'QUOTA_EXCEEDED'
        };
      }
    }

    return {
      success: false,
      error: err.message,
      code: 'STORAGE_ERROR'
    };
  }
}

/**
 * Safe localStorage get with fallback
 */
export function safeLocalStorageGet<T>(key: string, defaultValue: T): T {
  if (typeof localStorage === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`[Storage] Error reading ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Clear IndexedDB for a specific store
 */
export function clearIndexedDBStore(dbName: string, storeName: string): Promise<boolean | number> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve(0);
      return;
    }
    
    const request = indexedDB.open(dbName, 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(storeName)) {
        resolve(0);
        return;
      }

      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        console.log(`[Storage] Cleared IndexedDB store: ${storeName}`);
        resolve(true);
      };

      clearRequest.onerror = () => reject(clearRequest.error);
    };
  });
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<StorageStats> {
  const quota = await checkStorageQuota();

  let localStorageSize = 0;
  if (typeof localStorage !== 'undefined') {
    localStorageSize = Object.keys(localStorage).reduce((total, key) => {
      return total + (localStorage.getItem(key)?.length || 0);
    }, 0);
  }

  const designs = safeLocalStorageGet<StoredDesign[]>(STORAGE_KEYS.DESIGNS, []);

  return {
    quota,
    localStorageKB: (localStorageSize / 1024).toFixed(2),
    designCount: designs.length,
    designLimit: LIMITS.MAX_DESIGNS,
    expiryDays: LIMITS.DESIGN_EXPIRY_DAYS
  };
}

/**
 * Migration helper for future backend integration
 * 
 * This prepares the data structure for Supabase/Convex migration
 */
export function prepareForBackendMigration(): MigrationDesign[] {
  const designs = safeLocalStorageGet<StoredDesign[]>(STORAGE_KEYS.DESIGNS, []);

  return designs.map(design => ({
    // Keep only essential data
    id: design.id,
    imageUrl: design.imageUrl, // External URL only
    metadata: {
      style: design.userInput?.style,
      subject: design.userInput?.subject,
      bodyPart: design.userInput?.bodyPart,
      size: design.userInput?.size,
      savedAt: design.metadata?.savedAt,
      prompt: design.metadata?.prompt as string | undefined
    },
    favorite: design.favorite,
    tags: design.tags || [],
    notes: design.notes || ''
  }));
}

/**
 * Backend migration schema (for reference)
 * 
 * Supabase table structure:
 * 
 * CREATE TABLE designs (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id UUID REFERENCES auth.users(id),
 *   image_url TEXT NOT NULL,
 *   style TEXT,
 *   subject TEXT,
 *   body_part TEXT,
 *   size TEXT,
 *   prompt TEXT,
 *   favorite BOOLEAN DEFAULT false,
 *   tags TEXT[],
 *   notes TEXT,
 *   created_at TIMESTAMP DEFAULT NOW(),
 *   updated_at TIMESTAMP DEFAULT NOW()
 * );
 * 
 * CREATE INDEX idx_designs_user_id ON designs(user_id);
 * CREATE INDEX idx_designs_created_at ON designs(created_at DESC);
 */

export const BACKEND_MIGRATION_NOTES = `
Migration Checklist:
1. Set up Supabase project with auth
2. Create designs table with RLS policies
3. Implement image upload to Supabase Storage
4. Add user authentication flow
5. Migrate existing localStorage data
6. Update all storage service calls
7. Add offline sync capability
`;
