import { generateMask } from './src/lib/segmentation';
import * as fs from 'fs';
import * as path from 'path';

// Note: You need REPLICATE_API_TOKEN in env for this to work.
// Run with: npx tsx test-segmentation.ts

async function test() {
    console.log('Testing generateMask...');

    // Use a public image that we know has an object
    // Apple image
    const imageUrl = 'https://img.freepik.com/free-photo/red-fresh-apple-isolated-white-background_1232-2868.jpg?w=740&t=st=1705350000~exp=1705350600~hmac=...';
    // Just a sample URL - actually let's use a simpler one or one from Wikipedia
    const safeImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Red_Apple.jpg/440px-Red_Apple.jpg';

    // Approximate box for the apple in the wikimedia image
    // It's mostly central. 
    // Image is 440x... let's say 440x440 roughly.
    // Apple is roughly at 100, 50, 240, 300
    const box = { x: 50, y: 50, w: 300, h: 300 };

    try {
        const maskUrl = await generateMask(safeImageUrl, box);
        console.log('Success! Mask URL:', maskUrl);
    } catch (e) {
        console.error('Failed to generate mask:', e);
    }
}

test();
