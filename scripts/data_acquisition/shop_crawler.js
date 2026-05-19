/**
 * TatT Shop Crawler Prototype
 * ==========================================
 * 
 * This script demonstrates the "Seed" phase of the Data Acquisition Strategy.
 * It simulates (or performs) Google Places searches to find tattoo shops,
 * then visits their websites to extract artist information (Instagram handles).
 * 
 * Usage:
 *   node src/scripts/data_acquisition/shop_crawler.js
 * 
 * Configuration:
 *   Set GOOGLE_PLACES_API_KEY in .env to use real Google Data.
 *   Otherwise, it uses a mock list of shops for demonstration.
 */

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import 'dotenv/config';

// Configuration
const CONFIG = {
    // If true, uses real Google API (requires key). If false, uses mock data.
    USE_REAL_API: process.env.GOOGLE_PLACES_API_KEY ? true : false,
    GOOGLE_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
    // Targeted cities for the 'Seed' phase
    TARGET_CITIES: ['New York, NY', 'Los Angeles, CA', 'Austin, TX', 'Portland, OR'],
    // Output file
    OUTPUT_FILE: path.join(process.cwd(), 'src/scripts/data_acquisition/raw_artists.json'),
    // Max concurrent requests (be polite)
    CONCURRENCY: 3
};

/**
 * Mock Data for demonstration purposes
 */
const MOCK_SHOPS = [
    {
        name: "Daredevil Tattoo",
        address: "141 Division St, New York, NY 10002",
        website: "https://www.daredeviltattoo.com", // Example URL
        place_id: "mock_place_1"
    },
    {
        name: "Saved Tattoo",
        address: "426 Union Ave, Brooklyn, NY 11211",
        website: "https://savedtattoo.com",
        place_id: "mock_place_2"
    },
    {
        name: "Atlas Tattoo",
        address: "4543 N Albina Ave, Portland, OR 97217",
        website: "https://www.atlastattoo.com",
        place_id: "mock_place_3"
    }
];

class ShopCrawler {
    constructor() {
        this.results = [];
        console.log(`[Crawler] Initialized. Mode: ${CONFIG.USE_REAL_API ? 'LIVE API' : 'MOCK DATA'}`);
    }

    /**
     * Search for Tattoo Shops in a given city
     */
    async findShops(city) {
        console.log(`[Crawler] Searching for shops in: ${city}...`);

        if (CONFIG.USE_REAL_API) {
            return this._searchGooglePlaces(city);
        } else {
            // Return a subset of mock shops based on city (simulation)
            // For this demo, we just return all mock shops if city matches "New York" or "Portland"
            if (city.includes('New York')) return MOCK_SHOPS.filter(s => s.address.includes('NY'));
            if (city.includes('Portland')) return MOCK_SHOPS.filter(s => s.address.includes('OR'));
            return [];
        }
    }

    async _searchGooglePlaces(city) {
        try {
            const query = `tattoo shop in ${city}`;
            const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${CONFIG.GOOGLE_API_KEY}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status !== 'OK') {
                console.error(`[Crawler] API Error: ${data.status}`);
                return [];
            }

            // Map to our format
            return data.results.map(place => ({
                name: place.name,
                address: place.formatted_address,
                place_id: place.place_id,
                // Detailed Website lookup would require a second 'Place Details' call in a real app
                // For this prototype, we'll assume we fetch details later or mock it.
                // NOTE: In a real implementation, you'd chain a Place Details call here.
                website: null // Placeholder for detail fetch
            }));

        } catch (error) {
            console.error('[Crawler] Google API Request Failed:', error);
            return [];
        }
    }

    /**
     * Visit a shop's website and extract finding
     */
    async crawlShopWebsite(shop) {
        if (!shop.website) {
            console.log(`[Crawler] Skipping ${shop.name} (No Website)`);
            return { ...shop, artists: [] };
        }

        console.log(`[Crawler] Visiting ${shop.website}...`);

        try {
            // 1. Fetch HTML
            const response = await fetch(shop.website, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TatTesterBot/0.1; +http://tattester.com)' }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const html = await response.text();

            // 2. Parse HTML
            const dom = new JSDOM(html);
            const doc = dom.window.document;

            // 3. Extract Artists (Heuristic: Look for 'artists' links or Instagram handles)
            const artists = this._extractArtistsFromDom(doc);

            console.log(`[Crawler] Found ${artists.length} potential artists for ${shop.name}`);

            return {
                ...shop,
                found_artists: artists,
                crawled_at: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[Crawler] Failed to crawl ${shop.website}:`, error.message);
            return { ...shop, error: error.message, artists: [] };
        }
    }

    /**
     * Heuristic Extraction Logic
     */
    _extractArtistsFromDom(doc) {
        const artists = new Set();

        // Strategy A: Look for Instagram Links (highly reliable for tattoo artists)
        const links = Array.from(doc.querySelectorAll('a[href*="instagram.com"]'));

        links.forEach(link => {
            const href = link.href;
            // specific logic to avoid valid shop accounts vs artist accounts
            // (Simplified for prototype)
            const handle = this._parseInstagramHandle(href);
            if (handle && !['tattooshop', 'tattoos', 'ink'].includes(handle.toLowerCase())) {
                artists.add({
                    handle: handle,
                    profile_url: href,
                    source: 'instagram_link'
                });
            }
        });

        // Strategy B: Look for 'Artist' Bio sections (if no IG links found)
        // (Implementation omitted for brevity in prototype, typically involves finding 
        // container elements with class="artist" or "team-member")

        return Array.from(artists);
    }

    _parseInstagramHandle(url) {
        try {
            // Matches instagram.com/handle/ or instagram.com/handle
            const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)\/?/);
            return match ? match[1] : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Main Execution Flow
     */
    async run() {
        console.log('Starting Shop Crawler...');

        const allData = [];

        for (const city of CONFIG.TARGET_CITIES) {
            const shops = await this.findShops(city);

            for (const shop of shops) {
                // Sleep random to be polite
                await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

                const enrichedShop = await this.crawlShopWebsite(shop);
                allData.push(enrichedShop);
            }
        }

        // Save Results
        fs.mkdirSync(path.dirname(CONFIG.OUTPUT_FILE), { recursive: true });
        fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(allData, null, 2));

        console.log(`\n[Success] Crawl complete. Data saved to ${CONFIG.OUTPUT_FILE}`);
        console.log(`Total Shops Processed: ${allData.length}`);
        console.log(`Total Artists Found: ${allData.reduce((acc, s) => acc + (s.found_artists ? s.found_artists.length : 0), 0)}`);
    }
}

// Run the crawler
const crawler = new ShopCrawler();
crawler.run().catch(console.error);
