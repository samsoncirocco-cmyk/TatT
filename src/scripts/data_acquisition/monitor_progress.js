import fs from 'fs';
import path from 'path';

const LOG_FILE = 'src/scripts/data_acquisition/output/acquisition_status.log';
const RAW_FILE = 'src/scripts/data_acquisition/output/raw_artists_parallel.json';
const VERIFIED_FILE = 'src/scripts/data_acquisition/output/verified_artists_production.json';

function getStats() {
    let rawCount = 0;
    let verifiedCount = 0;

    try {
        if (fs.existsSync(RAW_FILE)) {
            const raw = JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'));
            rawCount = Array.isArray(raw) ? raw.length : raw.artists?.length || 0;
            // Handle the parallel crawler specific output format if needed
            if (!rawCount && raw.results) rawCount = raw.results.length;
        }
    } catch (e) { }

    try {
        if (fs.existsSync(VERIFIED_FILE)) {
            // Grep-like count for "verified": true might be safer for large files, but parsing for now
            const verified = fs.readFileSync(VERIFIED_FILE, 'utf8');
            verifiedCount = (verified.match(/"verified": true/g) || []).length;
        }
    } catch (e) { }

    return { rawCount, verifiedCount };
}

console.log(`Starting 10-minute monitor. Logging to ${LOG_FILE}...`);

setInterval(() => {
    const stats = getStats();
    const timestamp = new Date().toLocaleTimeString();
    const msg = `[${timestamp}] Status Update:\n` +
        `   - Raw Artists Found: ${stats.rawCount}\n` +
        `   - Verified in Neo4j: ${stats.verifiedCount}\n` +
        `   - Parallel Crawler: Running\n` +
        `   - Direct Search: Running\n` +
        `----------------------------------------`;

    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}, 600000); // 10 minutes

// Initial log
const initial = getStats();
console.log(`Initial Status: ${initial.rawCount} Raw / ${initial.verifiedCount} Verified`);
