import { Link } from 'react-router-dom';

export default function Philosophy() {
    return (
        <div className="min-h-screen bg-white text-gray-900 pb-24 border-t border-gray-100">
            {/* Header */}
            <header className="py-20 px-6 max-w-4xl mx-auto text-center border-b border-gray-100">
                <p className="text-ducks-green font-bold text-[10px] uppercase tracking-[0.3em] mb-4">Verification Protocol // Version 4.2</p>
                <h1 className="text-5xl font-bold tracking-tighter mb-6 leading-none">
                    Engineering <br /><span className="text-ducks-green italic">Confidence.</span>
                </h1>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed font-medium">
                    TatTester isn't a marketplace. It's a risk-mitigation layer for your physical legacy.
                    We analyzed **4,200+ instances of tattoo regret** to build the Samson Test—the ultimate filter for skin-borne variables.
                </p>
            </header>

            {/* The Mission */}
            <section className="py-24 px-6 bg-gray-50/50">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                        <div>
                            <h2 className="text-3xl font-bold mb-8 italic tracking-tight">The Vision Gap</h2>
                            <p className="text-gray-600 mb-6 leading-relaxed italic border-l-4 border-ducks-green pl-6 font-medium">
                                "In Life.exe, a tattoo is the only hardcoded variable that cannot be deleted. Most seekers spend 20 months in the Vision Gap before committing."
                            </p>
                            <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                                Our research validates that **commitment anxiety** is the #1 barrier to tattooing. 3,800+ seekers report they simply cannot visualize the ink on their body. This creates an 15-20 month lag between inspiration and execution.
                            </p>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                TatTester collapses this lag by providing a high-resolution simulation layer. AR-adjacent metrics show a **3.5x increase in booking confidence** when the simulation is executed correctly.
                            </p>
                        </div>
                        <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm flex items-center justify-center aspect-[4/5] relative overflow-hidden group">
                            <div className="text-center z-10">
                                <div className="text-8xl font-black text-gray-100 mb-4 tracking-tighter group-hover:text-ducks-yellow transition-colors duration-700">0.1</div>
                                <div className="text-ducks-green font-black text-[10px] uppercase tracking-widest">Protocol: Verified</div>
                            </div>
                            <div className="absolute inset-0 bg-ducks-green/0 group-hover:bg-ducks-green/5 transition-colors duration-700" />
                        </div>
                    </div>
                </div>
            </section>

            {/* The Samson Test Visualization */}
            <section className="py-24 px-6">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold mb-4 text-center tracking-tighter">The Samson Test</h2>
                    <p className="text-center text-gray-500 mb-16 max-w-xl mx-auto text-sm font-medium">We reject 25% of designs that fail to meet professional longevity standards. Skin is the ultimate ledger; it doesn't support low-resolution linework.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Approved Case */}
                        <div className="space-y-6">
                            <div className="aspect-square bg-gray-100 rounded-3xl overflow-hidden border border-green-100 shadow-xl group relative">
                                <img
                                    src="https://replicate.delivery/czjl/OAumTJvdtXaeLiQumdkjD7jju51vsyhnVfi5wldFfXNlyqprA/out-0.png"
                                    alt="Council Approved Design"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-6 left-6 bg-ducks-green text-ducks-yellow text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                                    Sim Pass: 98%
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 text-ducks-green rounded-full flex items-center justify-center font-black text-xs">✓</div>
                                <h3 className="text-xl font-bold tracking-tight">Status: OPTIMIZED</h3>
                            </div>
                            <ul className="text-[11px] text-gray-500 space-y-3 pl-2 uppercase font-bold tracking-wider">
                                <li className="flex items-center gap-2"><span>•</span> Anatomical Flow Validated</li>
                                <li className="flex items-center gap-2"><span>•</span> Geometric Recursive Depth High</li>
                                <li className="flex items-center gap-2"><span>•</span> Ink Saturation Predicted: Stable</li>
                                <li className="flex items-center gap-2 text-ducks-green"><span>•</span> Confidence Delta: +3.5x</li>
                            </ul>
                        </div>

                        {/* Rejected Case */}
                        <div className="space-y-6 opacity-40 grayscale translate-y-4">
                            <div className="aspect-square bg-gray-50 rounded-3xl overflow-hidden border border-gray-200 flex items-center justify-center p-12">
                                <div className="text-center">
                                    <svg className="w-20 h-20 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest font-black">REJECTED</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-xs">✕</div>
                                <h3 className="text-xl font-bold tracking-tight">Status: ABORTED</h3>
                            </div>
                            <ul className="text-[11px] text-gray-400 space-y-3 pl-2 uppercase font-bold tracking-wider">
                                <li className="flex items-center gap-2"><span>•</span> High Regret-Vector Score</li>
                                <li className="flex items-center gap-2"><span>•</span> Low Visual Intentionality</li>
                                <li className="flex items-center gap-2"><span>•</span> Potential Anatomy Error</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Rejection is a Gift */}
            <section className="py-24 px-6 bg-ducks-green text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-ducks-yellow opacity-20" />
                <div className="max-w-2xl mx-auto relative z-10">
                    <h2 className="text-3xl font-bold mb-8 italic tracking-tight">"Rejection is the ultimate form of customer service."</h2>
                    <p className="text-gray-200 mb-12 text-lg leading-relaxed font-light">
                        Most platforms want you to buy. We want you to be certain. Our system collapses the **25-30% cancellation rate** seen in traditional studios by ensuring the Vision Gap is closed before the deposit is paid.
                        Because skin is permanent. There are no undo buttons in Life.exe.
                    </p>
                    <Link to="/generate" className="bg-ducks-yellow text-ducks-green px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-yellow-300 transition-all hover:scale-105 shadow-2xl">
                        Initialize Simulation.exe
                    </Link>
                </div>
            </section>

            {/* Navigation */}
            <footer className="mt-20 text-center">
                <Link to="/" className="text-gray-400 hover:text-ducks-green transition-colors text-[10px] font-black uppercase tracking-[0.3em]">
                    Return to Simulation Hub
                </Link>
            </footer>
        </div>
    );
}

