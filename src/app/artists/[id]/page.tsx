'use client';

import dynamic from 'next/dynamic';

const ArtistProfilePage = dynamic(() => import('@/features/ArtistProfile'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <div className="text-center">
        <div className="animate-pulse text-2xl mb-2">🎨</div>
        <p>Loading Artist Profile...</p>
      </div>
    </div>
  )
});

export default function ArtistProfile() {
  return <ArtistProfilePage />;
}
