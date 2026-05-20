import Link from "next/link";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "The Forge", href: "/generate" },
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

export default function PunkFooter() {
  return (
    <footer className="border-t-2 hairline bg-black relative z-10">
      <div className="px-6 md:px-12 py-12 md:py-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          <div>
            <span className="font-display text-white text-3xl leading-none tracking-[0.01em] glitch">
              TA<span className="text-pink">TT</span>
            </span>
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
                      className="text-[10px] uppercase tracking-[0.25em] text-white/60 hover:text-pink font-body"
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
      <div className="border-t hairline px-6 md:px-12 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] uppercase tracking-[0.25em] text-white/40 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;TatT&nbsp;/&nbsp;Side&nbsp;B&nbsp;/&nbsp;2026
          </span>
          <span>All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
