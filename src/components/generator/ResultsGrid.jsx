/**
 * ResultsGrid Component
 * 
 * Displays generated tattoo designs in a responsive grid with actions
 */

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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Your Designs
        </h2>
        <p className="text-sm text-gray-600">
          {generatedDesigns.images.length} variations
        </p>
      </div>

      {/* Design Metadata */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Style:</span>
            <span className="ml-2 font-medium text-gray-900">
              {generatedDesigns.metadata.style}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Placement:</span>
            <span className="ml-2 font-medium text-gray-900">
              {generatedDesigns.metadata.bodyPart}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Subject:</span>
            <span className="ml-2 font-medium text-gray-900">
              {generatedDesigns.metadata.subject}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Size:</span>
            <span className="ml-2 font-medium text-gray-900">
              {generatedDesigns.metadata.size}
            </span>
          </div>
        </div>
      </div>

      {/* Images Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {generatedDesigns.images.map((imageUrl, index) => (
          <div
            key={index}
            className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square"
          >
            {/* Image */}
            <img
              src={imageUrl}
              alt={`Design variation ${index + 1}`}
              className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
              onClick={() => onImageClick(imageUrl)}
            />

            {/* Inpainted Badge */}
            {inpaintedImages[index] && (
              <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                ✨ Edited
              </div>
            )}

            {/* Action Buttons Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-end p-3">
              <div className="w-full flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Save Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveToLibrary(imageUrl, index);
                  }}
                  disabled={savedImages.has(imageUrl)}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                    savedImages.has(imageUrl)
                      ? 'bg-green-600 text-white cursor-default'
                      : 'bg-white text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {savedImages.has(imageUrl) ? '✓ Saved' : 'Save'}
                </button>

                {/* Stencil Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenStencil(imageUrl);
                  }}
                  className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-all"
                >
                  Stencil
                </button>

                {/* Edit Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenInpainting(index);
                  }}
                  className="flex-1 py-2 px-3 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 transition-all"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">💡 Tip:</span> Click any design to view full size. 
          Use "Stencil" to prepare for printing, or "Edit" to customize details.
        </p>
      </div>
    </div>
  );
}

