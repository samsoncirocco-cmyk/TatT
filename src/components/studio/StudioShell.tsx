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
    <div className="halftone grain min-h-screen text-white font-body flex flex-col relative bg-black">
      <header className="relative z-10 border-b-2 hairline bg-black">
        <div className="flex items-stretch justify-between">
          <div className="flex items-center px-5 sm:px-8 py-4 gap-4">
            <span
              className="font-display text-white text-3xl leading-none tracking-[0.01em] glitch"
            >
              TA<span className="text-pink">TT</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase text-white/40 tracking-[0.25em] border-l hairline-white pl-4">
              Side&nbsp;A&nbsp;/&nbsp;Track&nbsp;01
            </span>
          </div>

          <div className="flex items-stretch">
            <button
              aria-label="Profile"
              className="w-12 sm:w-14 flex items-center justify-center border-l hairline-white text-white/60 hover:text-pink press"
            >
              <span className="material-symbols-outlined">person</span>
            </button>
            <button
              aria-label="Exit"
              className="w-12 sm:w-14 flex items-center justify-center border-l hairline-white text-white/60 hover:text-pink press"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative z-[2]">
        {leftSidebar && (
          <aside className="hidden lg:block w-60 shrink-0 border-r hairline-white bg-black">
            {leftSidebar}
          </aside>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto bg-black">{children}</main>

        {rightSidebar && (
          <aside className="hidden xl:block w-80 shrink-0 border-l hairline-white relative bg-black">
            {rightSidebar}
          </aside>
        )}
      </div>
    </div>
  );
}
