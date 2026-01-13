const MAX_DIMENSION_INCHES = 20;
export const DEFAULT_DPI = 300;

export const PAPER_SIZES = {
  letter: {
    key: 'letter',
    name: 'US Letter',
    description: '8.5" × 11" (thermal printer standard)',
    widthInches: 8.5,
    heightInches: 11,
    unit: 'inches'
  },
  a4: {
    key: 'a4',
    name: 'A4',
    description: '210mm × 297mm',
    widthInches: 8.27,
    heightInches: 11.69,
    unit: 'inches'
  }
};

const CM_TO_INCHES = 0.3937007874;

function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') {
    return NaN;
  }
  return typeof value === 'number' ? value : parseFloat(value);
}

export function validateDPI(dpi) {
  if (dpi !== DEFAULT_DPI) {
    throw new Error('Stencil exports must be exactly 300 DPI for thermal printers.');
  }
  return dpi;
}

export function convertToPixels(inches, dpi = DEFAULT_DPI) {
  validateDPI(dpi);
  const numeric = normalizeNumber(inches);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error('Dimension must be a positive value.');
  }
  return Math.round(numeric * dpi);
}

export function validateDimensions(width, height, unit = 'inches') {
  const normalizedUnit = unit === 'cm' ? 'cm' : 'inches';
  const numericWidth = normalizeNumber(width);
  const numericHeight = normalizeNumber(height);

  if (!Number.isFinite(numericWidth) || !Number.isFinite(numericHeight)) {
    throw new Error('Dimensions must be numeric values.');
  }

  if (numericWidth <= 0 || numericHeight <= 0) {
    throw new Error('Dimensions must be greater than zero.');
  }

  const widthInches = normalizedUnit === 'cm'
    ? numericWidth * CM_TO_INCHES
    : numericWidth;
  const heightInches = normalizedUnit === 'cm'
    ? numericHeight * CM_TO_INCHES
    : numericHeight;

  if (widthInches > MAX_DIMENSION_INCHES || heightInches > MAX_DIMENSION_INCHES) {
    throw new Error(`Stencil dimensions must be under ${MAX_DIMENSION_INCHES}" for optimal calibration.`);
  }

  return {
    widthInches: Number(widthInches.toFixed(3)),
    heightInches: Number(heightInches.toFixed(3)),
    unit: 'inches'
  };
}

export function calculateScaleFactor(sourceSize, targetSize) {
  if (!sourceSize?.widthInches || !sourceSize?.heightInches
    || !targetSize?.widthInches || !targetSize?.heightInches) {
    return 1;
  }

  const widthScale = targetSize.widthInches / sourceSize.widthInches;
  const heightScale = targetSize.heightInches / sourceSize.heightInches;
  return Number(Math.min(widthScale, heightScale, 1).toFixed(3));
}

export function suggestPaperSize(designDimensions) {
  if (!designDimensions?.widthInches || !designDimensions?.heightInches) {
    return 'letter';
  }

  const requiredWidth = designDimensions.widthInches + 0.5; // add 0.25" margin per side
  const requiredHeight = designDimensions.heightInches + 0.5;

  const fitsLetter = requiredWidth <= PAPER_SIZES.letter.widthInches
    && requiredHeight <= PAPER_SIZES.letter.heightInches;

  if (fitsLetter) {
    return 'letter';
  }

  const fitsA4 = requiredWidth <= PAPER_SIZES.a4.widthInches
    && requiredHeight <= PAPER_SIZES.a4.heightInches;

  if (fitsA4) {
    return 'a4';
  }

  return 'custom';
}
