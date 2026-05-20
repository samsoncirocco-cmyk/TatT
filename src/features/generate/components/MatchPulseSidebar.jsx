import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ArtistMatchCard from './ArtistMatchCard';
import Button from '@/components/ui/Button';

export default function MatchPulseSidebar({
  matches = [],
  totalMatches = 0,
  isLoading = false,
  error = null,
  context = {},
  className = ''
}) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });
  const router = useRouter();

  const topMatches = useMemo(() => matches.slice(0, 3), [matches]);

  const handleViewAll = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tatt_match_context', JSON.stringify(context || {}));
        sessionStorage.setItem('tatt_match_results', JSON.stringify(matches || []));
      }
    } catch (error) {
      console.warn('[MatchPulse] Failed to cache match context:', error);
    }
    router.push('/artists');
  };

  return (
    <aside
      className={`w-full ${isCollapsed ? 'max-w-[48px]' : ''} transition-all duration-300 ${className}`}
      aria-live="polite"
      aria-busy={isLoading}
    >
      <div className="bg-black border-2 hairline h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b-2 hairline">
          {!isCollapsed && (
            <div>
              <p className="text-[10px] font-body uppercase tracking-[0.3em] text-pink">
                <span className="text-pink">●</span>&nbsp;&nbsp;Match Pulse
              </p>
              <p className="text-[12px] text-white mt-2 font-body uppercase tracking-[0.18em]" role="status">
                {totalMatches} artists aligned w/ {context?.style || 'this style'}
              </p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="press text-white/40 hover:text-pink transition-colors"
            aria-label="Toggle Match Pulse Sidebar"
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {isLoading && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-body uppercase tracking-[0.25em] text-pink">
                  <Loader2 className="animate-spin" size={12} />
                  Updating matches...
                </div>
                {[0, 1, 2].map((item) => (
                  <div key={item} className="border hairline-white bg-black p-4 animate-pulse">
                    <div className="h-3 w-1/2 bg-white/10" />
                    <div className="mt-3 h-2 w-2/3 bg-white/5" />
                    <div className="mt-3 h-6 w-full bg-white/5" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="text-[10px] text-pink font-body uppercase tracking-[0.22em] border-2 border-pink p-3">
                {error}
              </div>
            )}

            {!isLoading && !error && topMatches.length === 0 && (
              <div className="border-2 border-dashed hairline bg-black p-4 text-[11px] text-white/60 font-body">
                <p className="text-[13px] font-display tracking-wide uppercase text-white">Waiting for design signal.</p>
                <p className="mt-2 text-white/50 leading-[1.55]">
                  Generate a layer or adjust style to populate artist matches.
                </p>
              </div>
            )}

            {topMatches.map((artist) => (
              <ArtistMatchCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}

        {!isCollapsed && (
          <div className="p-4 border-t-2 hairline">
            <Button
              variant="primary"
              size="md"
              onClick={handleViewAll}
              className="w-full"
            >
              View All Artists
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
