import Link from "next/link";
import TattTesterWordmark from "@/components/studio/TattTesterWordmark";

const COLS = [
  {
    title: "Product",
    links: [
      // The Studio is deliberately absent here too — see the note on
      // StudioShell's NAV. The refinery is reached from a picked design,
      // not from site chrome.
      { label: "Design Session", href: "/design" },
      { label: "Artists", href: "/artists" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Sign Up", href: "/signup" },
      { label: "Log In", href: "/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
    ],
  },
];

/**
 * `quiet` (ADR-0032): the calm register keeps the same footer with the
 * volume down — warm-gray hairlines, no glitch, no pink except the
 * wordmark (the screen's single small pink accent, shared with the header).
 */
export default function PunkFooter({ quiet = false }: { quiet?: boolean }) {
  const hl = quiet ? "hairline-quiet" : "hairline";
  const hov = quiet ? "hover:text-white" : "hover:text-pink";

  return (
    <footer className={`border-t-2 ${hl} bg-black relative z-10`}>
      <div className="px-6 md:px-12 py-12 md:py-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          <div>
            <TattTesterWordmark
              className={`font-display text-white text-3xl leading-none tracking-[0.01em] ${quiet ? "" : "glitch"}`}
            />
            <p className="mt-4 text-[12px] text-white/50 font-body leading-[1.55] max-w-[200px]">
              Think it. Ink it. AI-powered tattoo design, on your terms.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-[14px] tracking-[0.2em] text-white mb-4">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={`text-[10px] uppercase tracking-[0.25em] text-white/60 ${hov} font-body`}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className={`border-t ${hl} px-6 md:px-12 py-4`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] uppercase tracking-[0.25em] text-white/40 tabular-nums font-body">
          <span>
            <span className={quiet ? "text-quiet-dim" : "text-pink"}>●</span>
            &nbsp;&nbsp;TattTester&nbsp;/&nbsp;Side&nbsp;B&nbsp;/&nbsp;2026
          </span>
          <span>All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
