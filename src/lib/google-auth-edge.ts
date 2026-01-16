import { SignJWT, importPKCS8 } from 'jose';

// Scope for Vertex AI
const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

interface ServiceAccountCredentials {
    client_email: string;
    private_key: string;
    project_id?: string;
}

/**
 * Get Google Access Token suited for Edge Runtime
 * Uses 'jose' to sign a JWT and exchange it for a token via Google OAuth2 endpoint.
 */
export async function getGcpAccessToken(): Promise<string> {
    let credentials: ServiceAccountCredentials | null = null;

    // Try to parse GOOGLE_APPLICATION_CREDENTIALS_JSON or GCP_SERVICE_ACCOUNT_KEY if present
    const jsonCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.GCP_SERVICE_ACCOUNT_KEY;

    if (jsonCreds) {
        try {
            credentials = JSON.parse(jsonCreds);
        } catch (e) {
            console.error('Failed to parse (GCP) service account JSON from env');
        }
    }

    if (!credentials) {
        // Fallback to individual vars
        if (process.env.GCP_SERVICE_ACCOUNT_EMAIL && process.env.GCP_PRIVATE_KEY) {
            credentials = {
                client_email: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix newlines
                project_id: process.env.GCP_PROJECT_ID
            };
        }
    }

    if (!credentials) {
        throw new Error('Missing GCP credentials for Edge Auth. Set GOOGLE_APPLICATION_CREDENTIALS_JSON or GCP_SERVICE_ACCOUNT_EMAIL/KEY.');
    }

    try {
        const now = Math.floor(Date.now() / 1000);
        const privateKey = await importPKCS8(credentials.private_key, 'RS256');

        const jwt = await new SignJWT({
            scope: SCOPES.join(' ')
        })
            .setProtectedHeader({ alg: 'RS256' })
            .setIssuer(credentials.client_email)
            .setAudience('https://oauth2.googleapis.com/token')
            .setIssuedAt(now)
            .setExpirationTime(now + 3600)
            .sign(privateKey);

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Token exchange failed: ${err}`);
        }

        const data = await response.json();
        return data.access_token;

    } catch (error) {
        console.error('Edge Auth Error:', error);
        throw error;
    }
}
