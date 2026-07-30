import { useEffect } from 'react';
import Button from '../ui/Button';
import { ArrowRight, ArrowLeft } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 halftone px-4">
      <div
        className="w-full max-w-xl bg-black border-2 border-pink"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forge-guide-title"
        aria-describedby="forge-guide-description"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b-2 hairline">
          <div>
            <p className="text-[10px] font-body uppercase tracking-[0.28em] text-pink">
              <span className="text-pink">●</span>&nbsp;&nbsp;Studio Guide
            </p>
            <h2
              id="forge-guide-title"
              className="mt-2 text-[24px] font-display tracking-wide uppercase text-white leading-none"
            >
              {step.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[10px] font-body uppercase tracking-[0.22em] text-white/60 hover:text-pink"
            aria-label="Close guide"
          >
            Close ✕
          </button>
        </div>

        <div className="p-6">
          <p
            id="forge-guide-description"
            className="text-[13px] text-white/70 font-body leading-[1.55]"
          >
            {step.description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-[10px] text-white/50 font-body uppercase tracking-[0.2em]">
            <span className="border hairline-white px-3 py-1 tabular-nums">
              Step {stepIndex + 1} of {steps.length}
            </span>
            {step.targetLabel && (
              <button
                onClick={() => onJump?.(step.targetId)}
                className="press border hairline px-3 py-1 text-pink hover:bg-pink hover:text-black"
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
              size="md"
              icon={ArrowLeft}
            >
              Back
            </Button>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="text-[10px] font-body uppercase tracking-[0.22em] text-white/50 hover:text-pink"
              >
                Skip tour
              </button>
              <Button
                onClick={onNext}
                variant="primary"
                size="md"
                icon={ArrowRight}
              >
                {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
