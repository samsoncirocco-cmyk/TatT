import os from 'os';
import path from 'path';

/**
 * Scratch directory for decomposed layer images.
 *
 * Written by /api/v1/layers/decompose and read back by /uploads/layers/[filename];
 * both must agree or served layers 404. Node-only (uses os/path) -- do not import
 * from client code.
 */
export const LAYER_UPLOAD_DIR = path.join(os.tmpdir(), 'tatt-layer-uploads');
