/**
 * Design Library Component
 *
 * Display and manage saved tattoo designs
 * Gallery-like view with filtering and search
 */

import { useState, useEffect } from 'react';
import {
  getAllDesigns,
  deleteDesign,
  toggleFavorite,
  getLibraryStats,
  exportLibrary,
  getFavoriteDesigns,
  searchDesigns
} from '../services/designLibraryService';
import { downloadImage } from '../services/imageProcessingService';

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
    if (confirm('Are you sure you want to delete this design?')) {
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

  const handleExport = () => {
    exportLibrary();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Design Library</h1>
              {stats && (
                <p className="text-sm text-gray-600 mt-1">
                  {stats.total} designs | {stats.favorites} favorites | {stats.remaining} slots remaining
                </p>
              )}
            </div>

            {designs.length > 0 && (
              <button
                onClick={handleExport}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-lg hover:bg-blue-50 transition-all"
              >
                Export
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Filters and Search */}
        {designs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search designs..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({designs.length})
              </button>
              <button
                onClick={() => setFilter('favorites')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === 'favorites'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Favorites ({stats?.favorites || 0})
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {designs.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No designs yet
            </h2>
            <p className="text-gray-600 mb-6">
              Start creating designs to build your library
            </p>
            <a
              href="/generate"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all"
            >
              Generate Your First Design
            </a>
          </div>
        )}

        {/* No Results State */}
        {designs.length > 0 && filteredDesigns.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No designs match your filters</p>
            <button
              onClick={() => {
                setFilter('all');
                setSearchQuery('');
              }}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Design Grid */}
        {filteredDesigns.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
    <div className="relative group bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      {/* Image */}
      <div
        className="aspect-square bg-gray-100 cursor-pointer"
        onClick={() => onView(design)}
      >
        <img
          src={design.imageUrl}
          alt={design.userInput.subject}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">
          {design.userInput.subject}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {design.metadata.style}
        </p>
      </div>

      {/* Favorite Button */}
      <button
        onClick={() => onToggleFavorite(design.id)}
        className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-all"
      >
        {design.favorite ? (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        )}
      </button>
    </div>
  );
}

function DesignDetailModal({ design, onClose, onToggleFavorite, onDelete, onDownload }) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg max-w-4xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Image */}
          <div className="bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={design.imageUrl}
              alt={design.userInput.subject}
              className="w-full h-auto"
            />
          </div>

          {/* Details */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {design.userInput.subject}
            </h2>

            {/* Metadata */}
            <div className="space-y-3 mb-6">
              <DetailRow label="Style" value={design.metadata.style} />
              <DetailRow label="Body Part" value={design.metadata.bodyPart} />
              <DetailRow label="Size" value={design.metadata.size} />
              <DetailRow
                label="Created"
                value={new Date(design.metadata.savedAt).toLocaleDateString()}
              />
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => onToggleFavorite(design.id)}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                  design.favorite
                    ? 'bg-red-50 text-red-600 border-2 border-red-600'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                {design.favorite ? '❤️ Remove from Favorites' : '🤍 Add to Favorites'}
              </button>

              <button
                onClick={() => onDownload(design.imageUrl, design.id)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all"
              >
                Download Design
              </button>

              <button
                onClick={() => {
                  onDelete(design.id);
                  onClose();
                }}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all"
              >
                Delete Design
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
    <div className="flex justify-between">
      <span className="text-sm text-gray-600">{label}:</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
