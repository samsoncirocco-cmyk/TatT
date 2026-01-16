/**
 * Generate Artist Portfolio Images using Vertex AI (Imagen 3)
 * 
 * This script:
 * 1. Reads artists from src/data/artists.json
 * 2. Generates portfolio images using Vertex AI Imagen 3
 * 3. Saves images locally to public/portfolio/
 * 4. Updates artists.json with the local paths (replacing expiring URLs)
 * 
 * Usage: node scripts/generate-artist-images-vertex.js [--force]
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { generateWithImagen } from '../src/services/vertex-ai-service.js';

// Setup paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env.local') });

// Configuration
const ARTISTS_FILE = path.join(rootDir, 'src/data/artists.json');
const PUBLIC_DIR = path.join(rootDir, 'public');
const PORTFOLIO_DIR = path.join(PUBLIC_DIR, 'portfolio');

// Ensure output directory exists
if (!fs.existsSync(PORTFOLIO_DIR)) {
    console.log(`Creating output directory: ${PORTFOLIO_DIR}`);
    fs.mkdirSync(PORTFOLIO_DIR, { recursive: true });
}

async function main() {
    try {
        console.log('='.repeat(60));
        console.log('🎨 Vertex AI Artist Portfolio Generator');
        console.log('='.repeat(60));

        // Validation
        if (!process.env.GCP_PROJECT_ID) {
            console.warn('⚠️  GCP_PROJECT_ID not found in .env.local, using default "tatt-pro"');
        }
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.error('❌ GOOGLE_APPLICATION_CREDENTIALS not found in environment.');
            console.error('   Please run: export GOOGLE_APPLICATION_CREDENTIALS="./gcp-service-account-key.json"');
            process.exit(1);
        }

        // Read artists data
        console.log(`Reading artists from: ${ARTISTS_FILE}`);
        const data = JSON.parse(await fs.promises.readFile(ARTISTS_FILE, 'utf-8'));
        const artists = data.artists;

        console.log(`Found ${artists.length} artists.`);
        console.log(`Output directory: ${PORTFOLIO_DIR}`);
        console.log('='.repeat(60));

        let processedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        // Process each artist
        for (let i = 0; i < artists.length; i++) {
            const artist = artists[i];
            const forceRegen = process.argv.includes('--force');

            // Check if we should skip
            let shouldSkip = false;
            if (!forceRegen && artist.portfolioImages && artist.portfolioImages.length > 0) {
                // Check if images are local (start with /portfolio/)
                const firstImage = artist.portfolioImages[0];
                if (firstImage && firstImage.startsWith('/portfolio/')) {
                    shouldSkip = true;
                }
            }

            if (shouldSkip) {
                console.log(`[${i + 1}/${artists.length}] ⏭️  Skipping ${artist.name} (Already has local images)`);
                skippedCount++;
                if ((i + 1) % 10 === 0) {
                    console.log(`Progress: ${i + 1}/${artists.length} | ✅ ${processedCount} | ⏭️ ${skippedCount} | ❌ ${errorCount}`);
                }
                continue;
            }

            console.log(`\n[${i + 1}/${artists.length}] 🎨 Generating for ${artist.name}...`);

            // Construct prompt based on artist style
            const styles = artist.styles.join(', ');
            const tags = artist.tags.join(', ');
            const prompt = `Professional tattoo design, ${styles} style, featuring ${tags}. High quality, white background, clean lines, artistic composition.`;
            const negativePrompt = "nsfw, text, watermark, bad quality, blurry, distorted, skin, photo, realistic body parts";

            console.log(`  📝 Prompt: ${prompt.substring(0, 80)}...`);

            // Retry logic
            const maxRetries = 3;
            let attempt = 0;
            let success = false;
            let savedPaths = [];

            while (attempt < maxRetries && !success) {
                attempt++;
                process.stdout.write(`  🔄 Attempt ${attempt}... `);

                try {
                    const result = await generateWithImagen({
                        prompt: prompt,
                        negativePrompt: negativePrompt,
                        numImages: 3,
                        aspectRatio: "1:1"
                    });

                    if (result.success && result.images && result.images.length > 0) {
                        process.stdout.write(`✅ Got ${result.images.length} images\n`);

                        // Save images
                        for (let j = 0; j < result.images.length; j++) {
                            const base64Data = result.images[j];
                            // Clean base64 string
                            const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

                            const filename = `artist_${artist.id}_${Date.now()}_${j}.png`;
                            const localPath = path.join(PORTFOLIO_DIR, filename);
                            const publicPath = `/portfolio/${filename}`;

                            await fs.promises.writeFile(localPath, cleanBase64, 'base64');
                            savedPaths.push(publicPath);
                            console.log(`      💾 Saved: ${publicPath}`);
                        }

                        success = true;
                    } else {
                        process.stdout.write(`❌ No images returned\n`);
                        throw new Error('No images in response');
                    }

                } catch (err) {
                    process.stdout.write(`❌ Error: ${err.message}\n`);

                    // Check for quota error
                    if (err.message.includes('429') || err.message.includes('Quota exceeded')) {
                        console.error('\n  ⚠️  QUOTA EXCEEDED. Stopping script to avoid further errors.');
                        console.error('  You can resume later by running the script again.');
                        process.exit(1);
                    }

                    if (attempt < maxRetries) {
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
            }

            if (success) {
                // Update artist record
                artist.portfolioImages = savedPaths;
                processedCount++;

                // Save DB immediately
                await fs.promises.writeFile(ARTISTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
                console.log(`      ✅ Updated artists.json`);
            } else {
                console.error(`  ❌ Failed to generate images for ${artist.name}`);
                errorCount++;
            }

            if ((i + 1) % 10 === 0) {
                console.log(`Progress: ${i + 1}/${artists.length} | ✅ ${processedCount} | ⏭️ ${skippedCount} | ❌ ${errorCount}`);
            }

            // Rate limiting delay
            if (i < artists.length - 1) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));
        console.log(`Processed: ${processedCount}`);
        console.log(`Skipped:   ${skippedCount}`);
        console.log(`Errors:    ${errorCount}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('Fatal Error:', error);
        process.exit(1);
    }
}

main();
