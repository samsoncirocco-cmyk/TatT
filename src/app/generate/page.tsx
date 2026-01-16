'use client';

import dynamic from 'next/dynamic';

const LegacyContent = dynamic(() => import('@/features/Generate'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      Loading Forge...
    </div>
  )
});

export default function GeneratePage() {
  return (
    <div className="h-screen w-full bg-black">
      <LegacyContent />
    </div>
  );
}
