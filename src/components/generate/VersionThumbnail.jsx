import React from 'react';

export default function VersionThumbnail({
    version,
    isActive,
    onClick,
    onBranch,
    onCompare
}) {
    const { imageUrl, versionNumber, timestamp, metadata } = version;

    // Format timestamp (e.g., "12:30 PM")
    const timeString = new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div
            className={`
        relative flex-shrink-0 w-32 cursor-pointer transition-all duration-200 group
        ${isActive ? 'ring-2 ring-blue-500 scale-105 z-10' : 'hover:scale-105 opacity-80 hover:opacity-100'}
      `}
            onClick={onClick}
        >
            {/* Image Container */}
            <div className="bg-gray-800 rounded-lg overflow-hidden shadow-md aspect-square border border-gray-700">
                <img
                    src={imageUrl}
                    alt={`Version ${versionNumber}`}
                    className="w-full h-full object-cover"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-2">
                    {onBranch && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onBranch(version); }}
                            className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 shadow-sm transform hover:scale-105"
                            title="Branch from this version"
                        >
                            Branch It
                        </button>
                    )}
                    {onCompare && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onCompare(version); }}
                            className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 shadow-sm transform hover:scale-105"
                            title="Compare with current"
                        >
                            Compare
                        </button>
                    )}
                </div>
            </div>

            {/* Metadata */}
            <div className="mt-1 text-center">
                <div className="flex items-center justify-center gap-1">
                    <span className={`text-xs font-bold ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                        v{versionNumber}
                    </span>
                    <span className="text-[10px] text-gray-400">
                        {timeString}
                    </span>
                </div>
                {metadata?.model && (
                    <div className="text-[9px] text-gray-400 truncate max-w-full px-1">
                        {metadata.model}
                    </div>
                )}
            </div>

            {/* Active Indicator Triangle */}
            {isActive && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-blue-500" />
            )}
        </div>
    );
}
