
import fs from 'fs/promises';
import path from 'path';

const artistsFilePath = path.join(process.cwd(), 'src/data/artists.json');

// Using the deployed Railway proxy to avoid needing a local Replicate token
const PROXY_URL = 'https://tatt-production.up.railway.app/api';

async function generateArtistImages() {
  try {
    // 1. Read artists.json
    const artistsData = JSON.parse(await fs.readFile(artistsFilePath, 'utf-8'));
    const artists = artistsData.artists;

    // Use the specific version that was working
    const modelVersion = "4bc1533722f56e5e67505e4e968cc52d21712d11abe041467173e997c1339fe4";

    const allowedReplicateStyles = [
      "Realism", "Traditional", "Neo-Traditional", "Japanese Irezumi",
      "Black and Grey", "Watercolor", "Minimalist", "Geometric", "Tribal"
    ];

    // NOTE: Generating images for ALL artists now, not just the first 20 if needed, 
    // but the original script had a limit of 20. I'll respect the loop limit but 
    // ensure we check if they already have images.
    console.log(`Generating images for artists using remote proxy...`);

    // Loop through the first 20 artists (or all if fewer)
    for (let i = 0; i < Math.min(20, artists.length); i++) {
      const artist = artists[i];

      // Skip if artist already has images
      // Skip if artist already has REAL images (not placeholders)
      if (artist.portfolioImages && artist.portfolioImages.length > 0) {
        const isPlaceholder = artist.portfolioImages[0].includes('placeholder');
        if (!isPlaceholder) {
          console.log(`Skipping Artist ${artist.id}: ${artist.name} (Already has generated images)`);
          continue;
        }
      }

      let primaryStyle = artist.styles[0];
      const otherStyles = artist.styles.slice(1).join(', ');
      const tags = artist.tags.join(', ');

      let replicateStyle = null;
      if (primaryStyle === "Japanese") {
        replicateStyle = "Japanese Irezumi";
      } else if (primaryStyle === "Blackwork") {
        replicateStyle = "Black and Grey";
      } else if (allowedReplicateStyles.includes(primaryStyle)) {
        replicateStyle = primaryStyle;
      }

      let prompt = `A ${primaryStyle} tattoo design`;
      if (otherStyles) {
        prompt += ` in ${otherStyles} styles`;
      }
      prompt += ` featuring ${tags}.`;

      console.log(`Artist ${artist.id}: ${artist.name}`);
      console.log(`Prompt: ${prompt}`);

      let generatedImages = [];
      const maxRetries = 3;
      let attempt = 0;
      let success = false;

      while (attempt < maxRetries && !success) {
        attempt++;
        console.log(`Attempt ${attempt} to generate images for ${artist.name}...`);
        try {
          const input = {
            prompt: prompt,
            num_outputs: 3, // Generate 3 images per artist
            seed: artist.id * 100 + attempt // Vary seed slightly for retries
          };

          if (replicateStyle) {
            input.style = replicateStyle;
          }

          // --- Step 1: Create Prediction via Proxy ---
          const createResponse = await fetch(`${PROXY_URL}/predictions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              version: modelVersion,
              input: input
            })
          });

          if (!createResponse.ok) {
            throw new Error(`Failed to create prediction: ${createResponse.status} ${createResponse.statusText}`);
          }

          const prediction = await createResponse.json();
          console.log(`Prediction created with ID: ${prediction.id}. Status: ${prediction.status}`);

          // --- Step 2: Poll for Completion ---
          let result = prediction;
          const maxPollingAttempts = 60; // 2 minutes max
          let pollingAttempts = 0;

          while (result.status !== 'succeeded' && result.status !== 'failed' && result.status !== 'canceled' && pollingAttempts < maxPollingAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
            pollingAttempts++;

            const statusResponse = await fetch(`${PROXY_URL}/predictions/${prediction.id}`);
            if (!statusResponse.ok) {
              console.warn(`Failed to check status (attempt ${pollingAttempts}): ${statusResponse.status}`);
              continue;
            }
            result = await statusResponse.json();
            // Optional: console.log(`Polling... Status: ${result.status}`);
          }

          if (result.status === 'succeeded' && result.output && result.output.length > 0) {
            console.log(`Generated ${result.output.length} images for ${artist.name} on attempt ${attempt}.`);
            generatedImages = result.output;
            success = true;

            // Update artist object
            artist.portfolioImages = generatedImages;

            // Save progress after each artist
            await fs.writeFile(artistsFilePath, JSON.stringify(artistsData, null, 2), 'utf-8');
            console.log(`Saved updated data for ${artist.name} to src/data/artists.json.`);
          } else {
            console.warn(`Generation failed or timed out for ${artist.name}. Final status: ${result.status}`);
            if (result.error) console.error("Error from API:", result.error);
          }

        } catch (error) {
          console.error(`Error generating images for ${artist.name} on attempt ${attempt}:`, error);
          if (attempt < maxRetries) {
            const retryDelay = 5000;
            console.log(`Retrying in ${retryDelay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      if (!success) {
        console.warn(`Failed to generate images for ${artist.name} after ${maxRetries} attempts, keeping placeholders.`);
      }
      console.log('---');

      // Delay to be nice to the proxy/API
      if (i < Math.min(20, artists.length) - 1) {
        console.log('Waiting for 5 seconds before the next artist request...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Final save just in case
    await fs.writeFile(artistsFilePath, JSON.stringify(artistsData, null, 2), 'utf-8');
    console.log('Processing complete. src/data/artists.json updated.');

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

generateArtistImages();
