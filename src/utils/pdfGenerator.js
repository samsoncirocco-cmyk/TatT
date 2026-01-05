import { jsPDF } from 'jspdf';

const DEFAULT_MARGIN_INCHES = 0.25;

function setDrawingDefaults(pdf) {
  pdf.setDrawColor(40);
  pdf.setLineWidth(0.01);
}

export function addCropMarks(pdf, pageWidth, pageHeight) {
  setDrawingDefaults(pdf);

  const markLength = 0.35;
  const offset = DEFAULT_MARGIN_INCHES / 2;

  // Top-left
  pdf.line(offset, offset, offset + markLength, offset);
  pdf.line(offset, offset, offset, offset + markLength);

  // Top-right
  pdf.line(pageWidth - offset, offset, pageWidth - offset - markLength, offset);
  pdf.line(pageWidth - offset, offset, pageWidth - offset, offset + markLength);

  // Bottom-left
  pdf.line(offset, pageHeight - offset, offset + markLength, pageHeight - offset);
  pdf.line(offset, pageHeight - offset, offset, pageHeight - offset - markLength);

  // Bottom-right
  pdf.line(pageWidth - offset, pageHeight - offset, pageWidth - offset - markLength, pageHeight - offset);
  pdf.line(pageWidth - offset, pageHeight - offset, pageWidth - offset, pageHeight - offset - markLength);
}

export function addRegistrationGuides(pdf, pageWidth, pageHeight) {
  setDrawingDefaults(pdf);
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;
  const guideLength = 0.4;

  pdf.line(centerX - guideLength, centerY, centerX + guideLength, centerY);
  pdf.line(centerX, centerY - guideLength, centerX, centerY + guideLength);
}

export function addDimensionLabels(pdf, width, height, unit = 'in') {
  pdf.setFontSize(10);
  const textY = DEFAULT_MARGIN_INCHES;
  const label = `Actual size: ${width.toFixed(2)}" × ${height.toFixed(2)}" (${unit.toLowerCase()})`;
  pdf.text(label, DEFAULT_MARGIN_INCHES, textY);
}

export function embedMetadata(pdf, metadata = {}) {
  const properties = {
    title: metadata.design_name || 'Tattoo Stencil Export',
    subject: `Stencil ${metadata.dimensions?.width_inches || '?'}" × ${metadata.dimensions?.height_inches || '?'}"`,
    keywords: [
      'tattoo',
      'stencil',
      metadata.paper_size,
      `${metadata.dpi}dpi`,
      metadata.format
    ].filter(Boolean).join(', '),
    creator: 'TatTester',
    author: metadata.artist || 'TatTester',
    creationDate: metadata.created_at ? new Date(metadata.created_at) : new Date()
  };

  pdf.setProperties(properties);
}

export function createStencilPDF(imageDataUrl, dimensions, metadata = {}) {
  const {
    paperWidthInches,
    paperHeightInches,
    designWidthInches,
    designHeightInches
  } = dimensions;

  const orientation = paperWidthInches >= paperHeightInches ? 'landscape' : 'portrait';

  const pdf = new jsPDF({
    orientation,
    unit: 'in',
    format: [paperWidthInches, paperHeightInches],
    compress: true,
    hotfixes: ['px_scaling']
  });

  embedMetadata(pdf, metadata);

  const x = (paperWidthInches - designWidthInches) / 2;
  const y = (paperHeightInches - designHeightInches) / 2;

  pdf.addImage(imageDataUrl, 'PNG', x, y, designWidthInches, designHeightInches, undefined, 'FAST');

  addCropMarks(pdf, paperWidthInches, paperHeightInches);
  addRegistrationGuides(pdf, paperWidthInches, paperHeightInches);
  addDimensionLabels(pdf, designWidthInches, designHeightInches, 'in');

  return pdf;
}
