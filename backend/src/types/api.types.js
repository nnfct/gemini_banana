/**
 * API Type Definitions and Schema Validation
 * Provides TypeScript-like interfaces and validation schemas for API requests and responses
 */

/**
 * @typedef {Object} ApiFile
 * @property {string} base64 - Base64 encoded image data (without data URI prefix)
 * @property {string} mimeType - MIME type of the image (image/jpeg, image/png, image/webp)
 */

/**
 * @typedef {Object} ClothingItems
 * @property {ApiFile|null} [top] - Top clothing item (shirt, jacket, etc.)
 * @property {ApiFile|null} [pants] - Pants clothing item
 * @property {ApiFile|null} [shoes] - Shoes clothing item
 */

/**
 * @typedef {Object} VirtualTryOnRequest
 * @property {ApiFile} person - Person image data
 * @property {ClothingItems} clothingItems - Clothing items to try on
 */

/**
 * @typedef {Object} VirtualTryOnResponse
 * @property {string} generatedImage - Base64 data URI of generated image
 * @property {string} requestId - Unique identifier for the request
 * @property {string} timestamp - ISO timestamp of the response
 */

/**
 * @typedef {Object} RecommendationRequest
 * @property {ApiFile} [person] - Person image data for style analysis
 * @property {ClothingItems} [clothingItems] - Clothing items for style analysis
 * @property {RecommendationOptions} [options] - Recommendation options
 */

/**
 * @typedef {Object} RecommendationFromFittingRequest
 * @property {string} generatedImage - Base64 data URI of virtual try-on result
 * @property {ClothingItems} [originalClothingItems] - Original clothing items for context
 * @property {RecommendationOptions} [options] - Recommendation options
 */

/**
 * @typedef {Object} RecommendationOptions
 * @property {number} [maxPerCategory=3] - Maximum recommendations per category
 * @property {number} [minPrice] - Minimum price filter
 * @property {number} [maxPrice] - Maximum price filter
 * @property {string[]} [excludeTags] - Tags to exclude from recommendations
 */

/**
 * @typedef {Object} RecommendationItem
 * @property {string} id - Unique product identifier
 * @property {string} title - Product title
 * @property {number} price - Product price
 * @property {string} [imageUrl] - Product image URL
 * @property {number} [score] - Recommendation score (0-1)
 * @property {string[]} tags - Product tags
 * @property {string} category - Product category (top, pants, shoes, accessories)
 */

/**
 * @typedef {Object} CategoryRecommendations
 * @property {RecommendationItem[]} top - Top clothing recommendations
 * @property {RecommendationItem[]} pants - Pants recommendations
 * @property {RecommendationItem[]} shoes - Shoes recommendations
 * @property {RecommendationItem[]} accessories - Accessories recommendations
 */

/**
 * @typedef {Object} RecommendationResponse
 * @property {CategoryRecommendations} recommendations - Categorized product recommendations
 * @property {string} analysisMethod - Method used for analysis (ai/fallback)
 * @property {Object} [styleAnalysis] - Style analysis result (if AI analysis was used)
 * @property {Object} [clothingAnalysis] - Clothing analysis result (if AI analysis was used)
 * @property {string} requestId - Unique identifier for the request
 * @property {string} timestamp - ISO timestamp of the response
 */

/**
 * @typedef {Object} StyleAnalysis
 * @property {string[]} detected_style - Detected style keywords
 * @property {string[]} colors - Detected colors
 * @property {string[]} categories - Detected item categories
 * @property {string[]} style_preference - Estimated style preferences
 */

/**
 * @typedef {Object} ClothingAnalysis
 * @property {string[]} [top] - Top clothing characteristics
 * @property {string[]} [pants] - Pants characteristics
 * @property {string[]} [shoes] - Shoes characteristics
 * @property {string[]} overall_style - Overall style characteristics
 */

/**
 * @typedef {Object} ApiError
 * @property {Object} error - Error details
 * @property {string} error.message - Error message
 * @property {string} error.code - Error code
 * @property {string} [error.field] - Field that caused the error
 * @property {string} [error.details] - Additional error details (development only)
 */

/**
 * @typedef {Object} ServiceStatus
 * @property {boolean} available - Whether the service is available
 * @property {Object} config - Service configuration details
 */

/**
 * @typedef {Object} CatalogStatistics
 * @property {number} totalProducts - Total number of products in catalog
 * @property {Object} categories - Product count by category
 * @property {Object} priceRange - Price range information
 * @property {number} priceRange.min - Minimum price
 * @property {number} priceRange.max - Maximum price
 * @property {number} priceRange.average - Average price
 */

// Validation schemas using simple JavaScript validation

/**
 * Validates API file structure
 * @param {any} file - File object to validate
 * @param {string} fieldName - Field name for error reporting
 * @throws {Error} If validation fails
 */
export function validateApiFile(file, fieldName = 'file') {
    if (!file || typeof file !== 'object') {
        throw new Error(`${fieldName} must be an object`);
    }

    if (!file.base64 || typeof file.base64 !== 'string') {
        throw new Error(`${fieldName}.base64 is required and must be a string`);
    }

    if (!file.mimeType || typeof file.mimeType !== 'string') {
        throw new Error(`${fieldName}.mimeType is required and must be a string`);
    }

    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimeType)) {
        throw new Error(`${fieldName}.mimeType must be one of: ${allowedMimeTypes.join(', ')}`);
    }

    // Basic base64 validation
    if (!isValidBase64(file.base64)) {
        throw new Error(`${fieldName}.base64 contains invalid base64 data`);
    }
}

/**
 * Validates clothing items structure
 * @param {any} clothingItems - Clothing items to validate
 * @param {boolean} requireAtLeastOne - Whether at least one item is required
 * @throws {Error} If validation fails
 */
export function validateClothingItems(clothingItems, requireAtLeastOne = false) {
    if (!clothingItems || typeof clothingItems !== 'object') {
        if (requireAtLeastOne) {
            throw new Error('clothingItems is required and must be an object');
        }
        return;
    }

    const validCategories = ['top', 'pants', 'shoes'];
    const providedItems = [];

    for (const [category, item] of Object.entries(clothingItems)) {
        if (!validCategories.includes(category)) {
            throw new Error(`Invalid clothing category: ${category}. Valid categories: ${validCategories.join(', ')}`);
        }

        if (item !== null && item !== undefined) {
            validateApiFile(item, `clothingItems.${category}`);
            providedItems.push(category);
        }
    }

    if (requireAtLeastOne && providedItems.length === 0) {
        throw new Error('At least one clothing item (top, pants, or shoes) is required');
    }
}

/**
 * Validates virtual try-on request
 * @param {any} request - Request object to validate
 * @throws {Error} If validation fails
 */
export function validateVirtualTryOnRequest(request) {
    if (!request || typeof request !== 'object') {
        throw new Error('Request body is required and must be an object');
    }

    // Validate person image
    if (!request.person) {
        throw new Error('person is required');
    }
    validateApiFile(request.person, 'person');

    // Validate clothing items
    if (!request.clothingItems) {
        throw new Error('clothingItems is required');
    }
    validateClothingItems(request.clothingItems, true);
}

/**
 * Validates recommendation request
 * @param {any} request - Request object to validate
 * @throws {Error} If validation fails
 */
export function validateRecommendationRequest(request) {
    if (!request || typeof request !== 'object') {
        throw new Error('Request body is required and must be an object');
    }

    const hasPerson = request.person && typeof request.person === 'object';
    const hasClothingItems = request.clothingItems && typeof request.clothingItems === 'object';

    if (!hasPerson && !hasClothingItems) {
        throw new Error('At least person image or clothing items are required');
    }

    // Validate person if provided
    if (hasPerson) {
        validateApiFile(request.person, 'person');
    }

    // Validate clothing items if provided
    if (hasClothingItems) {
        validateClothingItems(request.clothingItems, false);
    }

    // Validate options if provided
    if (request.options) {
        validateRecommendationOptions(request.options);
    }
}

/**
 * Validates recommendation from fitting request
 * @param {any} request - Request object to validate
 * @throws {Error} If validation fails
 */
export function validateRecommendationFromFittingRequest(request) {
    if (!request || typeof request !== 'object') {
        throw new Error('Request body is required and must be an object');
    }

    // Validate generated image
    if (!request.generatedImage || typeof request.generatedImage !== 'string') {
        throw new Error('generatedImage is required and must be a string');
    }

    if (!request.generatedImage.startsWith('data:image/')) {
        throw new Error('generatedImage must be a valid data URI (data:image/...)');
    }

    // Validate original clothing items if provided
    if (request.originalClothingItems) {
        validateClothingItems(request.originalClothingItems, false);
    }

    // Validate options if provided
    if (request.options) {
        validateRecommendationOptions(request.options);
    }
}

/**
 * Validates recommendation options
 * @param {any} options - Options object to validate
 * @throws {Error} If validation fails
 */
export function validateRecommendationOptions(options) {
    if (!options || typeof options !== 'object') {
        throw new Error('options must be an object');
    }

    // Validate maxPerCategory
    if (options.maxPerCategory !== undefined) {
        if (!Number.isInteger(options.maxPerCategory) || options.maxPerCategory < 1 || options.maxPerCategory > 20) {
            throw new Error('maxPerCategory must be an integer between 1 and 20');
        }
    }

    // Validate price filters
    if (options.minPrice !== undefined) {
        if (!Number.isInteger(options.minPrice) || options.minPrice < 0) {
            throw new Error('minPrice must be a non-negative integer');
        }
    }

    if (options.maxPrice !== undefined) {
        if (!Number.isInteger(options.maxPrice) || options.maxPrice < 0) {
            throw new Error('maxPrice must be a non-negative integer');
        }
    }

    if (options.minPrice !== undefined && options.maxPrice !== undefined) {
        if (options.minPrice > options.maxPrice) {
            throw new Error('minPrice cannot be greater than maxPrice');
        }
    }

    // Validate excludeTags
    if (options.excludeTags !== undefined) {
        if (!Array.isArray(options.excludeTags)) {
            throw new Error('excludeTags must be an array');
        }

        for (const tag of options.excludeTags) {
            if (typeof tag !== 'string') {
                throw new Error('excludeTags must contain only strings');
            }
        }
    }
}

/**
 * Creates a standardized API response
 * @param {any} data - Response data
 * @param {string} requestId - Request ID
 * @param {string} timestamp - Request timestamp
 * @returns {Object} Standardized response object
 */
export function createApiResponse(data, requestId, timestamp) {
    return {
        ...data,
        requestId,
        timestamp
    };
}

/**
 * Creates a standardized API error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {string} [field] - Field that caused the error
 * @param {string} [details] - Additional error details
 * @returns {Object} Standardized error response
 */
export function createApiError(message, code, field = null, details = null) {
    const error = {
        message,
        code
    };

    if (field) {
        error.field = field;
    }

    if (details && process.env.NODE_ENV === 'development') {
        error.details = details;
    }

    return { error };
}

/**
 * Validates recommendation item structure
 * @param {any} item - Item to validate
 * @throws {Error} If validation fails
 */
export function validateRecommendationItem(item) {
    if (!item || typeof item !== 'object') {
        throw new Error('Recommendation item must be an object');
    }

    const requiredFields = ['id', 'title', 'price', 'tags', 'category'];

    for (const field of requiredFields) {
        if (!(field in item)) {
            throw new Error(`Recommendation item missing required field: ${field}`);
        }
    }

    // Validate field types
    if (typeof item.id !== 'string') {
        throw new Error('Recommendation item id must be a string');
    }

    if (typeof item.title !== 'string') {
        throw new Error('Recommendation item title must be a string');
    }

    if (!Number.isInteger(item.price) || item.price < 0) {
        throw new Error('Recommendation item price must be a non-negative integer');
    }

    if (!Array.isArray(item.tags)) {
        throw new Error('Recommendation item tags must be an array');
    }

    for (const tag of item.tags) {
        if (typeof tag !== 'string') {
            throw new Error('Recommendation item tags must contain only strings');
        }
    }

    const validCategories = ['top', 'pants', 'shoes', 'accessories'];
    if (!validCategories.includes(item.category)) {
        throw new Error(`Invalid category: ${item.category}. Valid categories: ${validCategories.join(', ')}`);
    }

    // Validate optional fields
    if (item.imageUrl !== undefined && typeof item.imageUrl !== 'string') {
        throw new Error('Recommendation item imageUrl must be a string');
    }

    if (item.score !== undefined && (typeof item.score !== 'number' || item.score < 0 || item.score > 1)) {
        throw new Error('Recommendation item score must be a number between 0 and 1');
    }
}

/**
 * Validates category recommendations structure
 * @param {any} recommendations - Recommendations to validate
 * @throws {Error} If validation fails
 */
export function validateCategoryRecommendations(recommendations) {
    if (!recommendations || typeof recommendations !== 'object') {
        throw new Error('Recommendations must be an object');
    }

    const requiredCategories = ['top', 'pants', 'shoes', 'accessories'];

    for (const category of requiredCategories) {
        if (!(category in recommendations)) {
            throw new Error(`Missing category: ${category}`);
        }

        if (!Array.isArray(recommendations[category])) {
            throw new Error(`Category ${category} must be an array`);
        }

        for (const item of recommendations[category]) {
            validateRecommendationItem(item);
        }
    }
}

// Utility functions

/**
 * Checks if a string is valid base64
 * @param {string} str - String to check
 * @returns {boolean} True if valid base64
 */
function isValidBase64(str) {
    try {
        // Basic base64 pattern check
        const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
        return base64Pattern.test(str) && str.length % 4 === 0;
    } catch {
        return false;
    }
}

/**
 * Sanitizes and normalizes API file data
 * @param {Object} file - File object to sanitize
 * @returns {Object} Sanitized file object
 */
export function sanitizeApiFile(file) {
    return {
        base64: file.base64.trim(),
        mimeType: file.mimeType.toLowerCase().trim()
    };
}

/**
 * Sanitizes and normalizes clothing items
 * @param {Object} clothingItems - Clothing items to sanitize
 * @returns {Object} Sanitized clothing items
 */
export function sanitizeClothingItems(clothingItems) {
    const sanitized = {};
    const validCategories = ['top', 'pants', 'shoes'];

    for (const category of validCategories) {
        if (clothingItems[category] && clothingItems[category] !== null) {
            sanitized[category] = sanitizeApiFile(clothingItems[category]);
        }
    }

    return sanitized;
}

/**
 * Sanitizes recommendation options
 * @param {Object} options - Options to sanitize
 * @returns {Object} Sanitized options
 */
export function sanitizeRecommendationOptions(options) {
    const sanitized = {};

    if (options.maxPerCategory !== undefined) {
        sanitized.maxPerCategory = Math.max(1, Math.min(20, parseInt(options.maxPerCategory)));
    }

    if (options.minPrice !== undefined) {
        sanitized.minPrice = Math.max(0, parseInt(options.minPrice));
    }

    if (options.maxPrice !== undefined) {
        sanitized.maxPrice = Math.max(0, parseInt(options.maxPrice));
    }

    if (options.excludeTags && Array.isArray(options.excludeTags)) {
        sanitized.excludeTags = options.excludeTags
            .filter(tag => typeof tag === 'string')
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0);
    }

    return sanitized;
}

// Export validation middleware factory
/**
 * Creates Express middleware for request validation
 * @param {Function} validationFn - Validation function to use
 * @returns {Function} Express middleware function
 */
export function createValidationMiddleware(validationFn) {
    return (req, res, next) => {
        try {
            validationFn(req.body);
            next();
        } catch (error) {
            res.status(400).json(createApiError(
                error.message,
                'VALIDATION_ERROR',
                null,
                error.message
            ));
        }
    };
}

// Pre-built validation middleware
export const validateVirtualTryOnMiddleware = createValidationMiddleware(validateVirtualTryOnRequest);
export const validateRecommendationMiddleware = createValidationMiddleware(validateRecommendationRequest);
export const validateRecommendationFromFittingMiddleware = createValidationMiddleware(validateRecommendationFromFittingRequest);