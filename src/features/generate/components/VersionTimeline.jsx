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
    <div className="bg-black border-2 hairline p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-body uppercase tracking-[0.3em] text-pink">
            <span className="text-pink">●</span>&nbsp;&nbsp;Version Timeline
          </p>
          <p className="text-[12px] text-white/70 font-body uppercase tracking-[0.18em] mt-1">Auto-saved checkpoints</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => comparePayload && onCompareVersions(comparePayload)}
            disabled={!canCompare}
            className="press text-[10px] font-body uppercase tracking-[0.22em] px-3 py-1 border hairline-white text-white/70 hover:text-black hover:bg-pink hover:border-pink disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white/70"
          >
            <ArrowRightLeft size={11} className="inline mr-1" />
            Compare
          </button>
        </div>
      </div>

      {versions.length === 0 ? (
        <div className="text-[10px] text-white/40 font-body uppercase tracking-[0.22em] border-2 border-dashed hairline p-4">
          No versions yet. Generate or refine to create checkpoints.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {versions.map((version) => (
            <div
              key={version.id}
              className={`min-w-[140px] border-2 p-2 ${
                currentVersionId === version.id
                  ? 'border-pink bg-black'
                  : 'hairline-white bg-black'
              }`}
            >
              <button
                onClick={() => onLoadVersion(version.id)}
                className="w-full text-left"
              >
                <div className="w-full h-20 overflow-hidden bg-black border hairline-white">
                  {version.thumbnail ? (
                    <img
                      src={version.thumbnail}
                      alt={`Version ${version.versionNumber}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-[10px] font-body uppercase tracking-[0.18em]">
                      No preview
                    </div>
                  )}
                </div>
                <div className="mt-2 text-[12px] text-white font-display tracking-wide uppercase">
                  V{version.versionNumber}
                </div>
                <div className="text-[10px] text-white/40 font-body tabular-nums tracking-[0.15em]">
                  {new Date(version.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>

              <div className="mt-2 flex items-center justify-between text-[10px] text-white/40 font-body uppercase tracking-[0.18em]">
                <label className="flex items-center gap-1 cursor-pointer hover:text-pink">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(version.id)}
                    onChange={() => handleSelect(version.id)}
                    className="accent-pink"
                    aria-label={`Select version ${version.versionNumber} for comparison`}
                  />
                  Compare
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onBranchVersion(version.id)}
                    className="press hover:text-pink"
                    title="Branch from this version"
                  >
                    <GitBranch size={12} />
                  </button>
                  <button
                    onClick={() => onDeleteVersion(version.id)}
                    className="press hover:text-pink"
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
