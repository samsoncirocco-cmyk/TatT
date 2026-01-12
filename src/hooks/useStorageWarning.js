/**
 * useStorageWarning Hook
 *
 * Monitors localStorage quota and shows warnings when approaching limits
 */

import { useEffect, useCallback, useRef } from 'react';
import { checkStorageQuota, purgeExpiredDesigns } from '../services/storageService';

const WARNING_THRESHOLD = 80; // Show warning at 80% usage
const CRITICAL_THRESHOLD = 95; // Show critical warning at 95%
const CHECK_INTERVAL = 30000; // Check every 30 seconds

export function useStorageWarning(toast) {
  const lastWarningRef = useRef(null);
  const checkIntervalRef = useRef(null);

  const checkAndWarn = useCallback(async () => {
    try {
      const quota = await checkStorageQuota();

      if (!quota) {
        // Browser doesn't support quota API
        return;
      }

      const { percentUsed, usedMB, quotaMB } = quota;

      // Critical threshold
      if (percentUsed >= CRITICAL_THRESHOLD) {
        if (lastWarningRef.current !== 'critical') {
          toast?.error?.(
            `Storage critically low (${percentUsed}% used). Delete old designs or clear browser data.`
          );
          lastWarningRef.current = 'critical';
        }
      }
      // Warning threshold
      else if (percentUsed >= WARNING_THRESHOLD) {
        if (lastWarningRef.current !== 'warning') {
          const purged = purgeExpiredDesigns();

          if (purged > 0) {
            toast?.success?.(
              `Cleaned up ${purged} old version(s). Storage: ${percentUsed}% used (${usedMB}/${quotaMB}MB)`
            );
          } else {
            toast?.warning?.(
              `Storage nearly full (${percentUsed}% used). Consider deleting old designs.`
            );
          }

          lastWarningRef.current = 'warning';
        }
      }
      // Below threshold - reset warning state
      else if (percentUsed < WARNING_THRESHOLD - 10) {
        // Reset if usage drops below 70%
        lastWarningRef.current = null;
      }
    } catch (error) {
      console.warn('[StorageWarning] Check failed:', error);
    }
  }, [toast]);

  useEffect(() => {
    // Check immediately on mount
    checkAndWarn();

    // Set up periodic checks
    checkIntervalRef.current = setInterval(checkAndWarn, CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkAndWarn]);

  // Return manual check function for use after large operations
  return {
    checkNow: checkAndWarn
  };
}
