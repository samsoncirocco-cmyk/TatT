import { Link } from 'react-router-dom';

export default function Philosophy() {
    return (
        <div className="min-h-screen bg-white text-gray-900 pb-24">
            {/* Header */}
            <header className="py-20 px-6 max-w-4xl mx-auto text-center border-b border-gray-100">
                <p className="text-ducks-green font-bold text-xs uppercase tracking-widest mb-4">The Samson Protocol</p>
                <h1 className="text-5xl font-bold tracking-tight mb-6">
                    Hardcoded <span className="text-ducks-green">Permanence.</span>
                </h1>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
                    TatTester isn't just a directory. It's the simulation layer for your physical legacy.
                    We verify every artist against the Samson Test to ensure Life.exe doesn't error out on your skin.
                </p>
            </header>

            {/* The Mission */}
            <section className="py-24 px-6 bg-gray-50/50">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                        <div>
                            <h2 className="text-3xl font-bold mb-8 italic">The Narrative</h2>
                            <p className="text-gray-600 mb-6 leading-relaxed italic border-l-4 border-ducks-green pl-6">
                                "In a world of digital shadows, a tattoo is the only variable that cannot be deleted."
                            </p>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Life.exe is unforgiving. Your skin is the ultimate ledger. We believe that
                                tattooing is one of the last few human-centric, permanent trades.
                            </p>
                            <p className="text-gray-600 leading-relaxed">
                                TatTester exists to bridge the gap between AI visualization and human craftsmanship.
                                We ensure your design is elegant before it ever touches your skin.
                            </p>
                        </div>
                        <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm flex items-center justify-center aspect-[4/5]">
                            <div className="text-center">
                                <div className="text-6xl font-bold text-gray-100 mb-4 tracking-tighter">0.1</div>
                                <div className="text-ducks-green font-bold text-xs uppercase tracking-widest">Protocol: Verified</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Samson Test Visualization */}
            <section className="py-24 px-6">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold mb-4 text-center">The Samson Test</h2>
                    <p className="text-center text-gray-500 mb-16 max-w-xl mx-auto">Our AI Council rejects designs that fail to meet our professional standards for saturation, depth, and anatomical flow.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Approved Case */}
                        <div className="space-y-6">
                            <div className="aspect-square bg-gray-100 rounded-3xl overflow-hidden border border-green-100 shadow-xl group relative">
                                <img
                                    src="https://replicate.delivery/czjl/OAumTJvdtXaeLiQumdkjD7jju51vsyhnVfi5wldFfXNlyqprA/out-0.png"
                                    alt="Council Approved Design"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-6 left-6 bg-ducks-green text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                                    Samson Passed
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">✓</div>
                                <h3 className="text-xl font-bold">Status: PASS</h3>
                            </div>
                            <ul className="text-sm text-gray-500 space-y-3 pl-2">
                                <li className="flex items-center gap-2"><span>•</span> Dynamic anatomical flow</li>
                                <li className="flex items-center gap-2"><span>•</span> Recursive geometric depth</li>
                                <li className="flex items-center gap-2"><span>•</span> High-contrast ink saturation</li>
                                <li className="flex items-center gap-2"><span>•</span> "Tactile Scar Tissue" realism</li>
                            </ul>
                        </div>

                        {/* Rejected Case */}
                        <div className="space-y-6 opacity-40 grayscale">
                            <div className="aspect-square bg-gray-50 rounded-3xl overflow-hidden border border-gray-200 flex items-center justify-center p-12">
                                <div className="text-center">
                                    <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">REJECTED</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-xs">✕</div>
                                <h3 className="text-xl font-bold">Status: FAIL</h3>
                            </div>
                            <ul className="text-sm text-gray-500 space-y-3 pl-2">
                                <li className="flex items-center gap-2"><span>•</span> Flat, 2D composition</li>
                                <li className="flex items-center gap-2"><span>•</span> Shaky, amateur linework</li>
                                <li className="flex items-center gap-2"><span>•</span> Poor placement awareness</li>
                                <li className="flex items-center gap-2"><span>•</span> Low visual intentionality</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Rejection is a Gift */}
            <section className="py-24 px-6 bg-ducks-green text-center text-white">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-3xl font-bold mb-8 italic">"Rejection is the ultimate form of customer service."</h2>
                    <p className="text-gray-200 mb-12 text-lg leading-relaxed font-light">
                        Most platforms want you to buy. We want you to be certain. If our AI predicts
                        that a design will age poorly or lack depth, we flag it.
                        Because skin is permanent. There are no undo buttons in Life.exe.
                    </p>
                    <Link to="/generate" className="bg-ducks-yellow text-ducks-green px-10 py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-yellow-300 transition-colors shadow-2xl">
                        Initialize Simulation
                    </Link>
                </div>
            </section>

            {/* Navigation */}
            <footer className="mt-20 text-center">
                <Link to="/" className="text-gray-400 hover:text-ducks-green transition-colors text-[10px] font-bold uppercase tracking-widest">
                    Return to Simulation Hub
                </Link>
            </footer>
        </div>
    );
}

