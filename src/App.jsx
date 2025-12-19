/**
 * TatTester Main App Component
 *
 * Mobile-first tattoo discovery platform
 * with AI design generation and AR preview
 */

import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DesignGenerator from './components/DesignGenerator';
import DesignGeneratorWithCouncil from './components/DesignGeneratorWithCouncil';
import DesignLibrary from './components/DesignLibrary';
import Home from './components/Home';
import Visualize from './pages/Visualize';
import SmartMatch from './pages/SmartMatch';
import SwipeMatch from './pages/SwipeMatch';
import Artists from './pages/Artists';
import ArtistProfile from './pages/ArtistProfile';

// Feature flag for council integration
const USE_COUNCIL = import.meta.env.VITE_USE_COUNCIL === 'true';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/generate" element={USE_COUNCIL ? <DesignGeneratorWithCouncil /> : <DesignGenerator />} />
          <Route path="/library" element={<DesignLibrary />} />
          <Route path="/visualize" element={<Visualize />} />
          <Route path="/smart-match" element={<SmartMatch />} />
          <Route path="/swipe" element={<SwipeMatch />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/artists/:id" element={<ArtistProfile />} />
        </Routes>

        {/* Mobile Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-5 gap-1">
              <NavLink to="/" icon="home" label="Home" />
              <NavLink to="/generate" icon="sparkles" label="Generate" />
              <NavLink to="/visualize" icon="camera" label="Preview" />
              <NavLink to="/artists" icon="users" label="Artists" />
              <NavLink to="/library" icon="folder" label="Library" />
            </div>
          </div>
        </nav>

        {/* Bottom spacer for fixed nav */}
        <div className="h-16" />
      </div>
    </Router>
  );
}

// Navigation Link Component
function NavLink({ to, icon, label }) {
  const isActive = window.location.pathname === to;

  const icons = {
    home: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
    sparkles: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    ),
    camera: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
    users: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    ),
    folder: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    )
  };

  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center py-3 transition-colors ${
        isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icons[icon]}
      </svg>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

export default App;
