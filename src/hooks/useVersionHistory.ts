import { useMemo, useState, useCallback, useEffect } from 'react';
import { useOptionalAuthContext } from '../components/auth/AuthProvider';
import { createStorageAdapter } from '../services/storage/StorageFactory';
import { VersionService } from '../services/versionService';
import type { DesignVersion } from '../services/storage/types';

interface VersionHistoryReturn {
  versions: DesignVersion[];
  currentVersionId: string | null;
  isLoading: boolean;
  addVersion: (data: Partial<DesignVersion>) => Promise<DesignVersion | undefined>;
  removeVersion: (versionId: string) => Promise<void>;
  loadVersion: (versionId: string) => DesignVersion | null;
  clearHistory: () => Promise<void>;
  currentVersion: DesignVersion | null;
}

export function useVersionHistory(designId?: string): VersionHistoryReturn {
  const authContext = useOptionalAuthContext();
  const user = authContext?.user || null;
  const userId = user?.uid || 'anonymous';

  const storage = useMemo(() => createStorageAdapter(user ? { uid: user.uid } : null), [user?.uid]);
  const versionService = useMemo(() => new VersionService(storage, userId), [storage, userId]);

  const [versions, setVersions] = useState<DesignVersion[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    if (!designId) {
      setVersions([]);
      setCurrentVersionId(null);
      return;
    }

    setIsLoading(true);
    versionService
      .getVersions(designId)
      .then((loaded) => {
        if (cancelled) return;
        setVersions(loaded);
        if (loaded.length > 0) {
          setCurrentVersionId(loaded[loaded.length - 1].id);
        } else {
          setCurrentVersionId(null);
        }
      })
      .catch((err) => {
        console.error('[useVersionHistory] Failed to load versions:', err);
        if (!cancelled) {
          setVersions([]);
          setCurrentVersionId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [designId, versionService]);

  const addVersion = useCallback(
    async (data: Partial<DesignVersion>) => {
      if (!designId) return;
      setIsLoading(true);
      try {
        const newVersion = await versionService.addVersion(designId, data);
        setVersions((prev) => [...prev, newVersion]);
        setCurrentVersionId(newVersion.id);
        return newVersion;
      } finally {
        setIsLoading(false);
      }
    },
    [designId, versionService]
  );

  const removeVersion = useCallback(
    async (versionId: string) => {
      if (!designId) return;
      setIsLoading(true);
      try {
        const updated = await versionService.deleteVersion(designId, versionId);
        setVersions(updated);
        if (currentVersionId === versionId) {
          setCurrentVersionId(null);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [designId, versionService, currentVersionId]
  );

  const loadVersion = useCallback(
    (versionId: string) => {
      const version = versions.find((v) => v.id === versionId);
      if (version) {
        setCurrentVersionId(versionId);
        return version;
      }
      return null;
    },
    [versions]
  );

  const clearHistory = useCallback(async () => {
    if (!designId) return;
    setIsLoading(true);
    try {
      await versionService.clearHistory(designId);
      setVersions([]);
      setCurrentVersionId(null);
    } finally {
      setIsLoading(false);
    }
  }, [designId, versionService]);

  return {
    versions,
    currentVersionId,
    isLoading,
    addVersion,
    removeVersion,
    loadVersion,
    clearHistory,
    currentVersion: versions.find((v) => v.id === currentVersionId) || null,
  };
}
