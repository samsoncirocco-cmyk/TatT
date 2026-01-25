import { useMemo, useState } from 'react';
import { ArrowRightLeft, GitBranch, Trash2 } from 'lucide-react';

export default function VersionTimeline({
  versions = [],
  currentVersionId,
  onLoadVersion,
  onBranchVersion,
  onCompareVersions,
  onDeleteVersion
}) {
  const [selectedIds, setSelectedIds] = useState([]);

  const handleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length === 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const canCompare = selectedIds.length === 2;
  const comparePayload = useMemo(() => {
    if (!canCompare) return null;
    return { first: selectedIds[0], second: selectedIds[1] };
  }, [canCompare, selectedIds]);

  return (
    <div className="studio-glass rounded-3xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-studio-neon">
            Version Timeline
          </p>
          <p className="text-sm text-white/70">Auto-saved checkpoints</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => comparePayload && onCompareVersions(comparePayload)}
            disabled={!canCompare}
            className="text-xs font-mono uppercase tracking-wider px-3 py-1 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-white/30 disabled:opacity-40"
          >
            <ArrowRightLeft size={12} className="inline mr-1" />
            Compare
          </button>
        </div>
      </div>

      {versions.length === 0 ? (
        <div className="text-xs text-white/40">
          No versions yet. Generate or refine to create checkpoints.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {versions.map((version) => (
            <div
              key={version.id}
              className={`min-w-[140px] rounded-xl border p-2 ${
                currentVersionId === version.id
                  ? 'border-studio-neon bg-[rgba(0,255,65,0.12)]'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <button
                onClick={() => onLoadVersion(version.id)}
                className="w-full text-left"
              >
                <div className="w-full h-20 rounded-lg overflow-hidden bg-black/40">
                  {version.thumbnail ? (
                    <img
                      src={version.thumbnail}
                      alt={`Version ${version.versionNumber}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                      No preview
                    </div>
                  )}
                </div>
                <div className="mt-2 text-xs text-white/70 font-mono uppercase tracking-wider">
                  V{version.versionNumber}
                </div>
                <div className="text-[10px] text-white/40">
                  {new Date(version.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>

              <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(version.id)}
                    onChange={() => handleSelect(version.id)}
                    aria-label={`Select version ${version.versionNumber} for comparison`}
                  />
                  Compare
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onBranchVersion(version.id)}
                    className="hover:text-white"
                    title="Branch from this version"
                  >
                    <GitBranch size={12} />
                  </button>
                  <button
                    onClick={() => onDeleteVersion(version.id)}
                    className="hover:text-red-400"
                    title="Delete version"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
