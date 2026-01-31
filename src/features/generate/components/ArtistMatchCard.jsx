import { MapPin } from 'lucide-react';

export default function ArtistMatchCard({ artist }) {
  const thumbnail = artist.thumbnail || artist.portfolioImages?.[0] || artist.portfolio?.[0];
  const matchScore = artist.matchScore ?? artist.score ?? 0;

  return (
    <div className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
        {thumbnail ? (
          <img src={thumbnail} alt={`${artist.name} portfolio preview`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-mono">
            N/A
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-white">{artist.name}</p>
            {artist.location || artist.city ? (
              <p className="text-[10px] text-white/50 flex items-center gap-1 font-mono uppercase tracking-widest">
                <MapPin size={10} />
                {artist.location || artist.city}
              </p>
            ) : null}
          </div>
          <div className="text-xs font-mono text-ducks-yellow" aria-label={`Match score ${Math.round(matchScore)} percent`}>
            {Math.round(matchScore)}%
          </div>
        </div>
        {artist.styles?.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {artist.styles.slice(0, 2).map((style) => (
              <span
                key={style}
                className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-white/60"
              >
                {style}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
