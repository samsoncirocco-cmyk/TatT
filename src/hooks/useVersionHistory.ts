import { useState, useCallback, useEffect } from 'react';
import * as versionService from '../services/versionService';

// Types
export interface DesignVersion {
    id: string;
    timestamp: string;
    prompt?: string;
    enhancedPrompt?: string;
    parameters?: Record<string, any>;
    layers?: any[];
    imageUrl?: string;
    branchedFrom?: {
        sessionId: string;
        versionId: string;
        versionNumber: number;
    };
    mergedFrom?: {
        version1: string;
        version2: string;
        mergeOptions?: Record<string, any>;
    };
    isFavorite?: boolean;
    [key: string]: any;
}

interface VersionHistoryReturn {
    versions: DesignVersion[];
    currentVersionId: string | null;
    addVersion: (data: Partial<DesignVersion>) => DesignVersion | undefined;
    removeVersion: (versionId: string) => void;
    loadVersion: (versionId: string) => DesignVersion | null;
    clearHistory: () => void;
    currentVersion: DesignVersion | null;
}

export function useVersionHistory(sessionId?: string): VersionHistoryReturn {
    const [versions, setVersions] = useState<DesignVersion[]>([]);
    const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);

    // Load versions on mount or session change
    useEffect(() => {
        if (sessionId) {
            const loadedVersions = versionService.getVersions(sessionId);
            setVersions(loadedVersions);
            if (loadedVersions.length > 0) {
                // Default to latest version? Or null if fresh session?
                // Usually we want to see the history but maybe not select one.
                // Let's select the last one by default for continuity
                setCurrentVersionId(loadedVersions[loadedVersions.length - 1].id);
            }
        } else {
            setVersions([]);
            setCurrentVersionId(null);
        }
    }, [sessionId]);

    const addVersion = useCallback((data: Partial<DesignVersion>) => {
        if (!sessionId) return;
        const newVersion = versionService.addVersion(sessionId, data);
        if (newVersion) {
            setVersions(prev => [...prev, newVersion]);
            setCurrentVersionId(newVersion.id); // Auto-select new version
            return newVersion;
        }
    }, [sessionId]);

    const removeVersion = useCallback((versionId: string) => {
        if (!sessionId) return;
        const updated = versionService.deleteVersion(sessionId, versionId);
        setVersions(updated);
        if (currentVersionId === versionId) {
            // If deleted current, select previous or null
            setCurrentVersionId(null);
        }
    }, [sessionId, currentVersionId]);

    const loadVersion = useCallback((versionId: string) => {
        const version = versions.find(v => v.id === versionId);
        if (version) {
            setCurrentVersionId(versionId);
            return version;
        }
        return null;
    }, [versions]);

    const clearHistory = useCallback(() => {
        if (!sessionId) return;
        versionService.clearSessionHistory(sessionId);
        setVersions([]);
        setCurrentVersionId(null);
    }, [sessionId]);

    return {
        versions,
        currentVersionId,
        addVersion,
        removeVersion,
        loadVersion,
        clearHistory,
        currentVersion: versions.find(v => v.id === currentVersionId) || null
    };
}
