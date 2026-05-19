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
    <div className="min-h-screen bg-studio-bg text-white flex flex-col">
      {/* Top nav */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-studio-panel/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-primary text-2xl font-bold tracking-tighter">
            TatT
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-widest border border-border-primary text-primary rounded">
            Pro
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            aria-label="Profile"
            className="w-8 h-8 rounded-full bg-studio-elevated border border-border-subtle flex items-center justify-center hover:border-border-primary transition"
          >
            <span className="material-symbols-outlined text-base">person</span>
          </button>
          <button
            aria-label="Exit"
            className="w-8 h-8 rounded-full bg-studio-elevated border border-border-subtle flex items-center justify-center hover:border-border-primary transition"
          >
            <span className="material-symbols-outlined text-base">logout</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {leftSidebar && (
          <aside className="hidden lg:block w-60 shrink-0 border-r border-border-subtle bg-studio-panel/40">
            {leftSidebar}
          </aside>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>

        {rightSidebar && (
          <aside className="hidden xl:block w-80 shrink-0 border-l border-border-subtle bg-studio-panel/40">
            {rightSidebar}
          </aside>
        )}
      </div>
    </div>
  );
}
