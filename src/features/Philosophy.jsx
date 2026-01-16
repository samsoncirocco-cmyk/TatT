import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function Philosophy() {
    return (
        <div className="min-h-screen pt-24 pb-32 px-6">
            {/* Header */}
            <header className="py-12 max-w-4xl mx-auto text-center">
                <p className="text-ducks-green font-mono font-bold text-[10px] uppercase tracking-[0.3em] mb-6">Verification Protocol // Version 4.2</p>
                <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tighter mb-8 leading-none text-white">
                    Engineering <br /><span className="text-ducks-green italic">Confidence.</span>
                </h1>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
                    TatTester isn't a marketplace. It's a risk-mitigation layer for your physical legacy.
                    We analyzed <span className="text-white font-bold">4,200+ instances of tattoo regret</span> to build the Samson Test—the ultimate filter for skin-borne variables.
                </p>
            </header>

            {/* The Mission */}
            <section className="py-24">
                <div className="max-w-5xl mx-auto glass-panel p-8 md:p-12 rounded-[3rem] border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-ducks-green to-transparent opacity-50" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl font-display font-bold mb-8 italic tracking-tight text-white">The Vision Gap</h2>
                            <p className="text-gray-300 mb-6 leading-relaxed italic border-l-2 border-ducks-green pl-6 font-medium text-lg">
                                "In Life.exe, a tattoo is the only hardcoded variable that cannot be deleted. Most seekers spend 20 months in the Vision Gap before committing."
                            </p>
                            <p className="text-gray-400 mb-6 leading-relaxed text-sm font-light">
                                Our research validates that <strong className="text-white">commitment anxiety</strong> is the #1 barrier to tattooing. 3,800+ seekers report they simply cannot visualize the ink on their body. This creates an 15-20 month lag between inspiration and execution.
                            </p>
                            <p className="text-gray-400 leading-relaxed text-sm font-light">
                                TatTester collapses this lag by providing a high-resolution simulation layer. AR-adjacent metrics show a <strong className="text-white">3.5x increase in booking confidence</strong> when the simulation is executed correctly.
                            </p>
                        </div>
                        <div className="glass-panel border-white/5 bg-black/40 p-12 rounded-3xl flex flex-col items-center justify-center aspect-[4/5] relative overflow-hidden group hover:border-ducks-green/30 transition-colors">
                            <div className="text-center z-10">
                                <div className="text-8xl font-display font-black text-white/5 mb-4 tracking-tighter group-hover:text-ducks-yellow/10 transition-colors duration-700">0.1</div>
                                <div className="text-ducks-green font-mono font-bold text-[10px] uppercase tracking-widest bg-ducks-green/10 px-3 py-1 rounded-full">Protocol: Verified</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Samson Test Visualization */}
            <section className="py-24">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-display font-bold mb-4 text-center tracking-tighter text-white">The Samson Test</h2>
                    <p className="text-center text-gray-500 mb-16 max-w-xl mx-auto text-xs font-bold uppercase tracking-widest">Minimal Viable Integrity Check</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Approved Case */}
                        <div className="space-y-6">
                            <div className="aspect-square glass-panel p-2 rounded-3xl overflow-hidden border border-ducks-green/30 shadow-glow-green group relative">
                                <img
                                    src="https://replicate.delivery/czjl/OAumTJvdtXaeLiQumdkjD7jju51vsyhnVfi5wldFfXNlyqprA/out-0.png"
                                    alt="Council Approved Design"
                                    className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                                />
                                <div className="absolute top-6 left-6 bg-ducks-green text-black text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg border border-ducks-yellow/20">
                                    Sim Pass: 98%
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-ducks-green/20 text-ducks-green rounded-full flex items-center justify-center font-black text-xs border border-ducks-green/30">✓</div>
                                <h3 className="text-xl font-bold tracking-tight text-white">Status: OPTIMIZED</h3>
                            </div>
                            <ul className="text-[10px] text-gray-400 space-y-3 pl-2 uppercase font-bold tracking-wider">
                                <li className="flex items-center gap-2"><span className="text-ducks-green">•</span> Anatomical Flow Validated</li>
                                <li className="flex items-center gap-2"><span className="text-ducks-green">•</span> Geometric Recursive Depth High</li>
                                <li className="flex items-center gap-2 text-white"><span className="text-ducks-green">•</span> Confidence Delta: +3.5x</li>
                            </ul>
                        </div>

                        {/* Rejected Case */}
                        <div className="space-y-6 opacity-60 translate-y-4 hover:opacity-100 transition-opacity">
                            <div className="aspect-square glass-panel rounded-3xl overflow-hidden border border-red-500/10 flex items-center justify-center p-12 relative">
                                <div className="absolute top-6 right-6 text-red-500/20 font-black text-9xl leading-none select-none">✕</div>
                                <div className="text-center z-10">
                                    <div className="text-[10px] text-red-500 uppercase tracking-widest font-black border border-red-500/20 px-4 py-2 rounded-lg bg-red-500/5">REJECTED</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center font-bold text-xs border border-red-500/20">✕</div>
                                <h3 className="text-xl font-bold tracking-tight text-red-400">Status: ABORTED</h3>
                            </div>
                            <ul className="text-[10px] text-gray-500 space-y-3 pl-2 uppercase font-bold tracking-wider">
                                <li className="flex items-center gap-2"><span>•</span> High Regret-Vector Score</li>
                                <li className="flex items-center gap-2"><span>•</span> Low Visual Intentionality</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Rejection is a Gift */}
            <section className="py-24 px-6 bg-ducks-green rounded-[3rem] text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-noise opacity-10" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-ducks-yellow/20 rounded-full blur-[100px]" />

                <div className="max-w-2xl mx-auto relative z-10">
                    <h2 className="text-3xl font-display font-bold mb-8 italic tracking-tight">"Rejection is the ultimate form of customer service."</h2>
                    <p className="text-white/80 mb-12 text-lg leading-relaxed font-light">
                        Most platforms want you to buy. We want you to be certain. Our system collapses the <strong className="text-white">25-30% cancellation rate</strong> seen in traditional studios by ensuring the Vision Gap is closed before the deposit is paid.
                        <br /><br />
                        Because skin is permanent. There are no undo buttons in Life.exe.
                    </p>
                    <Button
                        onClick={() => window.location.href = '/generate'}
                        className="bg-ducks-yellow text-ducks-green border-ducks-yellow hover:bg-white hover:text-black shadow-xl"
                        size="lg"
                    >
                        Initialize Simulation.exe
                    </Button>
                </div>
            </section>

            {/* Navigation */}
            <footer className="mt-20 text-center">
                <Link to="/" className="text-gray-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-[0.3em]">
                    Return to Simulation Hub
                </Link>
            </footer>
        </div>
    );
}
