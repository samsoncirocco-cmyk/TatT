import { MapPin } from 'lucide-react';

export default function ArtistMatchCard({ artist }) {
  const thumbnail = artist.thumbnail || artist.portfolioImages?.[0] || artist.portfolio?.[0];
  const matchScore = artist.matchScore ?? artist.score ?? 0;

  return (
    <div className="press flex gap-3 p-3 bg-black border hairline-white hover:border-pink transition-colors">
      <div className="w-12 h-12 overflow-hidden bg-black border hairline-white flex-shrink-0">
        {thumbnail ? (
          <img src={thumbnail} alt={`${artist.name} portfolio preview`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20 text-[10px] font-body uppercase tracking-[0.18em]">
            N/A
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[13px] font-display tracking-wide uppercase text-white">{artist.name}</p>
            {artist.location || artist.city ? (
              <p className="text-[10px] text-white/50 flex items-center gap-1 font-body uppercase tracking-[0.22em] mt-1">
                <MapPin size={10} />
                {artist.location || artist.city}
              </p>
            ) : null}
          </div>
          <div className="text-[11px] font-body text-pink tabular-nums tracking-[0.15em]" aria-label={`Match score ${Math.round(matchScore)} percent`}>
            {Math.round(matchScore)}%
          </div>
        </div>
        {artist.styles?.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {artist.styles.slice(0, 2).map((style) => (
              <span
                key={style}
                className="text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 border hairline bg-black text-white/70 font-body"
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
