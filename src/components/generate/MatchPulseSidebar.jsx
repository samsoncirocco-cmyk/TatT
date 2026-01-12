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
      className={`fixed bottom-6 left-4 right-4 z-30 md:bottom-auto md:top-24 md:right-6 md:left-auto md:z-40 md:w-[320px] lg:static lg:z-auto ${isCollapsed ? 'w-12 md:w-12' : 'w-full'} transition-all duration-300 ${className}`}
      aria-live="polite"
      aria-busy={isLoading}
    >
      <div className={`glass-panel border border-white/10 rounded-3xl h-full flex flex-col ${!isCollapsed ? 'max-h-[60vh] md:max-h-none' : ''}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          {!isCollapsed && (
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-ducks-green">
                Match Pulse
              </p>
              <p className="text-sm text-white mt-1" role="status">
                {totalMatches} Artists found for {context?.style || 'this style'}
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
              <div className="flex items-center gap-2 text-xs font-mono text-white/60">
                <Loader2 className="animate-spin" size={14} />
                Updating matches...
              </div>
            )}

            {error && (
              <div className="text-xs text-red-400">
                {error}
              </div>
            )}

            {!isLoading && !error && topMatches.length === 0 && (
              <div className="text-xs text-white/40">
                No matches yet. Adjust your design to see artists populate here.
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
