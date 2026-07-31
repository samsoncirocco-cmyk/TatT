import type { DesignJourney } from "./designJourney";

export default function DesignJourneyRail({
  journey,
  compact = false,
}: {
  journey: DesignJourney;
  compact?: boolean;
}) {
  return (
    <ol
      aria-label="Suggested tattoo path"
      className={`grid grid-cols-4 ${compact ? "gap-1" : "gap-2"}`}
    >
      {journey.steps.map((step, index) => (
        <li key={step.label} className="min-w-0">
          <div
            className={`h-1 ${
              step.state === "available"
                ? "bg-pink"
                : step.state === "recommended"
                  ? "bg-white"
                  : "bg-white/15"
            }`}
          />
          <div
            className={`${compact ? "mt-1.5" : "mt-2"} text-[10px] uppercase tracking-[0.14em] font-body truncate ${
              step.state === "recommended"
                ? "text-white"
                : step.state === "available"
                  ? "text-pink"
                  : "text-white/30"
            }`}
          >
            <span className="sr-only">
              Step {index + 1}, {step.state}:{" "}
            </span>
            {step.label}
          </div>
        </li>
      ))}
    </ol>
  );
}
