import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { verifyApiAuth } from '@/lib/api-auth';

// In-memory store for demo mode (survives process lifetime)
const sharedDesignsStore = new Map<string, SharedDesign>();

export interface SharedDesign {
  shareId: string;
  imageUrl: string;
  prompt: string;
  style?: string;
  bodyPart?: string;
  generatedAt?: string;
  sharedAt: string;
  shareUrl: string;
  views: number;
}

export async function POST(request: NextRequest) {
  const authError = await verifyApiAuth(request);
  if (authError) return authError;

  let body: { imageUrl: string; prompt: string; style?: string; bodyPart?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.imageUrl || !body.prompt) {
    return NextResponse.json({ success: false, error: 'imageUrl and prompt are required' }, { status: 400 });
  }

  const shareId = randomUUID().slice(0, 10);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tatt-app.vercel.app';
  const design: SharedDesign = {
    shareId,
    imageUrl: body.imageUrl,
    prompt: body.prompt,
    style: body.style,
    bodyPart: body.bodyPart,
    generatedAt: new Date().toISOString(),
    sharedAt: new Date().toISOString(),
    shareUrl: `${baseUrl}/share/${shareId}`,
    views: 0,
  };

  sharedDesignsStore.set(shareId, design);

  // Persist to file for durability
  try {
    const dir = '/tmp/tatt-data';
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, 'shared-designs.jsonl'), JSON.stringify(design) + '\n');
  } catch { /* non-fatal */ }

  return NextResponse.json({ success: true, shareId, shareUrl: design.shareUrl });
}

// Export for use in other routes
export { sharedDesignsStore };
