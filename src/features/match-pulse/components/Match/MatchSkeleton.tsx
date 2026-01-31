import { Pulse } from '../shared/Motion';

export default function MatchSkeleton() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-4">
                {/* Header Skeleton */}
                <Pulse className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                    </div>
                </Pulse>

                {/* Card Skeletons */}
                {[1, 2, 3].map((i) => (
                    <Pulse key={i} className="w-full bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                            <div className="w-16 h-6 bg-gray-200 dark:bg-gray-800 rounded-full" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-4/5" />
                        </div>
                    </Pulse>
                ))}
            </div>
        </div>
    );
}
