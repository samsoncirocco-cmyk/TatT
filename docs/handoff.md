# Project Handoff - Artist Image Generation

## Project Context
The initial problem identified was that artist portfolio pages (e.g., `/artists` and individual artist profiles like `/artists/2`) were displaying empty portfolios. This was due to placeholder image URLs in `src/data/artists.json` that did not resolve to actual images.

## Problem Identification & Initial Fixes
During the initial investigation, two schema mismatches were found and corrected:
1.  **`Artists.jsx`**: Expected `artist.specialties` but the data contained `artist.styles`.
2.  **`ArtistProfile.jsx`**: Expected `artist.location.display` but `location` was a string; also, `artist.startingPrice` was missing and should have been `hourlyRate`.
These frontend issues were resolved to ensure proper data display once images were available.

## Image Generation Solution - Professional MVP
To address the missing portfolio images, the "Professional MVP" option was chosen: generating real AI-powered tattoo images for the top 20 artists and retaining styled placeholders for the rest. This approach balances cost and time while demonstrating AI capability.

### `scripts/generate-artist-images.js`
A Node.js script, `scripts/generate-artist-images.js`, was created and refined to automate the image generation process using the Replicate API.

**Key Features of the Script:**
*   **Replicate Model:** Utilizes the `windxtech/tattoo-generator` model with version `4bc1533722f56e5e67505e4e968cc52d21712d11abe041467173e997c1339fe4`.
*   **Prompt Generation:** Constructs descriptive prompts for the AI model based on each artist's `styles` and `tags` from `artists.json`.
*   **Style Mapping:** Includes logic to map artist styles to the specific allowed values required by the Replicate model's `style` parameter (e.g., "Japanese" to "Japanese Irezumi", "Blackwork" to "Black and Grey"). Styles not explicitly supported by the model's `style` parameter are omitted from that parameter but remain in the text prompt.
*   **Rate Limiting Handling:** Incorporates a 15-second delay between each artist's image generation request to comply with Replicate API rate limits.
*   **Retry Mechanism:** Implements a retry logic (up to 3 attempts) for each image generation to handle transient network issues or API errors, with exponential backoff on rate limit errors.
*   **Incremental Saving:** The script saves the updated `artists.json` file after successfully generating images for each artist. This ensures that progress is not lost, even if the script is interrupted or times out.

## Current Status
As of the last check, **4 out of the target 20 artists** have had their portfolio images successfully generated and updated in `src/data/artists.json`. The script has been tested and confirmed to be working correctly.

## How to Complete the Task
Due to the interactive session's command timeout (which is typically around 5 minutes for commands without output), the script cannot complete the entire process of generating images for all 20 artists in a single interactive run.

To fully complete the image generation for the remaining artists, you should run the `scripts/generate-artist-images.js` script in a non-interactive shell environment.

**Instructions:**
1.  Open your terminal or command prompt.
2.  Navigate to your project directory (`/Users/ciroccofam/my-project/tatt-tester`).
3.  Ensure your `REPLICATE_API_TOKEN` environment variable is set. If not, set it using:
    ```bash
    export REPLICATE_API_TOKEN='YOUR_API_TOKEN_HERE'
    ```
    (Replace `'YOUR_API_TOKEN_HERE'` with your actual Replicate API token.)
4.  Execute the script:
    ```bash
    node scripts/generate-artist-images.js
    ```
    This script will continue processing the artists from where it left off (or re-process if no new images were generated for an artist) and update the `artists.json` file. The entire process for 20 artists is estimated to take around 1 hour.

## Alternative Image Generation Service
You mentioned the availability of an `imagegen` service as part of your platform, accessible at `https://tat-t-3x8t.vercel.app/generate`. For future image generation needs, or if you encounter any further issues with the Replicate API, we can explore integrating with your `imagegen` service. This might offer faster generation and potentially avoid external API constraints.
