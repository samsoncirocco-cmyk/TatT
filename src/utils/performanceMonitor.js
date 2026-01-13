/**
 * Performance Monitoring Utility
 * 
 * Provides structured timing and logging for performance-critical operations.
 * Targets: Semantic Match (<500ms), Vector Search (<100ms), Stencil Export (<10s).
 */

const metrics = {
    operations: new Map(),
    aggregates: new Map()
};

/**
 * Start timing an operation
 * @param {string} opName - Unique name for the operation
 */
export const startTimer = (opName) => {
    metrics.operations.set(opName, performance.now());
};

/**
 * End timing and log results
 * @param {string} opName - Operation name
 * @param {number} threshold - Warning threshold in ms
 * @param {Object} metadata - Additional context
 * @returns {number} Duration in ms
 */
export const endTimer = (opName, threshold = null, metadata = {}) => {
    const start = metrics.operations.get(opName);
    if (!start) {
        console.warn(`[PERF] Timer for "${opName}" was never started.`);
        return 0;
    }

    const duration = performance.now() - start;
    metrics.operations.delete(opName);

    // Update aggregates
    const stats = metrics.aggregates.get(opName) || { count: 0, total: 0, min: Infinity, max: 0 };
    stats.count++;
    stats.total += duration;
    stats.min = Math.min(stats.min, duration);
    stats.max = Math.max(stats.max, duration);
    metrics.aggregates.set(opName, stats);

    const durationStr = duration.toFixed(1) + 'ms';
    const metaStr = Object.keys(metadata).length ? ` (${JSON.stringify(metadata)})` : '';

    if (threshold && duration > threshold) {
        console.warn(`[PERF] ${opName}: ${durationStr} - EXCEEDS ${threshold}ms TARGET${metaStr}`);
    } else {
        console.log(`[PERF] ${opName}: ${durationStr}${metaStr}`);
    }

    return duration;
};

/**
 * Log a frame duration for FPS calculation
 * @param {number} frameDuration - Duration of a single frame in ms
 */
export const logFrame = (frameDuration) => {
    const fps = 1000 / frameDuration;
    if (fps < 30) {
        console.warn(`[PERF] Low FPS detected: ${fps.toFixed(1)} (Target: 30+)`);
    }
};

/**
 * Get aggregated performance statistics
 */
export const getStats = () => {
    const result = {};
    for (const [name, stats] of metrics.aggregates.entries()) {
        result[name] = {
            avg: (stats.total / stats.count).toFixed(2) + 'ms',
            min: stats.min.toFixed(2) + 'ms',
            max: stats.max.toFixed(2) + 'ms',
            count: stats.count
        };
    }
    return result;
};

const performanceMonitor = {
    startTimer,
    endTimer,
    logFrame,
    getStats
};

export default performanceMonitor;
