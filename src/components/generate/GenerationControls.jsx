import Button from '../ui/Button';
import { Loader2, Sparkles, Wand2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function GenerationControls({
  previewImage,
  finalImage,
  isPreviewing,
  isGenerating,
  progress,
  queueLength,
  error,
  onGenerate,
  onRefine,
  onFinalize,
  canGenerate,
  arAsset
}) {
  const showPreview = previewImage && !finalImage;
  const showFinal = Boolean(finalImage);
  const showProgress = isGenerating && progress?.status === 'running';

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
        <div className="relative aspect-square bg-black/40">
          {showFinal && (
            <img
              src={finalImage}
              alt="Final tattoo design"
              className="w-full h-full object-cover"
            />
          )}
          {showPreview && (
            <>
              <img
                src={previewImage}
                alt="Preview tattoo design"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-xs font-mono uppercase tracking-[0.4em] text-white/70 bg-black/50 px-4 py-2 rounded-full border border-white/20">
                  Preview
                </div>
              </div>
            </>
          )}
          {!showPreview && !showFinal && (
            <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm font-mono uppercase tracking-widest">
              Awaiting generation
            </div>
          )}
          {isPreviewing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="animate-spin text-white" size={28} />
            </div>
          )}
        </div>

        <div className="p-5 space-y-4 border-t border-white/10">
          {showProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-white/70">
                <span>Rendering high-res</span>
                <span>{progress?.etaSeconds ?? '--'}s remaining</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-studio-accent transition-all duration-500"
                  style={{ width: `${Math.round((progress?.percent || 0) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {queueLength > 0 && (
            <div className="text-xs font-mono text-white/50">
              Queue: {queueLength} pending request{queueLength > 1 ? 's' : ''}
            </div>
          )}

          {arAsset?.url && (
            <div className="text-xs font-mono text-studio-neon opacity-80 flex items-center gap-2">
              <CheckCircle2 size={14} />
              AR-ready PNG prepared
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          onClick={onGenerate}
          disabled={!canGenerate || isPreviewing || isGenerating}
          variant="outline"
          className="h-14 text-sm tracking-wider"
          icon={Sparkles}
        >
          Generate
        </Button>
        <Button
          onClick={onRefine}
          disabled={!previewImage || isGenerating}
          variant="secondary"
          className="h-14 text-sm tracking-wider"
          icon={Wand2}
        >
          Refine
        </Button>
        <Button
          onClick={onFinalize}
          disabled={!previewImage || isGenerating}
          variant="primary"
          className="h-14 text-sm tracking-wider"
          icon={CheckCircle2}
        >
          Finalize
        </Button>
      </div>
    </div>
  );
}
