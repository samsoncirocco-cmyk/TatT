import type { ReactNode } from "react";

type StudioShellProps = {
  children: ReactNode;
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
};

export default function StudioShell({
  children,
  leftSidebar,
  rightSidebar,
}: StudioShellProps) {
  return (
    <div className="paper-grain foxing min-h-screen text-ink font-body flex flex-col relative">
      {/* Top nav — looks like a parlor sign nailed above the door */}
      <header className="relative z-10 border-b-2 border-ink bg-bone">
        <div className="flex items-stretch justify-between">
          {/* Brand block */}
          <div className="flex items-center gap-4 px-4 sm:px-6 py-3 border-r-2 border-ink">
            <span className="font-display text-3xl sm:text-4xl leading-none tracking-tight">
              Ta<span className="text-oxblood">tT</span>
            </span>
            <span className="hidden sm:inline-block font-mono text-[10px] uppercase tracking-[0.25em] border border-ink px-1.5 py-0.5 -rotate-2 bg-bone-dark">
              Est. Now
            </span>
          </div>

          {/* Center ribbon */}
          <div className="hidden md:flex flex-1 items-center justify-center px-4 border-r-2 border-ink relative overflow-hidden">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 ornamental-rule opacity-40" />
            <span className="relative bg-bone px-3 font-mono text-[10px] uppercase tracking-[0.4em] text-ink-soft">
              · Flash & Custom · Walk-Ins Welcome · No Cover-Ups Refused ·
            </span>
          </div>

          {/* User actions */}
          <div className="flex items-stretch">
            <button
              aria-label="Profile"
              className="w-12 sm:w-14 flex items-center justify-center border-l-2 border-ink hover:bg-ink hover:text-bone transition"
            >
              <span className="material-symbols-outlined text-lg">person</span>
            </button>
            <button
              aria-label="Exit"
              className="w-12 sm:w-14 flex items-center justify-center border-l-2 border-ink hover:bg-oxblood hover:text-bone transition"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        {leftSidebar && (
          <aside className="hidden lg:block w-60 shrink-0 border-r-2 border-ink bg-bone-dark/40">
            {leftSidebar}
          </aside>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>

        {rightSidebar && (
          <aside className="hidden xl:block w-80 shrink-0 border-l-2 border-ink bg-bone-dark/40 relative">
            {rightSidebar}
          </aside>
        )}
      </div>
    </div>
  );
}
