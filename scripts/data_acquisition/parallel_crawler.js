/**
 * Parallel Production Crawler v3.0
 * ==========================================
 * 
 * Speed optimizations:
 * - Process 10 cities concurrently
 * - Parallel shop crawling within each city
 * - Shared progress tracking
 * - 10-20x faster than sequential version
 * 
 * Usage:
 *   node src/scripts/data_acquisition/parallel_crawler.js
 */

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import 'dotenv/config';

// Configuration
const CONFIG = {
    USE_REAL_API: process.env.GOOGLE_PLACES_API_KEY ? true : false,
    GOOGLE_API_KEY: process.env.GOOGLE_PLACES_API_KEY,

    // Parallel processing
    CONCURRENT_CITIES: 10,  // Process 10 cities at once
    CONCURRENT_SHOPS: 5,    // Process 5 shops per city at once

    // Target cities (Top 150 US metros + tattoo culture hubs)
    TARGET_CITIES: [
        // Top 50 Major Metros
        'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX',
        'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA',
        'Dallas, TX', 'San Jose, CA', 'Austin, TX', 'Jacksonville, FL',
        'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC', 'San Francisco, CA',
        'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Washington, DC',
        'Boston, MA', 'El Paso, TX', 'Nashville, TN', 'Detroit, MI',
        'Oklahoma City, OK', 'Portland, OR', 'Las Vegas, NV', 'Memphis, TN',
        'Louisville, KY', 'Baltimore, MD', 'Milwaukee, WI', 'Albuquerque, NM',
        'Tucson, AZ', 'Fresno, CA', 'Mesa, AZ', 'Sacramento, CA',
        'Atlanta, GA', 'Kansas City, MO', 'Colorado Springs, CO', 'Raleigh, NC',
        'Miami, FL', 'Long Beach, CA', 'Virginia Beach, VA', 'Oakland, CA',
        'Minneapolis, MN', 'Tampa, FL', 'Tulsa, OK', 'Arlington, TX',
        'New Orleans, LA', 'Wichita, KS',

        // Mid-Size Cities (51-100)
        'Bakersfield, CA', 'Anaheim, CA', 'Honolulu, HI', 'Riverside, CA',
        'Corpus Christi, TX', 'Lexington, KY', 'Stockton, CA', 'St. Paul, MN',
        'Cincinnati, OH', 'Pittsburgh, PA', 'Greensboro, NC', 'Anchorage, AK',
        'Plano, TX', 'Lincoln, NE', 'Orlando, FL', 'Irvine, CA',
        'Newark, NJ', 'Durham, NC', 'Chula Vista, CA', 'Toledo, OH',
        'St. Petersburg, FL', 'Reno, NV', 'Laredo, TX', 'Jersey City, NJ',
        'Chandler, AZ', 'Madison, WI', 'Lubbock, TX', 'Scottsdale, AZ',
        'Glendale, AZ', 'Buffalo, NY', 'North Las Vegas, NV', 'Gilbert, AZ',
        'Winston-Salem, NC', 'Chesapeake, VA', 'Norfolk, VA', 'Fremont, CA',
        'Garland, TX', 'Irving, TX', 'Hialeah, FL', 'Richmond, VA',
        'Boise, ID', 'Spokane, WA', 'Baton Rouge, LA', 'Tacoma, WA',
        'San Bernardino, CA', 'Modesto, CA', 'Fontana, CA', 'Des Moines, IA',
        'Moreno Valley, CA', 'Santa Clarita, CA',

        // Tattoo Culture Hubs (101-150)
        'Asheville, NC', 'Portland, ME', 'Savannah, GA', 'Boulder, CO',
        'Eugene, OR', 'Santa Cruz, CA', 'Burlington, VT', 'Providence, RI',
        'Ann Arbor, MI', 'Athens, GA', 'Olympia, WA', 'Bellingham, WA',
        'Fort Collins, CO', 'Flagstaff, AZ', 'Missoula, MT', 'Bend, OR',
        'Santa Fe, NM', 'Key West, FL', 'Ithaca, NY', 'Northampton, MA',
        'Tempe, AZ', 'Denton, TX', 'Wilmington, NC', 'Charleston, SC',
        'Chattanooga, TN', 'Knoxville, TN', 'Greenville, SC', 'Columbia, SC',
        'Little Rock, AR', 'Fayetteville, AR', 'Birmingham, AL', 'Huntsville, AL',
        'Mobile, AL', 'Pensacola, FL', 'Tallahassee, FL', 'Gainesville, FL',
        'St. Augustine, FL', 'Daytona Beach, FL', 'Fort Lauderdale, FL', 'West Palm Beach, FL',
        'Sarasota, FL', 'Cape Coral, FL', 'Port St. Lucie, FL', 'Lakeland, FL',
        'Melbourne, FL', 'Palm Bay, FL', 'Deltona, FL', 'Pompano Beach, FL',
        'Clearwater, FL', 'Largo, FL',

        // END OF US EXPANSION

        // Tier 3: Emerging Hubs (151-250)
        'Boise, ID', 'Spokane, WA', 'Des Moines, IA', 'Little Rock, AR', 'Jackson, MS',
        'Sioux Falls, SD', 'Fargo, ND', 'Billings, MT', 'Cheyenne, WY', 'Burlington, VT',
        'Portland, ME', 'Manchester, NH', 'Providence, RI', 'New Haven, CT', 'Wilmington, DE',
        'Charleston, WV', 'Huntington, WV', 'Roanoke, VA', 'Asheville, NC', 'Myrtle Beach, SC',
        'Savannah, GA', 'Tallahassee, FL', 'Pensacola, FL', 'Mobile, AL', 'Shreveport, LA',
        'Lubbock, TX', 'Amarillo, TX', 'Midland, TX', 'Abilene, TX', 'Waco, TX',
        'Corpus Christi, TX', 'McAllen, TX', 'Brownsville, TX', 'Las Cruces, NM', 'Yuma, AZ',
        'Flagstaff, AZ', 'St. George, UT', 'Provo, UT', 'Ogden, UT', 'Reno, NV',
        'Salem, OR', 'Eugene, OR', 'Medford, OR', 'Tacoma, WA', 'Vancouver, WA',
        'Anchorage, AK', 'Fairbanks, AK', 'Honolulu, HI', 'Hilo, HI', 'Kahului, HI',
        'Fort Wayne, IN', 'South Bend, IN', 'Evansville, IN', 'Grand Rapids, MI', 'Lansing, MI',
        'Toledo, OH', 'Akron, OH', 'Dayton, OH', 'Youngstown, OH', 'Erie, PA',
        'Allentown, PA', 'Scranton, PA', 'Harrisburg, PA', 'Syracuse, NY', 'Rochester, NY',
        'Buffalo, NY', 'Albany, NY', 'Springfield, MA', 'Worcester, MA', 'Hartford, CT',
        'Trenton, NJ', 'Atlantic City, NJ', 'Dover, DE', 'Salisbury, MD', 'Huntsville, AL',
        'Chattanooga, TN', 'Knoxville, TN', 'Lexington, KY', 'Fort Smith, AR', 'Springfield, MO',
        'Columbia, MO', 'Topeka, KS', 'Lincoln, NE', 'Omaha, NE', 'Cedar Rapids, IA',
        'Davenport, IA', 'Rochester, MN', 'Duluth, MN', 'Green Bay, WI', 'Madison, WI',

        // Tier 4: Local Markets (251-350)
        'Modesto, CA', 'Santa Rosa, CA', 'Oxnard, CA', 'Fontana, CA', 'Moreno Valley, CA',
        'Glendale, CA', 'Huntington Beach, CA', 'Santa Clarita, CA', 'Garden Grove, CA', 'Oceanside, CA',
        'Rancho Cucamonga, CA', 'Ontario, CA', 'Lancaster, CA', 'Elk Grove, CA', 'Palmdale, CA',
        'Salinas, CA', 'Hayward, CA', 'Pomona, CA', 'Escondido, CA', 'Sunnyvale, CA',
        'Torrance, CA', 'Pasadena, CA', 'Orange, CA', 'Fullerton, CA', 'Visalia, CA',
        'Thousand Oaks, CA', 'Concord, CA', 'Roseville, CA', 'Simi Valley, CA', 'Victorville, CA',
        'Vallejo, CA', 'Berkeley, CA', 'El Monte, CA', 'Downey, CA', 'Costa Mesa, CA',
        'Inglewood, CA', 'San Buenaventura, CA', 'West Covina, CA', 'Norwalk, CA', 'Daly City, CA',
        // Texas Expansion
        'Frisco, TX', 'McKinney, TX', 'Grand Prairie, TX', 'Brownsville, TX', 'Killeen, TX',
        'Pasadena, TX', 'Mesquite, TX', 'Denton, TX', 'Carrollton, TX', 'Roseville, CA',
        'Midland, TX', 'Waco, TX', 'Pearland, TX', 'College Station, TX', 'Round Rock, TX',
        'League City, TX', 'Lewisville, TX', 'Tyler, TX', 'Richardson, TX', 'Allen, TX',
        // Florida Expansion
        'Port St. Lucie, FL', 'Cape Coral, FL', 'Pembroke Pines, FL', 'Hollywood, FL', 'Miramar, FL',
        'Gainesville, FL', 'Coral Springs, FL', 'Lehigh Acres, FL', 'Brandon, FL', 'Palm Bay, FL',
        'Spring Hill, FL', 'Lakeland, FL', 'Pompano Beach, FL', 'West Palm Beach, FL', 'Davie, FL',
        // Midwest & South
        'Overland Park, KS', 'Kansas City, KS', 'Olathe, KS', 'Springfield, IL', 'Peoria, IL',
        'Champaign, IL', 'Rockford, IL', 'Joliet, IL', 'Naperville, IL', 'Aurora, IL',
        'Gary, IN', 'Lafayette, IN', 'Ann Arbor, MI', 'Flint, MI', 'Dearborn, MI',
        'Livonia, MI', 'Canton, OH', 'Parma, OH', 'Hamilton, OH', 'Kettering, OH'
    ],

    // File paths
    OUTPUT_DIR: path.join(process.cwd(), 'src/scripts/data_acquisition/output'),
    PROGRESS_FILE: path.join(process.cwd(), 'src/scripts/data_acquisition/output/parallel_progress.json'),
    RAW_OUTPUT: path.join(process.cwd(), 'src/scripts/data_acquisition/output/raw_artists_parallel.json'),
    LOG_FILE: path.join(process.cwd(), 'src/scripts/data_acquisition/output/parallel_crawler.log'),

    // Rate limiting (Safe Mode)
    DELAY_BETWEEN_REQUESTS: 1000,  // 1 second
    MAX_RETRIES: 3,

    // Concurrency override
    // CONCURRENT_CITIES: 15, // Removed duplicate
    // CONCURRENT_SHOPS: 5    // Removed duplicate
};

class ParallelCrawler {
    constructor() {
        this.results = [];
        this.progress = this.loadProgress();
        this.results = this.progress.results || []; // RESTORED: Load existing results to preserve history
        this.stats = {
            citiesProcessed: 0,
            shopsProcessed: 0,
            artistsFound: 0,
            errors: 0,
            startTime: Date.now()
        };
        this.progressLock = false;

        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });

        this.log(`[Parallel Crawler] Initialized v3.0`);
        this.log(`[DEBUG] CONFIG.TARGET_CITIES.length: ${CONFIG.TARGET_CITIES.length}`);
        this.log(`[DEBUG] CONFIG.CONCURRENT_CITIES: ${CONFIG.CONCURRENT_CITIES}`);
        this.log(`[Parallel Crawler] Mode: ${CONFIG.USE_REAL_API ? 'LIVE API' : 'MOCK DATA'}`);
        this.log(`[Parallel Crawler] Concurrency: ${CONFIG.CONCURRENT_CITIES} cities, ${CONFIG.CONCURRENT_SHOPS} shops/city`);
        this.log(`[Parallel Crawler] Target: ${CONFIG.TARGET_CITIES.length} cities`);
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} ${message}`;
        console.log(message);
        fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n');
    }

    loadProgress() {
        if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
            try {
                const data = JSON.parse(fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf8'));
                this.log(`[Progress] Resuming from previous run (${data.citiesCompleted?.length || 0} cities completed)`);
                return data;
            } catch (e) {
                this.log(`[Progress] Failed to load progress, starting fresh`);
            }
        }
        return { citiesCompleted: [], results: [] };
    }

    async saveProgress() {
        // Simple lock to prevent concurrent writes
        while (this.progressLock) {
            await this.sleep(100);
        }

        this.progressLock = true;
        try {
            const progressData = {
                citiesCompleted: this.progress.citiesCompleted,
                results: this.results,
                stats: this.stats,
                lastUpdate: new Date().toISOString()
            };
            // Atomic write: tmp + rename. A crash mid-write cannot corrupt the progress file.
            // (Pre-port: naive writeFileSync could leave a half-written 7.5 MB file on Railway redeploy.)
            const _tmp = `${CONFIG.PROGRESS_FILE}.tmp.${process.pid}`;
            fs.writeFileSync(_tmp, JSON.stringify(progressData, null, 2));
            fs.renameSync(_tmp, CONFIG.PROGRESS_FILE);
        } finally {
            this.progressLock = false;
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async findShopsInCity(city) {
        if (CONFIG.USE_REAL_API) {
            return this._searchGooglePlaces(city);
        } else {
            return this._getMockShops(city);
        }
    }

    async _searchGooglePlaces(city) {
        const shops = [];
        let nextPageToken = null;
        let pageCount = 0;

        do {
            let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=tattoo+shop+in+${encodeURIComponent(city)}&key=${CONFIG.GOOGLE_API_KEY}`;
            if (nextPageToken) {
                url += `&pagetoken=${nextPageToken}`;
                // Google requires a short delay before the token is valid
                await this.sleep(5000);
            }

            try {
                const response = await fetch(url);
                const data = await response.json();

                if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                    this.log(`[API Error] ${data.status} for ${city} (Page ${pageCount + 1})`);
                    break;
                }

                if (data.results && data.results.length > 0) {
                    const pageShops = await Promise.all(
                        data.results.map(async (place) => {
                            // Basic details are free, but we want website which is Contact Data (billed)
                            // Optimization: Only fetch details if we haven't seen this place_id
                            return {
                                name: place.name,
                                address: place.formatted_address,
                                place_id: place.place_id,
                                rating: place.rating,
                                city: city
                            };
                        })
                    );

                    // Fetch details (website) for each shop
                    // We do this in a separate step to control rate limiting if needed
                    for (const shop of pageShops) {
                        await this.sleep(CONFIG.DELAY_BETWEEN_REQUESTS);
                        const details = await this._getPlaceDetails(shop.place_id);
                        if (details && details.website) {
                            shop.website = details.website;
                            shops.push(shop);
                        }
                    }
                }

                nextPageToken = data.next_page_token;
                pageCount++;

            } catch (error) {
                this.log(`[Error] Google API request failed for ${city}: ${error.message}`);
                this.stats.errors++;
                break;
            }
        } while (nextPageToken && pageCount < 3);

        return shops;
    }

    async _getPlaceDetails(placeId) {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website&key=${CONFIG.GOOGLE_API_KEY}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.result;
        } catch (error) {
            return null;
        }
    }

    _getMockShops(city) {
        return [
            { name: `${city} Ink`, website: 'https://example.com', address: city, city },
            { name: `${city} Tattoo Co`, website: 'https://example.com', address: city, city }
        ];
    }

    async crawlShopWebsite(shop) {
        if (!shop.website) {
            return { ...shop, artists: [], error: 'No website' };
        }

        try {
            const response = await fetch(shop.website, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TatTesterBot/3.0)' },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                return { ...shop, artists: [], error: `HTTP ${response.status}` };
            }

            const html = await response.text();
            const dom = new JSDOM(html);
            const artists = this._extractArtistsFromDom(dom.window.document);

            this.stats.artistsFound += artists.length;

            return {
                ...shop,
                artists: artists,
                crawled_at: new Date().toISOString()
            };
        } catch (error) {
            return { ...shop, artists: [], error: error.message };
        }
    }

    _extractArtistsFromDom(doc) {
        const artists = new Set();
        const links = Array.from(doc.querySelectorAll('a[href*="instagram.com"]'));

        links.forEach(link => {
            const handle = this._parseInstagramHandle(link.href);
            if (handle && !this._isShopAccount(handle)) {
                artists.add({
                    handle: handle,
                    profile_url: link.href,
                    source: 'instagram_link'
                });
            }
        });

        return Array.from(artists);
    }

    _parseInstagramHandle(url) {
        try {
            const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)\/?/);
            return match ? match[1] : null;
        } catch (e) {
            return null;
        }
    }

    _isShopAccount(handle) {
        const shopKeywords = ['tattoo', 'ink', 'shop', 'studio', 'parlor', 'collective'];
        const lowerHandle = handle.toLowerCase();
        return shopKeywords.some(keyword => lowerHandle.includes(keyword));
    }

    async processCity(city) {
        this.log(`\n[City] Processing: ${city}`);

        try {
            const shops = await this.findShopsInCity(city);
            this.log(`[City] Found ${shops.length} shops in ${city}`);

            // Process shops in parallel batches
            const enrichedShops = [];
            for (let i = 0; i < shops.length; i += CONFIG.CONCURRENT_SHOPS) {
                const batch = shops.slice(i, i + CONFIG.CONCURRENT_SHOPS);
                const batchResults = await Promise.all(
                    batch.map(shop => this.crawlShopWebsite(shop))
                );
                enrichedShops.push(...batchResults);

                this.stats.shopsProcessed += batchResults.length;
                await this.sleep(CONFIG.DELAY_BETWEEN_REQUESTS);
            }

            this.results.push(...enrichedShops);
            this.progress.citiesCompleted.push(city);
            this.stats.citiesProcessed++;

            await this.saveProgress();
            this.log(`[City] Completed ${city} - Total: ${this.stats.shopsProcessed} shops, ${this.stats.artistsFound} artists`);

        } catch (error) {
            this.log(`[Error] Failed to process ${city}: ${error.message}`);
            this.stats.errors++;
        }
    }

    async run() {
        this.log(`\n${'='.repeat(60)}`);
        this.log(`PARALLEL CRAWLER STARTED`);
        this.log(`${'='.repeat(60)}\n`);

        const citiesToProcess = CONFIG.TARGET_CITIES.filter(
            city => !this.progress.citiesCompleted.includes(city)
        );

        this.log(`[Plan] Processing ${citiesToProcess.length} cities in parallel`);

        if (CONFIG.USE_REAL_API) {
            const estimatedCost = citiesToProcess.length * 0.034 * 20;
            this.log(`[Cost] Estimated API cost: $${estimatedCost.toFixed(2)}`);
        }

        // Process cities in parallel batches
        for (let i = 0; i < citiesToProcess.length; i += CONFIG.CONCURRENT_CITIES) {
            const batch = citiesToProcess.slice(i, i + CONFIG.CONCURRENT_CITIES);
            this.log(`\n[Batch] Processing cities ${i + 1}-${i + batch.length} of ${citiesToProcess.length}`);

            await Promise.all(batch.map(city => this.processCity(city)));

            this.log(`[Batch] Completed batch - Progress: ${this.stats.citiesProcessed}/${citiesToProcess.length} cities`);
        }

        // Final save
        // Atomic write so a crash here doesn't truncate the final 6 MB results file.
        const _tmpRaw = `${CONFIG.RAW_OUTPUT}.tmp.${process.pid}`;
        fs.writeFileSync(_tmpRaw, JSON.stringify(this.results, null, 2));
        fs.renameSync(_tmpRaw, CONFIG.RAW_OUTPUT);
        await this.saveProgress();

        this.printSummary();
    }

    printSummary() {
        const duration = ((Date.now() - this.stats.startTime) / 1000 / 60).toFixed(2);

        this.log(`\n${'='.repeat(60)}`);
        this.log(`PARALLEL CRAWL COMPLETE`);
        this.log(`${'='.repeat(60)}`);
        this.log(`Cities Processed: ${this.stats.citiesProcessed}`);
        this.log(`Shops Processed: ${this.stats.shopsProcessed}`);
        this.log(`Artists Found: ${this.stats.artistsFound}`);
        this.log(`Errors: ${this.stats.errors}`);
        this.log(`Duration: ${duration} minutes`);
        this.log(`Speed: ${(this.stats.shopsProcessed / parseFloat(duration)).toFixed(1)} shops/minute`);
        this.log(`Output: ${CONFIG.RAW_OUTPUT}`);
        this.log(`${'='.repeat(60)}\n`);
    }
}

const crawler = new ParallelCrawler();
crawler.run().catch(console.error);
