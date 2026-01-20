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
        'Clearwater, FL', 'Largo, FL'
    ],

    // File paths
    OUTPUT_DIR: path.join(process.cwd(), 'src/scripts/data_acquisition/output'),
    PROGRESS_FILE: path.join(process.cwd(), 'src/scripts/data_acquisition/output/parallel_progress.json'),
    RAW_OUTPUT: path.join(process.cwd(), 'src/scripts/data_acquisition/output/raw_artists_parallel.json'),
    LOG_FILE: path.join(process.cwd(), 'src/scripts/data_acquisition/output/parallel_crawler.log'),

    // Rate limiting (more aggressive for parallel)
    DELAY_BETWEEN_REQUESTS: 500,  // 0.5 seconds (was 2s)
    MAX_RETRIES: 3
};

class ParallelCrawler {
    constructor() {
        this.results = [];
        this.progress = this.loadProgress();
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
            fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(progressData, null, 2));
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
        const query = `tattoo shop in ${city}`;
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${CONFIG.GOOGLE_API_KEY}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.status !== 'OK') {
                this.log(`[API Error] ${data.status} for ${city}`);
                return [];
            }

            // Get details for each shop in parallel
            const shopPromises = data.results.slice(0, 20).map(async (place) => {
                await this.sleep(CONFIG.DELAY_BETWEEN_REQUESTS);
                const details = await this._getPlaceDetails(place.place_id);
                if (details) {
                    return {
                        name: place.name,
                        address: place.formatted_address,
                        place_id: place.place_id,
                        website: details.website,
                        rating: place.rating,
                        city: city
                    };
                }
                return null;
            });

            const shops = (await Promise.all(shopPromises)).filter(s => s !== null);
            return shops;
        } catch (error) {
            this.log(`[Error] Google API request failed for ${city}: ${error.message}`);
            this.stats.errors++;
            return [];
        }
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
        fs.writeFileSync(CONFIG.RAW_OUTPUT, JSON.stringify(this.results, null, 2));
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
