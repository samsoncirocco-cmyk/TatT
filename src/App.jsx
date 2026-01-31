/**
 * TatTester Main App Component
 *
 * Mobile-first tattoo discovery platform
 * with AI design generation and AR preview
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Sparkles, Camera, Users, Folder } from 'lucide-react';

import DesignGenerator from './components/DesignGenerator';
import DesignGeneratorWithCouncil from './components/DesignGeneratorWithCouncil';
import DesignLibrary from './components/DesignLibrary';
import HomePage from './components/Home';
import Visualize from './pages/Visualize';
import SmartMatch from './pages/SmartMatch';
import SwipeMatch from './pages/SwipeMatch';
import Artists from './pages/Artists';
import ArtistProfile from './pages/ArtistProfile';
import Journey from './pages/Journey';
import Philosophy from './pages/Philosophy';
import Generate from './pages/Generate';

// Feature flag for council integration
const USE_COUNCIL = process.env.NEXT_PUBLIC_USE_COUNCIL === 'true';

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className="w-full min-h-screen pb-24"
  >
    {children}
  </motion.div>
);

function AppContent() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-transparent text-gray-100 font-sans selection:bg-ducks-green selection:text-ducks-yellow">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
          <Route path="/philosophy" element={<PageWrapper><Philosophy /></PageWrapper>} />
          <Route path="/journey" element={<PageWrapper><Journey /></PageWrapper>} />
          <Route path="/generate" element={<PageWrapper><Generate /></PageWrapper>} />
          <Route path="/library" element={<PageWrapper><DesignLibrary /></PageWrapper>} />
          <Route path="/visualize" element={<PageWrapper><Visualize /></PageWrapper>} />
          <Route path="/smart-match" element={<PageWrapper><SmartMatch /></PageWrapper>} />
          <Route path="/swipe" element={<PageWrapper><SwipeMatch /></PageWrapper>} />
          <Route path="/artists" element={<PageWrapper><Artists /></PageWrapper>} />
          <Route path="/artists/:id" element={<PageWrapper><ArtistProfile /></PageWrapper>} />
        </Routes>
      </AnimatePresence>

      {/* Floating Dock Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="glass-panel px-6 py-3 rounded-2xl flex items-center gap-6 shadow-hard backdrop-blur-xl border border-white/10">
          <NavLink to="/" icon={Home} />
          <NavLink to="/generate" icon={Sparkles} />
          <div className="w-12 h-12 flex items-center justify-center -mt-8 bg-ducks-yellow rounded-full shadow-glow transform transition hover:scale-105 active:scale-95">
            <Link to="/visualize" className="text-ducks-green">
              <Camera size={24} />
            </Link>
          </div>
          <NavLink to="/artists" icon={Users} />
          <NavLink to="/library" icon={Folder} />
        </div>
      </nav>
    </div>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </Router>
  );
}

// Navigation Link Component
function NavLink({ to, icon: Icon }) {
  const location = useLocation();
  // Fix: Use startsWith for nested routes like /artists/:id
  const isActive = location.pathname === to ||
    (to !== '/' && location.pathname.startsWith(to));

  return (
    <Link
      to={to}
      className="relative group p-2 flex flex-col items-center justify-center transition-all duration-300"
    >
      <div className={`transition-all duration-300 ${isActive ? 'text-ducks-yellow -translate-y-1' : 'text-gray-400 group-hover:text-white'}`}>
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
      </div>

      {/* Active Dot indicator */}
      {isActive && (
        <motion.div
          layoutId="nav-dot"
          className="absolute -bottom-2 w-1 h-1 bg-ducks-yellow rounded-full shadow-glow"
        />
      )}
    </Link>
  );
}

export default App;
