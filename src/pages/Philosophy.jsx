import { Link } from 'react-router-dom';

export default function Philosophy() {
    return (
        <div className="min-h-screen bg-white text-gray-900 pb-24">
            {/* Header */}
            <header className="py-20 px-6 max-w-4xl mx-auto text-center border-b border-gray-100">
                <p className="text-purple-600 font-bold text-xs uppercase tracking-widest mb-4">Verification Standards</p>
                <h1 className="text-5xl font-bold tracking-tight mb-6">
                    The <span className="text-purple-600">Samson Test.</span>
                </h1>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
                    TatTester isn't just a directory. It's a gold standard for tattoo quality.
                    We verify every artist to ensure your physical legacy is in the right hands.
                </p>
            </header>

            {/* The Mission */}
            <section className="py-24 px-6 bg-gray-50/50">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                        <div>
                            <h2 className="text-3xl font-bold mb-8">Our Vision</h2>
                            <p className="text-gray-600 mb-6 leading-relaxed italic border-l-4 border-purple-600 pl-6">
                                "A tattoo is a hard-coded variable in a world of digital impermanence."
                            </p>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Life.exe is unforgiving. Your skin is the ultimate ledger. We believe that
                                tattooing is one of the last few human-centric, permanent trades.
                            </p>
                            <p className="text-gray-600 leading-relaxed">
                                CoCreate exists to bridge the gap between AI visualization and human craftsmanship.
                                We ensure your design is elegant before it ever touches your skin.
                            </p>
                        </div>
                        <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm flex items-center justify-center aspect-[4/5]">
                            <div className="text-center">
                                <div className="text-6xl font-bold text-gray-100 mb-4 tracking-tighter">01</div>
                                <div className="text-purple-600 font-bold text-xs uppercase tracking-widest">Protocol: Verified</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Samson Test Visualization */}
            <section className="py-24 px-6">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold mb-4 text-center">Quality Benchmarks</h2>
                    <p className="text-center text-gray-500 mb-16 max-w-xl mx-auto">Our AI Council rejects designs that fail to meet our professional standards for saturation, depth, and anatomical flow.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Approved Case */}
                        <div className="space-y-6">
                            <div className="aspect-square bg-gray-100 rounded-3xl overflow-hidden border border-purple-100 shadow-xl group relative">
                                <img
                                    src="/images/approved.png"
                                    alt="Council Approved Design"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-6 left-6 bg-purple-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                                    CoCreate Approved
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
            <section className="py-24 px-6 bg-purple-600 text-center text-white">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-3xl font-bold mb-8 italic">"Rejection is the ultimate form of customer service."</h2>
                    <p className="text-purple-100 mb-12 text-lg leading-relaxed">
                        Most platforms want you to buy. We want you to be certain. If our AI predicts
                        that a design will age poorly or lack depth, we flag it.
                        Because skin is permanent. There are no undo buttons.
                    </p>
                    <Link to="/generate" className="bg-white text-purple-600 px-10 py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-gray-100 transition-colors shadow-2xl">
                        Initialize Design Forge
                    </Link>
                </div>
            </section>

            {/* Navigation */}
            <footer className="mt-20 text-center">
                <Link to="/" className="text-gray-400 hover:text-purple-600 transition-colors text-[10px] font-bold uppercase tracking-widest">
                    Return to Hub
                </Link>
            </footer>
        </div>
    );
}
