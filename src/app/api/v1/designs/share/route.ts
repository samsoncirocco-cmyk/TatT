import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

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

// Seed with demo designs so the gallery isn't empty
const DEMO_DESIGNS: SharedDesign[] = [
  { shareId: 'demo-1', imageUrl: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=600&q=80', prompt: 'Intricate geometric wolf howling at the moon', style: 'Geometric', bodyPart: 'Upper Arm', generatedAt: '2026-03-01T10:00:00Z', sharedAt: '2026-03-01T10:00:00Z', shareUrl: '/share/demo-1', views: 142 },
  { shareId: 'demo-2', imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80', prompt: 'Japanese koi fish with cherry blossoms flowing', style: 'Japanese', bodyPart: 'Back', generatedAt: '2026-03-01T09:00:00Z', sharedAt: '2026-03-01T09:00:00Z', shareUrl: '/share/demo-2', views: 89 },
  { shareId: 'demo-3', imageUrl: 'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=600&q=80', prompt: 'Fine line minimalist mountain range with compass', style: 'Fine Line', bodyPart: 'Forearm', generatedAt: '2026-02-28T15:00:00Z', sharedAt: '2026-02-28T15:00:00Z', shareUrl: '/share/demo-3', views: 67 },
  { shareId: 'demo-4', imageUrl: 'https://images.unsplash.com/photo-1560949824-ebe85c59f919?w=600&q=80', prompt: 'Blackwork mandala with lotus flower center', style: 'Blackwork', bodyPart: 'Chest', generatedAt: '2026-02-28T11:00:00Z', sharedAt: '2026-02-28T11:00:00Z', shareUrl: '/share/demo-4', views: 201 },
  { shareId: 'demo-5', imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&q=80', prompt: 'Watercolor phoenix rising with vibrant color splash', style: 'Watercolor', bodyPart: 'Shoulder', generatedAt: '2026-02-27T14:00:00Z', sharedAt: '2026-02-27T14:00:00Z', shareUrl: '/share/demo-5', views: 156 },
  { shareId: 'demo-6', imageUrl: 'https://images.unsplash.com/photo-1567168544813-cc03465b4fa8?w=600&q=80', prompt: 'Traditional American eagle with banner and roses', style: 'Traditional', bodyPart: 'Upper Arm', generatedAt: '2026-02-27T10:00:00Z', sharedAt: '2026-02-27T10:00:00Z', shareUrl: '/share/demo-6', views: 93 },
  { shareId: 'demo-7', imageUrl: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=600&q=80', prompt: 'Realism portrait of a lion with geometric background', style: 'Realism', bodyPart: 'Thigh', generatedAt: '2026-02-26T16:00:00Z', sharedAt: '2026-02-26T16:00:00Z', shareUrl: '/share/demo-7', views: 178 },
  { shareId: 'demo-8', imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80', prompt: 'Neo-traditional snake wrapped around a rose', style: 'Neo-Traditional', bodyPart: 'Calf', generatedAt: '2026-02-26T12:00:00Z', sharedAt: '2026-02-26T12:00:00Z', shareUrl: '/share/demo-8', views: 44 },
];

// Initialize demo data
DEMO_DESIGNS.forEach(d => sharedDesignsStore.set(d.shareId, d));

export async function POST(request: NextRequest) {
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
