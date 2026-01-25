import { useEffect } from 'react';
import Button from '../ui/Button';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';

export default function ForgeGuide({
  steps = [],
  stepIndex = 0,
  onNext,
  onPrev,
  onClose,
  onJump
}) {
  const step = steps[stepIndex];

  useEffect(() => {
    if (step?.targetId) {
      const target = document.getElementById(step.targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [step]);

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div
        className="w-full max-w-xl rounded-3xl border border-white/10 bg-gradient-to-br from-black/90 via-black/80 to-black/90 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.65)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forge-guide-title"
        aria-describedby="forge-guide-description"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-studio-neon">
              Forge Guide
            </p>
            <h2
              id="forge-guide-title"
              className="mt-2 text-2xl font-display font-bold text-white"
            >
              {step.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 hover:text-white"
            aria-label="Close guide"
          >
            <X size={16} />
          </button>
        </div>

        <p
          id="forge-guide-description"
          className="mt-3 text-sm text-white/70 leading-relaxed"
        >
          {step.description}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-white/50 font-mono uppercase tracking-wider">
          <span className="rounded-full border border-white/10 px-3 py-1">
            Step {stepIndex + 1} of {steps.length}
          </span>
            {step.targetLabel && (
            <button
              onClick={() => onJump?.(step.targetId)}
              className="rounded-full border border-[rgba(0,255,65,0.4)] px-3 py-1 text-studio-neon hover:text-white hover:border-white/40 transition-colors"
            >
              Jump to {step.targetLabel}
            </button>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            onClick={onPrev}
            disabled={stepIndex === 0}
            variant="outline"
            className="h-11 px-4 text-xs tracking-wider disabled:opacity-40"
            icon={ArrowLeft}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs font-mono uppercase tracking-wider text-white/50 hover:text-white"
            >
              Skip tour
            </button>
            <Button
              onClick={onNext}
              variant="primary"
              className="h-11 px-4 text-xs tracking-wider"
              icon={ArrowRight}
            >
              {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
