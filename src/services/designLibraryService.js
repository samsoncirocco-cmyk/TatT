/**
 * Design Library Service
 *
 * Manages user's saved tattoo designs using browser localStorage.
 * In production, this will be replaced with proper database storage.
 *
 * Storage Structure:
 * - Each design has unique ID
 * - Stores image URL/data, metadata, and user preferences
 * - Maintains creation timestamp for sorting
 *
 * Budget Note: localStorage is free and works offline.
 * Perfect for MVP before implementing backend.
 */

const LIBRARY_STORAGE_KEY = 'tattester_design_library';
const MAX_DESIGNS = 50; // Limit to prevent localStorage overflow

/**
 * Design schema
 */
function createDesign(imageUrl, metadata, userInput) {
  return {
    id: generateId(),
    imageUrl,
    metadata: {
      ...metadata,
      savedAt: new Date().toISOString()
    },
    userInput,
    favorite: false,
    notes: '',
    tags: []
  };
}

/**
 * Generate unique ID
 */
function generateId() {
  return `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all designs from library
 */
export function getAllDesigns() {
  try {
    const library = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!library) return [];

    const designs = JSON.parse(library);
    return Array.isArray(designs) ? designs : [];
  } catch (error) {
    console.error('[DesignLibrary] Error loading designs:', error);
    return [];
  }
}

/**
 * Save design to library
 *
 * @param {string} imageUrl - URL or base64 of the image
 * @param {Object} metadata - Design metadata from generation
 * @param {Object} userInput - Original user input
 * @returns {Object} Saved design object
 */
export function saveDesign(imageUrl, metadata, userInput) {
  try {
    const designs = getAllDesigns();

    // Check if we've hit the limit
    if (designs.length >= MAX_DESIGNS) {
      // Remove oldest non-favorite design
      const oldestIndex = designs.findIndex(d => !d.favorite);
      if (oldestIndex !== -1) {
        designs.splice(oldestIndex, 1);
      } else {
        throw new Error(`Library is full (${MAX_DESIGNS} designs). Please remove some favorites to save new designs.`);
      }
    }

    // Create new design
    const newDesign = createDesign(imageUrl, metadata, userInput);

    // Add to beginning of array (most recent first)
    designs.unshift(newDesign);

    // Save to localStorage
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(designs));

    console.log('[DesignLibrary] Design saved:', newDesign.id);

    return newDesign;
  } catch (error) {
    console.error('[DesignLibrary] Error saving design:', error);
    throw error;
  }
}

/**
 * Get design by ID
 */
export function getDesignById(designId) {
  const designs = getAllDesigns();
  return designs.find(d => d.id === designId);
}

/**
 * Update design
 */
export function updateDesign(designId, updates) {
  try {
    const designs = getAllDesigns();
    const index = designs.findIndex(d => d.id === designId);

    if (index === -1) {
      throw new Error('Design not found');
    }

    // Merge updates
    designs[index] = {
      ...designs[index],
      ...updates,
      id: designId, // Prevent ID from being changed
      metadata: {
        ...designs[index].metadata,
        ...(updates.metadata || {}),
        updatedAt: new Date().toISOString()
      }
    };

    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(designs));

    return designs[index];
  } catch (error) {
    console.error('[DesignLibrary] Error updating design:', error);
    throw error;
  }
}

/**
 * Delete design
 */
export function deleteDesign(designId) {
  try {
    const designs = getAllDesigns();
    const filtered = designs.filter(d => d.id !== designId);

    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(filtered));

    console.log('[DesignLibrary] Design deleted:', designId);

    return true;
  } catch (error) {
    console.error('[DesignLibrary] Error deleting design:', error);
    return false;
  }
}

/**
 * Toggle favorite status
 */
export function toggleFavorite(designId) {
  const design = getDesignById(designId);
  if (!design) throw new Error('Design not found');

  return updateDesign(designId, {
    favorite: !design.favorite
  });
}

/**
 * Add note to design
 */
export function addNote(designId, note) {
  return updateDesign(designId, { notes: note });
}

/**
 * Add tags to design
 */
export function addTags(designId, tags) {
  const design = getDesignById(designId);
  if (!design) throw new Error('Design not found');

  const uniqueTags = [...new Set([...design.tags, ...tags])];

  return updateDesign(designId, { tags: uniqueTags });
}

/**
 * Get designs by style
 */
export function getDesignsByStyle(style) {
  const designs = getAllDesigns();
  return designs.filter(d => d.userInput.style === style);
}

/**
 * Get favorite designs
 */
export function getFavoriteDesigns() {
  const designs = getAllDesigns();
  return designs.filter(d => d.favorite);
}

/**
 * Get recent designs
 */
export function getRecentDesigns(limit = 10) {
  const designs = getAllDesigns();
  return designs.slice(0, limit);
}

/**
 * Search designs
 */
export function searchDesigns(query) {
  const designs = getAllDesigns();
  const lowerQuery = query.toLowerCase();

  return designs.filter(d => {
    const searchableText = [
      d.userInput.subject,
      d.userInput.style,
      d.userInput.bodyPart,
      d.notes,
      ...d.tags
    ].join(' ').toLowerCase();

    return searchableText.includes(lowerQuery);
  });
}

/**
 * Get library statistics
 */
export function getLibraryStats() {
  const designs = getAllDesigns();

  const styleCount = {};
  const bodyPartCount = {};
  let favoriteCount = 0;

  designs.forEach(d => {
    // Count by style
    const style = d.userInput.style;
    styleCount[style] = (styleCount[style] || 0) + 1;

    // Count by body part
    const bodyPart = d.userInput.bodyPart;
    bodyPartCount[bodyPart] = (bodyPartCount[bodyPart] || 0) + 1;

    // Count favorites
    if (d.favorite) favoriteCount++;
  });

  return {
    total: designs.length,
    favorites: favoriteCount,
    byStyle: styleCount,
    byBodyPart: bodyPartCount,
    capacity: MAX_DESIGNS,
    remaining: MAX_DESIGNS - designs.length
  };
}

/**
 * Export library as JSON
 */
export function exportLibrary() {
  const designs = getAllDesigns();
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    designs
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tattester-library-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import library from JSON
 */
export function importLibrary(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const importData = JSON.parse(event.target.result);

        if (!importData.designs || !Array.isArray(importData.designs)) {
          throw new Error('Invalid library format');
        }

        // Merge with existing designs
        const existingDesigns = getAllDesigns();
        const mergedDesigns = [...importData.designs, ...existingDesigns];

        // Remove duplicates and limit
        const uniqueDesigns = mergedDesigns
          .filter((design, index, self) =>
            index === self.findIndex(d => d.id === design.id)
          )
          .slice(0, MAX_DESIGNS);

        localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(uniqueDesigns));

        resolve({
          imported: importData.designs.length,
          total: uniqueDesigns.length
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Clear entire library
 */
export function clearLibrary() {
  if (confirm('Are you sure you want to delete all saved designs? This cannot be undone.')) {
    localStorage.removeItem(LIBRARY_STORAGE_KEY);
    return true;
  }
  return false;
}
