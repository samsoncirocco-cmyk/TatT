import { useState, useCallback, useEffect } from 'react';
import * as versionService from '../services/versionService';

export function useVersionHistory(sessionId) {
    const [versions, setVersions] = useState([]);
    const [currentVersionId, setCurrentVersionId] = useState(null);

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

    const addVersion = useCallback((data) => {
        if (!sessionId) return;
        const newVersion = versionService.addVersion(sessionId, data);
        if (newVersion) {
            setVersions(prev => [...prev, newVersion]);
            setCurrentVersionId(newVersion.id); // Auto-select new version
            return newVersion;
        }
    }, [sessionId]);

    const removeVersion = useCallback((versionId) => {
        if (!sessionId) return;
        const updated = versionService.deleteVersion(sessionId, versionId);
        setVersions(updated);
        if (currentVersionId === versionId) {
            // If deleted current, select previous or null
            setCurrentVersionId(null);
        }
    }, [sessionId, currentVersionId]);

    const loadVersion = useCallback((versionId) => {
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
