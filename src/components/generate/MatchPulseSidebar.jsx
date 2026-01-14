import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ArtistMatchCard from './ArtistMatchCard';
import Button from '../ui/Button';

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
  const navigate = useNavigate();

  const topMatches = useMemo(() => matches.slice(0, 3), [matches]);

  const handleViewAll = () => {
    navigate('/artists', {
      state: {
        matchContext: context,
        matches
      }
    });
  };

  return (
    <aside
      className={`w-full ${isCollapsed ? 'max-w-[48px]' : ''} transition-all duration-300 ${className}`}
      aria-live="polite"
      aria-busy={isLoading}
    >
      <div className={`glass-panel border border-white/10 rounded-3xl h-full flex flex-col ${!isCollapsed ? '' : ''}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          {!isCollapsed && (
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-ducks-green/70">
                Match Pulse
              </p>
              <p className="text-sm text-white mt-1" role="status">
                {totalMatches} artists aligned with {context?.style || 'this style'}
              </p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white/40 hover:text-white transition-colors"
            aria-label="Toggle Match Pulse Sidebar"
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {isLoading && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono text-white/60">
                  <Loader2 className="animate-spin" size={14} />
                  Updating matches...
                </div>
                {[0, 1, 2].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/5 bg-white/5 p-4 animate-pulse">
                    <div className="h-4 w-1/2 bg-white/10 rounded" />
                    <div className="mt-3 h-3 w-2/3 bg-white/5 rounded" />
                    <div className="mt-3 h-8 w-full bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="text-xs text-red-400">
                {error}
              </div>
            )}

            {!isLoading && !error && topMatches.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-xs text-white/60">
                <p className="text-sm text-white/80">Waiting for design signal.</p>
                <p className="mt-2 text-white/50">
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
          <div className="p-4 border-t border-white/10">
            <Button
              onClick={handleViewAll}
              className="w-full text-xs font-black tracking-wider bg-ducks-yellow text-black hover:bg-white"
            >
              View All Artists
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
