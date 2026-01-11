/**
 * ResultsGrid Component (Reskinned)
 * 
 * Displays generated tattoo designs in a responsive grid with actions
 */

import { Download, Edit2, FileTerminal } from 'lucide-react';
import Card from '../ui/Card';

export default function ResultsGrid({
  generatedDesigns,
  savedImages,
  inpaintedImages,
  onImageClick,
  onSaveToLibrary,
  onOpenStencil,
  onOpenInpainting
}) {
  if (!generatedDesigns) return null;

  return (
    <div className="mt-12 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold text-white">
          Forged Concepts
        </h2>
        <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-400 border border-white/5">
          {generatedDesigns.images.length} Variants
        </span>
      </div>

      {/* Design Metadata Stats */}
      <div className="flex gap-4 mb-8 text-xs font-mono text-gray-500 border-b border-white/5 pb-4 overflow-x-auto">
        <div>STYLE: <span className="text-ducks-green">{generatedDesigns.metadata.style}</span></div>
        <div>LOC: <span className="text-white">{generatedDesigns.metadata.bodyPart}</span></div>
        <div>SUBJ: <span className="text-white truncate max-w-[200px] inline-block align-bottom">{generatedDesigns.metadata.subject}</span></div>
      </div>

      {/* Images Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {generatedDesigns.images.map((imageUrl, index) => (
          <div
            key={index}
            className="group relative rounded-2xl overflow-hidden aspect-square border border-white/10 bg-black/50"
          >
            {/* Image */}
            <img
              src={imageUrl}
              alt={`Design variation ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onClick={() => onImageClick(imageUrl)}
            />

            {/* Inpainted Badge */}
            {inpaintedImages[index] && (
              <div className="absolute top-2 left-2 bg-purple-500/80 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                Edited
              </div>
            )}

            {/* Action Buttons Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex gap-2">
              {/* Save Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveToLibrary(imageUrl, index);
                }}
                disabled={savedImages.has(imageUrl)}
                className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all ${savedImages.has(imageUrl)
                    ? 'bg-ducks-green text-white hover:bg-ducks-green'
                    : 'bg-white text-black hover:bg-gray-200'
                  }`}
              >
                {savedImages.has(imageUrl) ? 'Saved' : <><Download size={14} /> Save</>}
              </button>

              {/* Stencil Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenStencil(imageUrl);
                }}
                className="p-3 bg-white/10 backdrop-blur text-white rounded-lg hover:bg-white/20 transition-all border border-white/10"
                title="Prepare Stencil"
              >
                <FileTerminal size={16} />
              </button>

              {/* Edit Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInpainting(index);
                }}
                className="p-3 bg-white/10 backdrop-blur text-white rounded-lg hover:bg-white/20 transition-all border border-white/10"
                title="Edit with AI"
              >
                <Edit2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
