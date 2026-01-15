/**
 * Test GCP Services Connection
 * 
 * Verifies that all Google Cloud services are properly configured:
 * - Service account authentication
 * - Cloud Storage access
 * - Vertex AI (Gemini) access
 * - Firebase Realtime Database access
 */

// Load environment variables from .env.local
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { checkGCSHealth } from '../src/services/gcs-service.js';
import { checkVertexAIHealth } from '../src/services/vertex-ai-service.js';
import { checkFirebaseHealth } from '../src/services/firebase-match-service.js';

console.log('='.repeat(60));
console.log('TatT Pro - GCP Services Health Check');
console.log('='.repeat(60));
console.log();

async function runHealthChecks() {
    const results = {
        gcs: null,
        vertexAI: null,
        firebase: null
    };

    // Test 1: Google Cloud Storage
    console.log('1️⃣  Testing Google Cloud Storage...');
    try {
        results.gcs = await checkGCSHealth();
        if (results.gcs.healthy) {
            console.log('   ✅ GCS Connected');
            console.log(`   📦 Bucket: ${results.gcs.bucket}`);
            console.log(`   📍 Location: ${results.gcs.location}`);
            console.log(`   💾 Storage Class: ${results.gcs.storageClass}`);
        } else {
            console.log('   ❌ GCS Connection Failed');
            console.log(`   Error: ${results.gcs.error}`);
        }
    } catch (error) {
        console.log('   ❌ GCS Test Failed');
        console.log(`   Error: ${error.message}`);
        results.gcs = { healthy: false, error: error.message };
    }
    console.log();

    // Test 2: Vertex AI (Gemini)
    console.log('2️⃣  Testing Vertex AI (Gemini)...');
    try {
        results.vertexAI = await checkVertexAIHealth();
        if (results.vertexAI.healthy) {
            console.log('   ✅ Vertex AI Connected');
            console.log(`   🤖 Project: ${results.vertexAI.project}`);
            console.log(`   📍 Location: ${results.vertexAI.location}`);
            console.log(`   🎯 Gemini Available: ${results.vertexAI.geminiAvailable}`);
        } else {
            console.log('   ❌ Vertex AI Connection Failed');
            console.log(`   Error: ${results.vertexAI.error}`);
        }
    } catch (error) {
        console.log('   ❌ Vertex AI Test Failed');
        console.log(`   Error: ${error.message}`);
        results.vertexAI = { healthy: false, error: error.message };
    }
    console.log();

    // Test 3: Firebase Realtime Database
    console.log('3️⃣  Testing Firebase Realtime Database...');
    try {
        results.firebase = await checkFirebaseHealth();
        if (results.firebase.healthy) {
            console.log('   ✅ Firebase Connected');
            console.log(`   🔥 Database: ${results.firebase.database}`);
            console.log(`   🔌 Connected: ${results.firebase.connected}`);
        } else {
            console.log('   ❌ Firebase Connection Failed');
            console.log(`   Error: ${results.firebase.error}`);
        }
    } catch (error) {
        console.log('   ❌ Firebase Test Failed');
        console.log(`   Error: ${error.message}`);
        results.firebase = { healthy: false, error: error.message };
    }
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));

    const allHealthy = results.gcs?.healthy && results.vertexAI?.healthy && results.firebase?.healthy;

    if (allHealthy) {
        console.log('🎉 All services are healthy!');
        console.log();
        console.log('Next steps:');
        console.log('  1. Create GCS bucket: npm run gcp:create-bucket');
        console.log('  2. Run Supabase migration: scripts/supabase-schema-extension.sql');
        console.log('  3. Test image upload: npm run gcp:test-storage');
        console.log('  4. Start using Vertex AI services!');
    } else {
        console.log('⚠️  Some services need attention:');
        if (!results.gcs?.healthy) console.log('  ❌ Google Cloud Storage');
        if (!results.vertexAI?.healthy) console.log('  ❌ Vertex AI');
        if (!results.firebase?.healthy) console.log('  ❌ Firebase');
        console.log();
        console.log('Check the errors above and ensure:');
        console.log('  - Service account key is in project root');
        console.log('  - .env.local has correct GCP_PROJECT_ID');
        console.log('  - All required APIs are enabled');
        console.log('  - Firebase config is set (if Firebase failed)');
    }

    console.log();
    process.exit(allHealthy ? 0 : 1);
}

runHealthChecks().catch(error => {
    console.error('💥 Health check failed:', error);
    process.exit(1);
});
