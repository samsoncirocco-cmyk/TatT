import { motion } from 'framer-motion';
import { GitCommit, ArrowUp, ArrowDown, ShieldCheck, Crown } from 'lucide-react';

/**
 * GraphInsight Component
 * 
 * Visualizes the "Genealogy" of an artist (Mentors and Apprentices)
 * as a node-link diagram.
 * 
 * DESIGN GOAL: Show "Network Defensibility" for the YC Pitch.
 */
export default function GraphInsight({ artist, genealogyData }) {
    // Mock data fallback for the pitch demo if DB is down
    const mockGenealogy = {
        directMentor: { id: 'm1', name: 'Don Ed Hardy', isLegend: true },
        mentorChain: [
            { id: 'm2', name: 'Sailor Jerry', isLegend: true },
            { id: 'm3', name: 'Tatsuo Hori', isLegend: true }
        ],
        apprentices: [
            { id: 'a1', name: 'Alex S.', year: 2023 },
            { id: 'a2', name: 'Sarah J.', year: 2024 }
        ]
    };

    const data = genealogyData || mockGenealogy;
    const isInfluential = data.apprentices?.length > 0;

    return (
        <div className="w-full">
            <div className="flex items-center gap-3 mb-6">
                <GitCommit className="text-ducks-green" size={20} />
                <h3 className="text-xl font-display font-bold text-white tracking-wide">
                    Lineage Protocol <span className="text-gray-500 text-sm font-mono ml-2">v4.0</span>
                </h3>
            </div>

            <div className="glass-panel p-8 rounded-3xl border border-white/10 relative overflow-hidden">
                {/* Background Network FX */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-ducks-green/5 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center gap-8">

                    {/* USTREAM: Ancestors / Mentors */}
                    <div className="flex flex-col items-center gap-2">
                        {data.mentorChain?.map((ancestor, i) => (
                            <motion.div
                                key={ancestor.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 0.5 + (i * 0.2), y: 0 }}
                                className="flex flex-col items-center"
                            >
                                <Node
                                    name={ancestor.name}
                                    type="ancestor"
                                    isLegend={ancestor.isLegend}
                                />
                                <Connector />
                            </motion.div>
                        ))}

                        {data.directMentor && (
                            <>
                                <Node
                                    name={data.directMentor.name}
                                    type="mentor"
                                    isLegend={data.directMentor.isLegend}
                                />
                                <Connector active />
                            </>
                        )}
                    </div>

                    {/* CENTER: Current Artist */}
                    <div className="relative">
                        <div className="absolute -inset-4 bg-ducks-green/20 rounded-full blur-xl animate-pulse-glow" />
                        <Node
                            name={artist?.name || "Current Artist"}
                            type="current"
                            img={artist?.portfolioImages?.[0]}
                        />
                    </div>

                    {/* DOWNSTREAM: Apprentices */}
                    {isInfluential && (
                        <>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 w-full max-w-sm">
                                <div className="col-span-2 flex justify-center h-8">
                                    <div className="w-px h-full bg-gradient-to-b from-ducks-green/50 to-white/10" />
                                </div>
                                {/* Horizontal Connector Bar */}
                                <div className="col-span-2 relative h-px bg-white/10 mb-4 -mt-4">
                                    <div className="absolute top-0 left-1/4 bottom-0 w-px h-4 bg-white/10 translate-y-full" />
                                    <div className="absolute top-0 right-1/4 bottom-0 w-px h-4 bg-white/10 translate-y-full" />
                                </div>

                                {data.apprentices.map((apprentice) => (
                                    <motion.div
                                        key={apprentice.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex justify-center"
                                    >
                                        <Node name={apprentice.name} type="apprentice" />
                                    </motion.div>
                                ))}
                            </div>
                        </>
                    )}

                </div>

                {/* Floating Stats */}
                <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
                    <Badge label="Network Strength" value="98%" color="green" />
                    <Badge label="Verified Nodes" value={3 + (data.apprentices?.length || 0)} color="white" />
                </div>

            </div>
        </div>
    );
}

// Sub-components

function Node({ name, type, isLegend, img }) {
    const isCurrent = type === 'current';
    const isMentor = type === 'mentor';
    const isAncestor = type === 'ancestor';

    return (
        <div className={`
      relative flex items-center gap-3 px-4 py-2 rounded-full border transition-all duration-300
      ${isCurrent ? 'bg-black border-ducks-green shadow-glow-green scale-110' : ''}
      ${isMentor ? 'bg-white/5 border-white/20' : ''}
      ${isAncestor ? 'bg-transparent border-white/5 text-gray-500 scale-90' : ''}
      ${type === 'apprentice' ? 'bg-white/5 border-white/10 scale-90' : ''}
    `}>
            {/* Avatar / Icon */}
            <div className={`
        w-8 h-8 rounded-full flex items-center justify-center overflow-hidden
        ${isCurrent ? 'bg-ducks-green text-black' : 'bg-white/10 text-white'}
      `}>
                {img ? (
                    <img src={img} alt={name} className="w-full h-full object-cover" />
                ) : isLegend ? (
                    <Crown size={14} />
                ) : (
                    <span className="text-xs font-bold">{name.charAt(0)}</span>
                )}
            </div>

            {/* Label */}
            <div className="flex flex-col">
                <span className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-gray-300'}`}>
                    {name}
                </span>
                {isLegend && (
                    <span className="text-[8px] uppercase tracking-wider text-ducks-yellow">Legend Node</span>
                )}
                {type === 'apprentice' && (
                    <span className="text-[8px] uppercase tracking-wider text-gray-500">Apprentice</span>
                )}
            </div>

            {/* Verification Badge */}
            {(isCurrent || isMentor) && (
                <ShieldCheck size={12} className="text-ducks-green ml-1" />
            )}
        </div>
    );
}

function Connector({ active }) {
    return (
        <div className="h-8 flex flex-col items-center justify-center">
            <div className={`w-px h-full ${active ? 'bg-ducks-green/50' : 'bg-white/10'}`} />
            {active && <ArrowDown size={12} className="text-ducks-green -mt-1" />}
        </div>
    );
}

function Badge({ label, value, color }) {
    const isGreen = color === 'green';
    return (
        <div className={`
      flex items-center gap-2 px-3 py-1 rounded-lg border backdrop-blur-md
      ${isGreen ? 'bg-ducks-green/10 border-ducks-green/30' : 'bg-white/5 border-white/10'}
    `}>
            <span className="text-[9px] uppercase tracking-widest text-gray-400">{label}</span>
            <span className={`font-mono font-bold text-xs ${isGreen ? 'text-ducks-green' : 'text-white'}`}>
                {value}
            </span>
        </div>
    );
}
