import React, { useEffect } from 'react';
import { Merge } from 'lucide-react';

export default function VersionComparison({
    versionA,
    versionB,
    onClose,
    onRestoreA,
    onRestoreB,
    onMerge
}) {
    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!versionA || !versionB) return null;

    // The two columns are identical except for which version they show.
    const columns = [
        { version: versionA, onRestore: onRestoreA },
        { version: versionB, onRestore: onRestoreB }
    ];

    return (
        <div className="fixed inset-0 bg-black/80 halftone z-50 flex items-center justify-center p-4">
            <div className="bg-black border-2 border-pink w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-label="Version comparison">

                {/* Header */}
                <div className="px-6 py-4 border-b-2 hairline flex items-center justify-between">
                    <h2 className="text-[16px] font-display tracking-wide text-white uppercase">
                        <span className="text-pink">●</span>&nbsp;&nbsp;Version Comparison
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-[10px] font-body uppercase tracking-[0.22em] text-white/60 hover:text-pink"
                        aria-label="Close comparison"
                    >
                        Close ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 gap-8 h-full">
                        {columns.map(({ version, onRestore }) => (
                            <div key={version.id} className="flex flex-col h-full">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-pink text-black text-[10px] font-body uppercase tracking-[0.2em] px-2 py-0.5 tabular-nums">
                                            v{version.versionNumber}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-body tabular-nums">
                                            {new Date(version.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => onRestore(version)}
                                        className="press text-[10px] font-body uppercase tracking-[0.2em] text-pink hover:text-black hover:bg-pink border hairline px-3 py-1"
                                    >
                                        Restore This
                                    </button>
                                </div>

                                <div className="bg-black border-2 hairline-white p-2 flex-grow flex items-center justify-center relative">
                                    <img
                                        src={version.imageUrl}
                                        alt={`Version ${version.versionNumber}`}
                                        className="max-h-[60vh] object-contain"
                                    />
                                </div>

                                <div className="mt-4 space-y-2 border hairline-white p-4 text-[12px] text-white/70 font-body leading-[1.55]">
                                    <p><span className="text-pink uppercase text-[10px] tracking-[0.2em]">Prompt:</span> {version.metadata?.prompt || version.prompt || 'N/A'}</p>
                                    <p><span className="text-pink uppercase text-[10px] tracking-[0.2em]">Model:</span> {version.metadata?.model || version.parameters?.aiModel || 'N/A'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer with Merge button */}
                {onMerge && (
                    <div className="px-6 py-4 border-t-2 hairline flex items-center justify-center">
                        <button
                            onClick={() => onMerge(versionA, versionB)}
                            className="press flex items-center gap-2 px-6 py-3 bg-pink text-black font-display uppercase text-[14px] tracking-[0.2em] hover:bg-pink-deep"
                        >
                            <Merge size={18} />
                            Merge layers from both versions
                        </button>
                        <p className="ml-4 text-[10px] uppercase tracking-[0.18em] text-white/40 font-body">
                            Combines all layers from both versions into a new design
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
}
