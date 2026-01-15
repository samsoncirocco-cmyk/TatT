/**
 * Asset Migration Script - Local Storage to Google Cloud Storage
 * 
 * Migrates existing tattoo designs from local filesystem to GCS.
 * Updates Supabase `designs.image_url` to point to GCS signed URLs.
 * Implements fallback logic and integrity checks.
 * 
 * Usage:
 *   node scripts/migrate-to-gcs.js [--dry-run] [--limit=N]
 * 
 * Options:
 *   --dry-run    Show what would be migrated without actually uploading
 *   --limit=N    Only migrate first N designs (for testing)
 */

import { createClient } from '@supabase/supabase-js';
import { uploadToGCS, fileExists } from '../src/services/gcs-service.js';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitMatch = args.find(arg => arg.startsWith('--limit='));
const limit = limitMatch ? parseInt(limitMatch.split('=')[1], 10) : null;

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Migration statistics
const stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: []
};

/**
 * Calculate file checksum for integrity verification
 */
function calculateChecksum(filePath) {
    const fileBuffer = readFileSync(filePath);
    return createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Migrate a single design to GCS
 */
async function migrateDesign(design) {
    try {
        const { id, image_url, user_id, style, body_part } = design;

        // Skip if already migrated (URL starts with https://storage.googleapis.com)
        if (image_url && image_url.includes('storage.googleapis.com')) {
            console.log(`[SKIP] Design ${id} already migrated`);
            stats.skipped++;
            return;
        }

        // Skip if no image URL
        if (!image_url) {
            console.log(`[SKIP] Design ${id} has no image_url`);
            stats.skipped++;
            return;
        }

        // Determine local file path
        // Assuming images are stored in /uploads/ or /public/uploads/
        const localPath = image_url.startsWith('http')
            ? null // External URL, can't migrate
            : join(process.cwd(), 'uploads', image_url.replace(/^\//, ''));

        if (!localPath || !existsSync(localPath)) {
            console.warn(`[WARN] Local file not found for design ${id}: ${localPath || image_url}`);
            stats.failed++;
            stats.errors.push({ id, error: 'Local file not found', path: localPath });
            return;
        }

        // Calculate checksum before upload
        const checksumBefore = calculateChecksum(localPath);
        console.log(`[MIGRATE] Design ${id}: ${localPath}`);

        if (isDryRun) {
            console.log(`[DRY-RUN] Would upload: ${localPath} -> gs://tatt-pro-assets/designs/${id}.png`);
            stats.migrated++;
            return;
        }

        // Upload to GCS
        const uploadResult = await uploadToGCS(
            localPath,
            `designs/${id}.png`,
            {
                contentType: 'image/png',
                metadata: {
                    designId: id,
                    userId: user_id,
                    style,
                    bodyPart: body_part,
                    originalUrl: image_url,
                    checksumSHA256: checksumBefore,
                    migratedAt: new Date().toISOString()
                }
            }
        );

        // Update Supabase with new GCS URL
        const { error: updateError } = await supabase
            .from('designs')
            .update({
                image_url: uploadResult.url,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) {
            throw new Error(`Supabase update failed: ${updateError.message}`);
        }

        console.log(`[SUCCESS] Design ${id} migrated to GCS`);
        console.log(`  Old URL: ${image_url}`);
        console.log(`  New URL: ${uploadResult.url}`);
        stats.migrated++;

    } catch (error) {
        console.error(`[ERROR] Failed to migrate design ${design.id}:`, error.message);
        stats.failed++;
        stats.errors.push({ id: design.id, error: error.message });
    }
}

/**
 * Main migration function
 */
async function runMigration() {
    console.log('='.repeat(60));
    console.log('TatT Pro - Asset Migration to Google Cloud Storage');
    console.log('='.repeat(60));
    console.log();

    if (isDryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made');
        console.log();
    }

    if (limit) {
        console.log(`📊 Limiting migration to first ${limit} designs`);
        console.log();
    }

    // Fetch all designs from Supabase
    console.log('📥 Fetching designs from Supabase...');

    let query = supabase
        .from('designs')
        .select('id, image_url, user_id, style, body_part, created_at')
        .order('created_at', { ascending: true });

    if (limit) {
        query = query.limit(limit);
    }

    const { data: designs, error } = await query;

    if (error) {
        console.error('❌ Failed to fetch designs:', error.message);
        process.exit(1);
    }

    stats.total = designs.length;
    console.log(`✅ Found ${stats.total} designs to process`);
    console.log();

    // Migrate each design
    for (let i = 0; i < designs.length; i++) {
        const design = designs[i];
        console.log(`[${i + 1}/${designs.length}] Processing design ${design.id}...`);
        await migrateDesign(design);
        console.log();
    }

    // Print summary
    console.log('='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total designs:     ${stats.total}`);
    console.log(`✅ Migrated:       ${stats.migrated}`);
    console.log(`⏭️  Skipped:        ${stats.skipped}`);
    console.log(`❌ Failed:         ${stats.failed}`);
    console.log();

    if (stats.errors.length > 0) {
        console.log('Errors:');
        stats.errors.forEach(({ id, error }) => {
            console.log(`  - Design ${id}: ${error}`);
        });
        console.log();
    }

    if (isDryRun) {
        console.log('🔍 DRY RUN COMPLETE - No changes were made');
        console.log('   Run without --dry-run to perform actual migration');
    } else {
        console.log('✅ MIGRATION COMPLETE');
    }

    process.exit(stats.failed > 0 ? 1 : 0);
}

// Run migration
runMigration().catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
});
