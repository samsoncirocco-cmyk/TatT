# Shop Crawler Prototype

This directory contains the prototype for the "Shop Crawler", the first component of the TatT Data Acquisition Strategy.

## What it does

1. **Finds Shops:** Simulates (or performs) a Google Places search for tattoo shops in target cities.
2. **Visits Websites:** Navigates to the shop's website.
3. **Extracts Artists:** Parses the HTML to find Instagram handles, which are the primary identifier for tattoo artists.

## How to Run

```bash
# From the project root
node src/scripts/data_acquisition/shop_crawler.js
```

## Configuration

To use real Google Data (instead of the built-in mock data for NYC/Portland):

1. Get a Google Places API Key.
2. Add it to your `.env` file:

    ```
    GOOGLE_PLACES_API_KEY=your_key_here
    ```

## Output

The script generates `src/scripts/data_acquisition/raw_artists.json`. This JSON file is the input for **Phase 2 (The Samson Test)**, where AI verifies the artist's portfolio.
