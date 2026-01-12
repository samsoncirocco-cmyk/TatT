import React, { useEffect } from 'react';

export default function VersionComparison({
    versionA,
    versionB,
    onClose,
    onRestoreA,
    onRestoreB
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

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel border border-white/10 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-label="Version comparison">

                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/30">
                    <h2 className="text-xl font-bold text-white">Version Comparison</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60"
                        aria-label="Close comparison"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 gap-8 h-full">

                        {/* Version A (Left) */}
                        <div className="flex flex-col h-full">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="bg-blue-500/20 text-blue-200 text-xs font-bold px-2 py-0.5 rounded">
                                        v{versionA.versionNumber}
                                    </span>
                                    <span className="text-sm text-white/50">
                                        {new Date(versionA.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <button
                                    onClick={() => onRestoreA(versionA)}
                                    className="text-sm text-blue-200 hover:text-white font-medium"
                                >
                                    Restore This
                                </button>
                            </div>

                            <div className="bg-black/40 rounded-lg border border-white/10 p-2 flex-grow flex items-center justify-center relative group">
                                <img
                                    src={versionA.imageUrl}
                                    alt={`Version ${versionA.versionNumber}`}
                                    className="max-h-[60vh] object-contain shadow-sm rounded"
                                />
                            </div>

                            <div className="mt-4 space-y-2 bg-black/30 p-4 rounded-lg text-sm text-white/70">
                                <p><strong>Prompt:</strong> {versionA.metadata?.prompt || versionA.prompt || 'N/A'}</p>
                                <p><strong>Model:</strong> {versionA.metadata?.model || versionA.parameters?.aiModel || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Version B (Right) */}
                        <div className="flex flex-col h-full">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="bg-purple-500/20 text-purple-200 text-xs font-bold px-2 py-0.5 rounded">
                                        v{versionB.versionNumber}
                                    </span>
                                    <span className="text-sm text-white/50">
                                        {new Date(versionB.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <button
                                    onClick={() => onRestoreB(versionB)}
                                    className="text-sm text-purple-200 hover:text-white font-medium"
                                >
                                    Restore This
                                </button>
                            </div>

                            <div className="bg-black/40 rounded-lg border border-white/10 p-2 flex-grow flex items-center justify-center relative group">
                                <img
                                    src={versionB.imageUrl}
                                    alt={`Version ${versionB.versionNumber}`}
                                    className="max-h-[60vh] object-contain shadow-sm rounded"
                                />
                            </div>

                            <div className="mt-4 space-y-2 bg-black/30 p-4 rounded-lg text-sm text-white/70">
                                <p><strong>Prompt:</strong> {versionB.metadata?.prompt || versionB.prompt || 'N/A'}</p>
                                <p><strong>Model:</strong> {versionB.metadata?.model || versionB.parameters?.aiModel || 'N/A'}</p>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
