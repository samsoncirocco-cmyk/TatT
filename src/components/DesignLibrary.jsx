/**
 * Design Library Component (Reskinned)
 * Display and manage saved tattoo designs
 */

import { useState, useEffect } from 'react';
import {
  getAllDesigns,
  deleteDesign,
  toggleFavorite,
  getLibraryStats,
  exportLibrary,
  searchDesigns
} from '../services/designLibraryService';
import { downloadImage } from '../services/imageProcessingService';
import Button from './ui/Button';
import { Search, Download, Trash2, Heart, Share2, Filter, X } from 'lucide-react';

export default function DesignLibrary() {
  const [designs, setDesigns] = useState([]);
  const [filteredDesigns, setFilteredDesigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [filter, setFilter] = useState('all'); // all, favorites
  const [searchQuery, setSearchQuery] = useState('');

  // Load designs on mount
  useEffect(() => {
    loadDesigns();
  }, []);

  // Apply filters when filter or search changes
  useEffect(() => {
    applyFilters();
  }, [designs, filter, searchQuery]);

  const loadDesigns = () => {
    const allDesigns = getAllDesigns();
    setDesigns(allDesigns);
    setStats(getLibraryStats());
  };

  const applyFilters = () => {
    let filtered = designs;

    // Apply favorite filter
    if (filter === 'favorites') {
      filtered = filtered.filter(d => d.favorite);
    }

    // Apply search
    if (searchQuery.trim()) {
      const results = searchDesigns(searchQuery);
      const resultIds = new Set(results.map(r => r.id));
      filtered = filtered.filter(d => resultIds.has(d.id));
    }

    setFilteredDesigns(filtered);
  };

  const handleToggleFavorite = (designId) => {
    toggleFavorite(designId);
    loadDesigns();
  };

  const handleDelete = (designId) => {
    if (confirm('Are you sure you want to delete this design fragments?')) {
      deleteDesign(designId);
      loadDesigns();
      if (selectedDesign?.id === designId) {
        setSelectedDesign(null);
      }
    }
  };

  const handleDownload = (imageUrl, designId) => {
    downloadImage(imageUrl, `tattoo-design-${designId}.png`);
  };

  return (
    <div className="min-h-screen pt-24 px-4 pb-20">
      {/* Header */}
      <div className="glass-panel border-b border-white/10 p-6 rounded-2xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Design Archive</h1>
          {stats && (
            <p className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-wider">
              {stats.total} Nodes Stored | {stats.favorites} Starred | <span className="text-ducks-green">{stats.remaining} Slots Free</span>
            </p>
          )}
        </div>

        {designs.length > 0 && (
          <Button
            onClick={exportLibrary}
            variant="secondary"
            size="sm"
            icon={Share2}
          >
            Export Database
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      {designs.length > 0 && (
        <div className="glass-panel border border-white/5 p-2 rounded-xl mb-8 flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search archives..."
              className="w-full bg-black/40 border border-white/5 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-ducks-green focus:outline-none transition-colors placeholder-gray-600"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === 'all'
                  ? 'bg-ducks-green text-white shadow-glow-green'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
            >
              All ({designs.length})
            </button>
            <button
              onClick={() => setFilter('favorites')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === 'favorites'
                  ? 'bg-ducks-yellow text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
            >
              Favorites ({stats?.favorites || 0})
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto">
        {/* Empty State */}
        {designs.length === 0 && (
          <div className="glass-panel border-dashed border-white/10 p-16 rounded-3xl text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/5 rounded-full mb-6 text-gray-600">
              <Filter size={32} />
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-2">
              Archive Empty
            </h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              The neural interface hasn't generated any permanent records yet.
            </p>
            <Button
              onClick={() => window.location.href = '/generate'}
              variant="primary"
              size="lg"
            >
              Ignite Forge
            </Button>
          </div>
        )}

        {/* No Results State */}
        {designs.length > 0 && filteredDesigns.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500">No signals found matching criteria.</p>
            <button
              onClick={() => {
                setFilter('all');
                setSearchQuery('');
              }}
              className="mt-4 text-ducks-green hover:text-white font-bold text-sm uppercase tracking-wider transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Design Grid */}
        {filteredDesigns.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredDesigns.map((design) => (
              <DesignCard
                key={design.id}
                design={design}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
                onView={setSelectedDesign}
              />
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedDesign && (
          <DesignDetailModal
            design={selectedDesign}
            onClose={() => setSelectedDesign(null)}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        )}
      </main>
    </div>
  );
}

function DesignCard({ design, onToggleFavorite, onDelete, onView }) {
  return (
    <div className="relative group glass-panel rounded-xl overflow-hidden border border-white/5 hover:border-ducks-green/30 transition-all hover:shadow-glow-green">
      {/* Image */}
      <div
        className="aspect-square bg-black cursor-pointer relative"
        onClick={() => onView(design)}
      >
        <img
          src={design.imageUrl}
          alt={design.userInput.subject}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Info Hover Overlay (Desktop) / Bottom Bar (Mobile) */}
      <div className="absolute bottom-0 left-0 w-full p-3 translate-y-full group-hover:translate-y-0 transition-transform bg-black/80 backdrop-blur-md border-t border-white/10">
        <p className="text-xs font-bold text-white truncate">
          {design.userInput.subject}
        </p>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">
          {design.metadata.style} // {design.metadata.bodyPart || 'Skin'}
        </p>
      </div>

      {/* Favorite Button */}
      <button
        onClick={() => onToggleFavorite(design.id)}
        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all bg-black/50 backdrop-blur hover:bg-white hover:text-black text-gray-400"
      >
        <Heart size={14} className={design.favorite ? "fill-red-500 text-red-500" : ""} />
      </button>
    </div>
  );
}

function DesignDetailModal({ design, onClose, onToggleFavorite, onDelete, onDownload }) {
  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative glass-panel rounded-3xl max-w-4xl w-full border border-white/10 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10 bg-black/50 rounded-full p-2"
        >
          <X size={20} />
        </button>

        <div className="grid md:grid-cols-2">
          {/* Image */}
          <div className="bg-black flex items-center justify-center aspect-square md:aspect-auto">
            <img
              src={design.imageUrl}
              alt={design.userInput.subject}
              className="max-w-full max-h-[60vh] md:max-h-full object-contain"
            />
          </div>

          {/* Details */}
          <div className="p-8 flex flex-col h-full bg-zinc-900/50">
            <h2 className="text-2xl font-display font-bold text-white mb-6">
              {design.userInput.subject}
            </h2>

            {/* Metadata */}
            <div className="space-y-4 mb-8 flex-1">
              <DetailRow label="Style Frequency" value={design.metadata.style} />
              <DetailRow label="Target Sector" value={design.metadata.bodyPart} />
              <DetailRow label="Grid Size" value={design.metadata.size} />
              <DetailRow
                label="Timestamp"
                value={new Date(design.metadata.savedAt).toLocaleDateString()}
              />
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-6 border-t border-white/10">
              <Button
                onClick={() => onToggleFavorite(design.id)}
                variant="secondary"
                className="w-full"
                icon={Heart}
              >
                {design.favorite ? 'Remove Favorite' : 'Mark as Favorite'}
              </Button>

              <Button
                onClick={() => onDownload(design.imageUrl, design.id)}
                className="w-full"
                icon={Download}
              >
                Download High-Res
              </Button>

              <button
                onClick={() => {
                  onDelete(design.id);
                  onClose();
                }}
                className="w-full py-3 text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Delete Record
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5">
      <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}
