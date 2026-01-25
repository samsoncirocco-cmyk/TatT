/**
 * Stencil View Toggle Component
 *
 * Allows users to toggle between color view and binary stencil view
 * for thermal printer preparation
 */

import { useState } from 'react';
import { FileImage, Download } from 'lucide-react';
import { generateStencil, downloadStencil, STENCIL_SIZES } from '../../services/stencilService';

export default function StencilViewToggle({
    layers,
    canvasWidth,
    canvasHeight,
    compositeImageUrl,
    stencilSize = 'medium'
}) {
    const [isStencilView, setIsStencilView] = useState(false);
    const [stencilDataUrl, setStencilDataUrl] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({
        threshold: 128,
        contrast: 1.2,
        brightness: 0,
        invert: false
    });

    const handleToggle = async () => {
        if (!isStencilView && !stencilDataUrl && compositeImageUrl) {
            // Generate stencil view
            setIsGenerating(true);
            try {
                const stencil = await generateStencil(
                    compositeImageUrl,
                    stencilSize,
                    settings,
                    'threshold'
                );
                setStencilDataUrl(stencil);
                setIsStencilView(true);
            } catch (error) {
                console.error('[StencilView] Failed to generate stencil:', error);
                alert('Failed to generate stencil view. Please try again.');
            } finally {
                setIsGenerating(false);
            }
        } else {
            // Toggle between views
            setIsStencilView(!isStencilView);
        }
    };

    const handleRegenerate = async () => {
        if (!compositeImageUrl) return;

        setIsGenerating(true);
        try {
            const stencil = await generateStencil(
                compositeImageUrl,
                stencilSize,
                settings,
                'threshold'
            );
            setStencilDataUrl(stencil);
        } catch (error) {
            console.error('[StencilView] Failed to regenerate stencil:', error);
            alert('Failed to regenerate stencil. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!stencilDataUrl) return;

        const sizeInfo = STENCIL_SIZES[stencilSize];
        const filename = `tattoo-stencil-${sizeInfo.inches}in.png`;
        downloadStencil(stencilDataUrl, filename);
    };

    return (
        <div className="space-y-4">
            {/* Toggle Button */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleToggle}
                    disabled={isGenerating || !compositeImageUrl}
                    className={`flex-1 h-12 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        isStencilView
                            ? 'bg-studio-neon text-black'
                            : 'bg-white/10 text-white hover:bg-white/20'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    aria-label={isStencilView ? 'Exit stencil view' : 'Enter stencil view'}
                >
                    <FileImage className="w-4 h-4" />
                    {isGenerating ? 'Generating...' : isStencilView ? 'Color View' : 'Stencil View'}
                </button>

                {stencilDataUrl && (
                    <>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="h-12 px-4 rounded-xl font-bold text-sm bg-white/10 text-white hover:bg-white/20 transition-colors"
                            aria-label="Stencil settings"
                        >
                            Settings
                        </button>
                        <button
                            onClick={handleDownload}
                            className="h-12 px-4 rounded-xl font-bold text-sm bg-studio-accent text-white hover:bg-[rgba(255,62,0,0.9)] transition-colors flex items-center gap-2"
                            aria-label="Download stencil"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </>
                )}
            </div>

            {/* Settings Panel */}
            {showSettings && stencilDataUrl && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        Stencil Settings
                    </h4>

                    {/* Threshold */}
                    <div className="space-y-2">
                        <label className="flex items-center justify-between text-xs text-white/70">
                            <span>Threshold</span>
                            <span className="font-mono">{settings.threshold}</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="255"
                            value={settings.threshold}
                            onChange={(e) => setSettings({ ...settings, threshold: parseInt(e.target.value) })}
                            className="w-full"
                            aria-label="Threshold level"
                        />
                        <p className="text-xs text-white/50">
                            Lower = more black, Higher = more white
                        </p>
                    </div>

                    {/* Contrast */}
                    <div className="space-y-2">
                        <label className="flex items-center justify-between text-xs text-white/70">
                            <span>Contrast</span>
                            <span className="font-mono">{settings.contrast.toFixed(1)}</span>
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={settings.contrast}
                            onChange={(e) => setSettings({ ...settings, contrast: parseFloat(e.target.value) })}
                            className="w-full"
                            aria-label="Contrast level"
                        />
                    </div>

                    {/* Brightness */}
                    <div className="space-y-2">
                        <label className="flex items-center justify-between text-xs text-white/70">
                            <span>Brightness</span>
                            <span className="font-mono">{settings.brightness}</span>
                        </label>
                        <input
                            type="range"
                            min="-100"
                            max="100"
                            value={settings.brightness}
                            onChange={(e) => setSettings({ ...settings, brightness: parseInt(e.target.value) })}
                            className="w-full"
                            aria-label="Brightness level"
                        />
                    </div>

                    {/* Invert */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.invert}
                            onChange={(e) => setSettings({ ...settings, invert: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <span className="text-xs text-white/70">Invert colors</span>
                    </label>

                    {/* Regenerate Button */}
                    <button
                        onClick={handleRegenerate}
                        disabled={isGenerating}
                        className="w-full h-10 px-4 rounded-xl font-bold text-sm bg-studio-accent text-white hover:bg-[rgba(255,62,0,0.9)] transition-colors disabled:opacity-50"
                    >
                        {isGenerating ? 'Regenerating...' : 'Apply Changes'}
                    </button>
                </div>
            )}

            {/* Preview Badge */}
            {isStencilView && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[rgba(0,255,65,0.2)] border border-[rgba(0,255,65,0.3)] rounded-full">
                    <div className="w-2 h-2 rounded-full bg-studio-neon animate-pulse" />
                    <span className="text-xs font-mono text-studio-neon uppercase tracking-wider">
                        Stencil Mode
                    </span>
                </div>
            )}
        </div>
    );
}
