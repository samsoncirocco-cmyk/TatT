'use client';

import dynamic from 'next/dynamic';

const PhilosophyPage = dynamic(() => import('@/features/Philosophy'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <div className="text-center">
        <div className="animate-pulse text-2xl mb-2">📜</div>
        <p>Loading Philosophy...</p>
      </div>
    </div>
  )
});

export default function Philosophy() {
  return <PhilosophyPage />;
}
