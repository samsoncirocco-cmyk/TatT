/**
 * GeneratorModals Component
 * 
 * Modals for enlarged image view, templates, stencil export, and inpainting
 */

import { getTemplateCategories, getTemplatesByCategory } from '../../config/promptTemplates';
import StencilExport from '../StencilExport';
import InpaintingEditor from '../InpaintingEditor';

export default function GeneratorModals({
  // Enlarged image modal
  selectedImage,
  onCloseEnlarged,
  
  // Templates modal
  showTemplates,
  selectedCategory,
  onCategorySelect,
  onTemplateSelect,
  onCloseTemplates,
  
  // Stencil modal
  selectedForStencil,
  onCloseStencil,
  
  // Inpainting modal
  selectedForInpainting,
  generatedDesigns,
  onInpaintingSave,
  onCloseInpainting
}) {
  const templateCategories = getTemplateCategories();

  return (
    <>
      {/* Enlarged Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={onCloseEnlarged}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={onCloseEnlarged}
              className="absolute -top-12 right-0 text-white text-lg font-semibold hover:text-gray-300"
            >
              ✕ Close
            </button>
            <img
              src={selectedImage}
              alt="Enlarged design"
              className="w-full h-auto rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Design Templates
                </h3>
                <button
                  onClick={onCloseTemplates}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Choose a template to get started, or use it as inspiration
              </p>
            </div>

            <div className="p-6">
              {/* Category Selection */}
              {!selectedCategory ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {templateCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => onCategorySelect(category.id)}
                      className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="text-3xl mb-2">{category.icon}</div>
                      <div className="font-semibold text-gray-900 mb-1">
                        {category.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {category.description}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {/* Back Button */}
                  <button
                    onClick={() => onCategorySelect(null)}
                    className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Back to categories
                  </button>

                  {/* Templates in Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {getTemplatesByCategory(selectedCategory).map((template, index) => (
                      <button
                        key={index}
                        onClick={() => onTemplateSelect(template)}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="font-semibold text-gray-900 mb-2">
                          {template.name}
                        </div>
                        <div className="text-sm text-gray-700 mb-2">
                          {template.subject}
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {template.recommendedStyle}
                          </span>
                          {template.tags?.map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stencil Export Modal */}
      {selectedForStencil && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Prepare Stencil
                </h3>
                <button
                  onClick={onCloseStencil}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <StencilExport imageUrl={selectedForStencil} />
            </div>
          </div>
        </div>
      )}

      {/* Inpainting Editor Modal */}
      {selectedForInpainting !== null && generatedDesigns && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Edit Design
                </h3>
                <button
                  onClick={onCloseInpainting}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <InpaintingEditor
                imageUrl={generatedDesigns.images[selectedForInpainting]}
                onSave={onInpaintingSave}
                onCancel={onCloseInpainting}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

