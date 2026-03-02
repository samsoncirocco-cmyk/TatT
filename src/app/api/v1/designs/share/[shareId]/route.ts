import { NextRequest, NextResponse } from 'next/server';
import { sharedDesignsStore } from '../route';

export async function GET(
  _request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  const design = sharedDesignsStore.get(params.shareId);

  if (!design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  // Increment view count
  design.views = (design.views ?? 0) + 1;
  sharedDesignsStore.set(params.shareId, design);

  return NextResponse.json(design);
}
