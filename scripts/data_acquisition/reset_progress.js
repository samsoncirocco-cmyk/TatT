import fs from 'fs';

const PROGRESS_FILE = 'src/scripts/data_acquisition/output/parallel_progress.json';

function resetUSProgress() {
    if (!fs.existsSync(PROGRESS_FILE)) {
        console.log('No progress file to reset.');
        return;
    }

    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    console.log(`Original Completed Cities: ${data.citiesCompleted.length}`);

    // We want to KEEP international cities (if any we want to skip) or just CLEAR ALL to be safe?
    // User wants US. We added US list.
    // If we want to re-crawl US, we should remove US cities from 'citiesCompleted'.
    // The safest bet to get "nearly 1200" back is to just clear the citiesCompleted list 
    // but keep the 'results' that we successfully recovered (if any).
    // Actually, since we recovered 0 US shops (previous step), we should just clear citiesCompleted.

    data.citiesCompleted = [];
    // We also clear results because they are likely international garbage or duplicates now
    data.results = [];

    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
    console.log('Progress reset. Crawler will restart from scratch on the US list.');
}

resetUSProgress();
