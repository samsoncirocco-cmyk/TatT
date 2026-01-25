import type { ReactNode } from 'react';

type HolyGrailLayoutProps = {
    left: ReactNode;
    center: ReactNode;
    right: ReactNode;
    className?: string;
};

export default function HolyGrailLayout({
    left,
    center,
    right,
    className = ''
}: HolyGrailLayoutProps) {
    return (
        <div
            className={`
                grid grid-cols-[280px_minmax(0,1fr)_320px] gap-6
                w-full items-start
                ${className}
            `}
        >
            <div className="min-w-0">{left}</div>
            <div className="min-w-0">{center}</div>
            <div className="min-w-0">{right}</div>
        </div>
    );
}
