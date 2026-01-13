/**
 * PNG DPI Service
 *
 * Adds proper 300 DPI metadata (pHYs chunk) to PNG files for professional tattoo printing
 */

/**
 * Add 300 DPI metadata to PNG blob
 * Modifies the PNG's pHYs chunk to set proper DPI for printing
 *
 * @param {Blob} pngBlob - Input PNG blob
 * @returns {Promise<Blob>} PNG blob with 300 DPI metadata
 */
export async function add300DpiMetadata(pngBlob) {
  try {
    const arrayBuffer = await pngBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // PNG signature
    const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    // Verify PNG signature
    for (let i = 0; i < PNG_SIGNATURE.length; i++) {
      if (uint8Array[i] !== PNG_SIGNATURE[i]) {
        console.warn('[PngDpiService] Invalid PNG signature, skipping DPI metadata');
        return pngBlob;
      }
    }

    // 300 DPI = 11811 pixels per meter (300 * 39.3701)
    const pixelsPerMeter = Math.round(300 * 39.3701);

    // Create pHYs chunk
    const physChunk = createPhysChunk(pixelsPerMeter, pixelsPerMeter);

    // Find IHDR chunk end (after PNG signature + IHDR)
    let insertPosition = 8; // After PNG signature

    // Skip IHDR chunk (length + type + data + CRC = 4 + 4 + 13 + 4 = 25 bytes)
    const ihdrLength = readUint32BE(uint8Array, insertPosition);
    insertPosition += 4 + 4 + ihdrLength + 4; // length + type + data + CRC

    // Check if pHYs chunk already exists
    if (hasPhysChunk(uint8Array)) {
      // Remove existing pHYs chunk
      const withoutPhys = removePhysChunk(uint8Array);
      uint8Array.set(withoutPhys);
    }

    // Insert new pHYs chunk after IHDR
    const result = new Uint8Array(uint8Array.length + physChunk.length);
    result.set(uint8Array.subarray(0, insertPosition), 0);
    result.set(physChunk, insertPosition);
    result.set(uint8Array.subarray(insertPosition), insertPosition + physChunk.length);

    return new Blob([result], { type: 'image/png' });
  } catch (error) {
    console.error('[PngDpiService] Failed to add DPI metadata:', error);
    return pngBlob; // Return original on error
  }
}

/**
 * Create pHYs chunk with specified DPI
 */
function createPhysChunk(pixelsPerMeterX, pixelsPerMeterY) {
  const data = new Uint8Array(17);
  let offset = 0;

  // Chunk length (9 bytes)
  writeUint32BE(data, 9, offset);
  offset += 4;

  // Chunk type "pHYs"
  data[offset++] = 0x70; // 'p'
  data[offset++] = 0x48; // 'H'
  data[offset++] = 0x79; // 'y'
  data[offset++] = 0x53; // 'S'

  // Pixels per unit, X axis (4 bytes)
  writeUint32BE(data, pixelsPerMeterX, offset);
  offset += 4;

  // Pixels per unit, Y axis (4 bytes)
  writeUint32BE(data, pixelsPerMeterY, offset);
  offset += 4;

  // Unit specifier: 1 = meters
  data[offset++] = 1;

  // CRC (4 bytes) - calculated over type + data
  const crc = calculateCRC(data.subarray(4, 13));
  writeUint32BE(data, crc, offset);

  return data;
}

/**
 * Check if PNG already has pHYs chunk
 */
function hasPhysChunk(uint8Array) {
  let offset = 8; // Skip PNG signature

  while (offset < uint8Array.length - 8) {
    const length = readUint32BE(uint8Array, offset);
    const type = String.fromCharCode(...uint8Array.subarray(offset + 4, offset + 8));

    if (type === 'pHYs') {
      return true;
    }

    if (type === 'IEND') {
      break;
    }

    offset += 4 + 4 + length + 4; // length + type + data + CRC
  }

  return false;
}

/**
 * Remove existing pHYs chunk from PNG
 */
function removePhysChunk(uint8Array) {
  let offset = 8;
  const chunks = [];

  // Copy PNG signature
  chunks.push(uint8Array.subarray(0, 8));

  while (offset < uint8Array.length - 8) {
    const length = readUint32BE(uint8Array, offset);
    const chunkSize = 4 + 4 + length + 4;
    const type = String.fromCharCode(...uint8Array.subarray(offset + 4, offset + 8));

    if (type !== 'pHYs') {
      chunks.push(uint8Array.subarray(offset, offset + chunkSize));
    }

    offset += chunkSize;

    if (type === 'IEND') {
      break;
    }
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let resultOffset = 0;

  for (const chunk of chunks) {
    result.set(chunk, resultOffset);
    resultOffset += chunk.length;
  }

  return result;
}

/**
 * Read 32-bit big-endian integer
 */
function readUint32BE(array, offset) {
  return (
    (array[offset] << 24) |
    (array[offset + 1] << 16) |
    (array[offset + 2] << 8) |
    array[offset + 3]
  );
}

/**
 * Write 32-bit big-endian integer
 */
function writeUint32BE(array, value, offset) {
  array[offset] = (value >>> 24) & 0xFF;
  array[offset + 1] = (value >>> 16) & 0xFF;
  array[offset + 2] = (value >>> 8) & 0xFF;
  array[offset + 3] = value & 0xFF;
}

/**
 * Calculate CRC32 for PNG chunk
 * Standard CRC-32 algorithm used by PNG specification
 */
function calculateCRC(data) {
  const CRC_TABLE = makeCrcTable();
  let crc = 0xFFFFFFFF;

  for (let i = 0; i < data.length; i++) {
    const index = (crc ^ data[i]) & 0xFF;
    crc = (crc >>> 8) ^ CRC_TABLE[index];
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Generate CRC32 lookup table
 */
function makeCrcTable() {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }

  return table;
}

/**
 * Get DPI from PNG metadata
 * Returns null if no pHYs chunk found
 */
export async function getDpiFromPng(pngBlob) {
  try {
    const arrayBuffer = await pngBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let offset = 8; // Skip PNG signature

    while (offset < uint8Array.length - 8) {
      const length = readUint32BE(uint8Array, offset);
      const type = String.fromCharCode(...uint8Array.subarray(offset + 4, offset + 8));

      if (type === 'pHYs') {
        const dataOffset = offset + 8;
        const pixelsPerMeterX = readUint32BE(uint8Array, dataOffset);
        const pixelsPerMeterY = readUint32BE(uint8Array, dataOffset + 4);
        const unit = uint8Array[dataOffset + 8];

        if (unit === 1) {
          // Convert pixels/meter to DPI
          const dpiX = Math.round(pixelsPerMeterX / 39.3701);
          const dpiY = Math.round(pixelsPerMeterY / 39.3701);
          return { dpiX, dpiY, unit: 'inches' };
        }
      }

      if (type === 'IEND') {
        break;
      }

      offset += 4 + 4 + length + 4;
    }

    return null;
  } catch (error) {
    console.error('[PngDpiService] Failed to read DPI:', error);
    return null;
  }
}
