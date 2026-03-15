'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Home, Presentation, Play } from 'lucide-react';

const links = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/demo', label: 'Demo', icon: Play },
  { href: '/generate', label: 'Forge', icon: Sparkles },
  { href: '/pitch', label: 'Pitch', icon: Presentation },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-3 py-2 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-hard"
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              active
                ? 'bg-ducks-green text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
