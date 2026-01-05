/**
 * API Request Validation Middleware
 * 
 * Provides validation functions for all API v1 endpoints.
 * Returns 400 Bad Request with detailed validation errors.
 */

/**
 * Validate semantic match request
 * Required: query (string, 1-500 chars)
 * Optional: location, style_preferences, budget, radius, max_results
 */
export function validateSemanticMatchRequest(req, res, next) {
    const { query, location, style_preferences, budget, radius, max_results } = req.body;
    const errors = [];

    // Query validation
    if (!query) {
        errors.push({ field: 'query', message: 'Query is required' });
    } else if (typeof query !== 'string') {
        errors.push({ field: 'query', message: 'Query must be a string' });
    } else if (query.length < 1 || query.length > 500) {
        errors.push({ field: 'query', message: 'Query must be between 1 and 500 characters' });
    }

    // Location validation (optional)
    if (location !== undefined && typeof location !== 'string') {
        errors.push({ field: 'location', message: 'Location must be a string' });
    }

    // Style preferences validation (optional)
    if (style_preferences !== undefined) {
        if (!Array.isArray(style_preferences)) {
            errors.push({ field: 'style_preferences', message: 'Style preferences must be an array' });
        } else if (style_preferences.length > 20) {
            errors.push({ field: 'style_preferences', message: 'Maximum 20 style preferences allowed' });
        }
    }

    // Budget validation (optional)
    if (budget !== undefined) {
        if (typeof budget !== 'number' || budget < 0) {
            errors.push({ field: 'budget', message: 'Budget must be a positive number' });
        }
    }

    // Radius validation (optional)
    if (radius !== undefined) {
        if (typeof radius !== 'number' || radius < 1 || radius > 500) {
            errors.push({ field: 'radius', message: 'Radius must be between 1 and 500 miles' });
        }
    }

    // Max results validation (optional)
    if (max_results !== undefined) {
        if (typeof max_results !== 'number' || max_results < 1 || max_results > 50) {
            errors.push({ field: 'max_results', message: 'Max results must be between 1 and 50' });
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors
        });
    }

    next();
}

/**
 * Validate AR visualization request
 * Required: design_id, body_part
 * Optional: depth_map (base64), placement_config
 */
export function validateARVisualizationRequest(req, res, next) {
    const { design_id, body_part, depth_map, placement_config } = req.body;
    const errors = [];

    // Design ID validation
    if (!design_id) {
        errors.push({ field: 'design_id', message: 'Design ID is required' });
    } else if (typeof design_id !== 'string') {
        errors.push({ field: 'design_id', message: 'Design ID must be a string' });
    }

    // Body part validation
    const validBodyParts = ['arm', 'leg', 'back', 'chest', 'shoulder', 'forearm', 'calf', 'thigh'];
    if (!body_part) {
        errors.push({ field: 'body_part', message: 'Body part is required' });
    } else if (!validBodyParts.includes(body_part.toLowerCase())) {
        errors.push({
            field: 'body_part',
            message: `Body part must be one of: ${validBodyParts.join(', ')}`
        });
    }

    // Depth map validation (optional)
    if (depth_map !== undefined) {
        if (typeof depth_map !== 'string') {
            errors.push({ field: 'depth_map', message: 'Depth map must be a base64 encoded string' });
        } else {
            // Basic base64 validation
            const base64Regex = /^data:image\/(png|jpeg|jpg);base64,/;
            if (!base64Regex.test(depth_map) && !depth_map.match(/^[A-Za-z0-9+/=]+$/)) {
                errors.push({ field: 'depth_map', message: 'Depth map must be valid base64 encoded image' });
            }
        }
    }

    // Placement config validation (optional)
    if (placement_config !== undefined && typeof placement_config !== 'object') {
        errors.push({ field: 'placement_config', message: 'Placement config must be an object' });
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors
        });
    }

    next();
}

/**
 * Validate AI Council enhancement request
 * Required: user_prompt, style
 * Optional: body_part, complexity
 */
export function validateCouncilEnhanceRequest(req, res, next) {
    const { user_prompt, style, body_part, complexity } = req.body;
    const errors = [];

    // User prompt validation
    if (!user_prompt) {
        errors.push({ field: 'user_prompt', message: 'User prompt is required' });
    } else if (typeof user_prompt !== 'string') {
        errors.push({ field: 'user_prompt', message: 'User prompt must be a string' });
    } else if (user_prompt.length < 3 || user_prompt.length > 1000) {
        errors.push({ field: 'user_prompt', message: 'User prompt must be between 3 and 1000 characters' });
    }

    // Style validation
    const validStyles = [
        'anime', 'traditional', 'fine-line', 'tribal', 'watercolor',
        'blackwork', 'realism', 'geometric', 'japanese', 'minimalist'
    ];
    if (!style) {
        errors.push({ field: 'style', message: 'Style is required' });
    } else if (!validStyles.includes(style.toLowerCase())) {
        errors.push({
            field: 'style',
            message: `Style must be one of: ${validStyles.join(', ')}`
        });
    }

    // Body part validation (optional)
    if (body_part !== undefined) {
        const validBodyParts = ['arm', 'leg', 'back', 'chest', 'shoulder', 'forearm', 'calf', 'thigh'];
        if (!validBodyParts.includes(body_part.toLowerCase())) {
            errors.push({
                field: 'body_part',
                message: `Body part must be one of: ${validBodyParts.join(', ')}`
            });
        }
    }

    // Complexity validation (optional)
    if (complexity !== undefined) {
        const validComplexity = ['simple', 'medium', 'complex'];
        if (!validComplexity.includes(complexity.toLowerCase())) {
            errors.push({
                field: 'complexity',
                message: `Complexity must be one of: ${validComplexity.join(', ')}`
            });
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors
        });
    }

    next();
}

/**
 * Validate stencil export request
 * Required: design_id, dimensions
 * Optional: format, include_metadata, artist_info
 */
export function validateStencilExportRequest(req, res, next) {
    const { design_id, dimensions, format, include_metadata, artist_info } = req.body;
    const errors = [];

    // Design ID validation
    if (!design_id) {
        errors.push({ field: 'design_id', message: 'Design ID is required' });
    } else if (typeof design_id !== 'string') {
        errors.push({ field: 'design_id', message: 'Design ID must be a string' });
    }

    // Dimensions validation
    if (!dimensions) {
        errors.push({ field: 'dimensions', message: 'Dimensions are required' });
    } else if (typeof dimensions !== 'object') {
        errors.push({ field: 'dimensions', message: 'Dimensions must be an object' });
    } else {
        const { width, height } = dimensions;

        if (!width || typeof width !== 'number' || width <= 0 || width > 24) {
            errors.push({
                field: 'dimensions.width',
                message: 'Width must be a positive number between 0 and 24 inches'
            });
        }

        if (!height || typeof height !== 'number' || height <= 0 || height > 36) {
            errors.push({
                field: 'dimensions.height',
                message: 'Height must be a positive number between 0 and 36 inches'
            });
        }
    }

    // Format validation (optional)
    if (format !== undefined) {
        const validFormats = ['pdf', 'png', 'svg'];
        if (!validFormats.includes(format.toLowerCase())) {
            errors.push({
                field: 'format',
                message: `Format must be one of: ${validFormats.join(', ')}`
            });
        }
    }

    // Include metadata validation (optional)
    if (include_metadata !== undefined && typeof include_metadata !== 'boolean') {
        errors.push({ field: 'include_metadata', message: 'Include metadata must be a boolean' });
    }

    // Artist info validation (optional)
    if (artist_info !== undefined && typeof artist_info !== 'object') {
        errors.push({ field: 'artist_info', message: 'Artist info must be an object' });
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors
        });
    }

    next();
}
