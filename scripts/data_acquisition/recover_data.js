import fs from 'fs';
import path from 'path';

const PROGRESS_FILE = 'src/scripts/data_acquisition/output/parallel_progress.json';
const OUTPUT_FILE = 'src/scripts/data_acquisition/output/recovered_artists.json';

function recover() {
    console.log('Reading progress file...');
    if (!fs.existsSync(PROGRESS_FILE)) {
        console.error('No progress file found.');
        return;
    }

    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    const allShops = data.results || [];

    console.log(`Total shops in history: ${allShops.length}`);

    // Filter for US cities only
    // We check if city ends with two letters (state code) or "USA" vs "UK", "Canada", "Australia"
    const usShops = allShops.filter(shop => {
        const city = shop.city || '';
        if (city.includes(', UK') || city.includes(', Canada') || city.includes(', Australia') ||
            city.includes(', Germany') || city.includes(', France') || city.includes(', Spain') ||
            city.includes(', Italy') || city.includes(', Netherlands')) {
            return false;
        }
        return true;
    });

    console.log(`US Shops recovered: ${usShops.length}`);

    let artistCount = 0;
    usShops.forEach(s => artistCount += (s.artists || []).length);
    console.log(`US Artists recovered: ${artistCount}`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(usShops, null, 2));
    console.log(`Saved to ${OUTPUT_FILE}`);
}

recover();
