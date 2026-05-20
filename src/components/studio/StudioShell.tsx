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
    <div className="paper-grain min-h-screen text-ink font-body flex flex-col relative">
      <header className="relative z-10 border-b hairline bg-bone">
        <div className="flex items-stretch justify-between">
          <div className="flex items-center px-5 sm:px-8 py-4">
            <span
              className="font-display text-2xl leading-none tracking-[-0.02em]"
              style={{ fontVariationSettings: '"wght" 500, "opsz" 60, "SOFT" 20' }}
            >
              Ta<span className="text-oxblood">tT</span>
            </span>
          </div>

          <div className="flex items-stretch">
            <button
              aria-label="Profile"
              className="w-12 sm:w-14 flex items-center justify-center border-l hairline text-ink-soft hover:text-ink press"
            >
              <span className="material-symbols-outlined">person</span>
            </button>
            <button
              aria-label="Exit"
              className="w-12 sm:w-14 flex items-center justify-center border-l hairline text-ink-soft hover:text-oxblood press"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        {leftSidebar && (
          <aside className="hidden lg:block w-60 shrink-0 border-r hairline">
            {leftSidebar}
          </aside>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>

        {rightSidebar && (
          <aside className="hidden xl:block w-80 shrink-0 border-l hairline relative">
            {rightSidebar}
          </aside>
        )}
      </div>
    </div>
  );
}
