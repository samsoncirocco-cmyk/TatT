import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CONFIG = {
    SCRIPT_PATH: 'src/scripts/data_acquisition/parallel_crawler.js',
    PROGRESS_FILE: 'src/scripts/data_acquisition/output/parallel_progress.json',
    TOTAL_CITIES: 350, // Updated for Tier 3/4 expansion
    MAX_RESTARTS: 50,
    RESTART_DELAY: 10000 // 10 seconds
};

function getCompletedCount() {
    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf8'));
            return data.citiesCompleted ? data.citiesCompleted.length : 0;
        } catch (e) {
            return 0;
        }
    }
    return 0;
}

async function runCrawler(restartCount) {
    if (restartCount > CONFIG.MAX_RESTARTS) {
        console.error('❌ Max restarts reached. Exiting.');
        process.exit(1);
    }

    const completed = getCompletedCount();
    console.log(`\n🔄 [Supervisor] Run #${restartCount + 1} | Completed: ${completed}/${CONFIG.TOTAL_CITIES} cities`);

    if (completed >= CONFIG.TOTAL_CITIES) {
        console.log('✅ All cities processed! Pipeline complete.');
        process.exit(0);
    }

    return new Promise((resolve, reject) => {
        const crawler = spawn('node', [CONFIG.SCRIPT_PATH], {
            stdio: 'inherit',
            cwd: process.cwd()
        });

        crawler.on('close', async (code) => {
            if (code === 0) {
                console.log('✅ Crawler finished successfully.');
            } else {
                console.warn(`⚠️ Crawler exited with code ${code}. Restarting in ${CONFIG.RESTART_DELAY / 1000}s...`);
            }

            // Check if we are actually done
            const newCompleted = getCompletedCount();
            if (newCompleted >= CONFIG.TOTAL_CITIES) {
                console.log('✅ All cities processed! Pipeline complete.');
                process.exit(0);
            }

            // Wait and restart
            await new Promise(r => setTimeout(r, CONFIG.RESTART_DELAY));
            resolve(runCrawler(restartCount + 1));
        });

        crawler.on('error', (err) => {
            console.error('❌ Failed to start crawler:', err);
            reject(err);
        });
    });
}

// Start the loop
console.log('🚀 Starting Data Acquisition Supervisor...');
runCrawler(0).catch(console.error);
