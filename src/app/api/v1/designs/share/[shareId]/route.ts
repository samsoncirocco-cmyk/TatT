import { NextRequest, NextResponse } from 'next/server';
import { sharedDesignsStore } from '../route';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;
  const design = sharedDesignsStore.get(shareId);

  if (!design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  // Increment view count
  design.views = (design.views ?? 0) + 1;
  sharedDesignsStore.set(shareId, design);

  return NextResponse.json(design);
}
