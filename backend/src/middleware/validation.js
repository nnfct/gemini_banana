/**
 * Request validation middleware utilities
 * Provides validation functions for API requests
 */

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
    constructor(message, field = null, code = 'VALIDATION_ERROR') {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.code = code;
        this.statusCode = 400;
    }
}

/**
 * Validates that required fields are present in request body
 * @param {string[]} requiredFields - Array of required field names
 * @returns {Function} Express middleware function
 */
export function validateRequiredFields(requiredFields) {
    return (req, res, next) => {
        const missingFields = [];

        for (const field of requiredFields) {
            if (!req.body || req.body[field] === undefined || req.body[field] === null) {
                missingFields.push(field);
            }
        }

        if (missingFields.length > 0) {
            return next(new ValidationError(
                `Missing required fields: ${missingFields.join(', ')}`,
                missingFields[0],
                'MISSING_REQUIRED_FIELDS'
            ));
        }

        next();
    };
}

/**
 * Validates file upload data structure
 * @param {Object} options - Validation options
 * @param {string[]} options.allowedTypes - Allowed MIME types
 * @param {number} options.maxSize - Maximum file size in bytes
 * @returns {Function} Express middleware function
 */
export function validateFileUpload(options = {}) {
    const { allowedTypes = ['image/jpeg', 'image/png', 'image/webp'], maxSize = 10 * 1024 * 1024 } = options;

    return (req, res, next) => {
        const validateFile = (file, fieldName) => {
            if (!file) return;

            // Check if file has required properties
            if (!file.base64 || !file.mimeType) {
                throw new ValidationError(
                    `Invalid file format for ${fieldName}. Expected base64 and mimeType properties.`,
                    fieldName,
                    'INVALID_FILE_FORMAT'
                );
            }

            // Validate MIME type
            if (!allowedTypes.includes(file.mimeType)) {
                throw new ValidationError(
                    `Invalid file type for ${fieldName}. Allowed types: ${allowedTypes.join(', ')}`,
                    fieldName,
                    'INVALID_FILE_TYPE'
                );
            }

            // Estimate file size from base64 (rough calculation)
            const base64Size = file.base64.length * 0.75; // Base64 is ~33% larger than binary
            if (base64Size > maxSize) {
                throw new ValidationError(
                    `File too large for ${fieldName}. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
                    fieldName,
                    'FILE_TOO_LARGE'
                );
            }
        };

        try {
            // Validate person image if present
            if (req.body.person) {
                validateFile(req.body.person, 'person');
            }

            // Validate clothing items if present
            if (req.body.clothingItems) {
                const clothingTypes = ['top', 'pants', 'shoes'];
                for (const type of clothingTypes) {
                    if (req.body.clothingItems[type]) {
                        validateFile(req.body.clothingItems[type], `clothingItems.${type}`);
                    }
                }
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Validates request content type
 * @param {string[]} allowedTypes - Array of allowed content types
 * @returns {Function} Express middleware function
 */
export function validateContentType(allowedTypes = ['application/json']) {
    return (req, res, next) => {
        const contentType = req.get('Content-Type');

        if (!contentType) {
            return next(new ValidationError(
                'Content-Type header is required',
                'content-type',
                'MISSING_CONTENT_TYPE'
            ));
        }

        const isAllowed = allowedTypes.some(type => contentType.includes(type));

        if (!isAllowed) {
            return next(new ValidationError(
                `Invalid Content-Type. Allowed types: ${allowedTypes.join(', ')}`,
                'content-type',
                'INVALID_CONTENT_TYPE'
            ));
        }

        next();
    };
}

/**
 * Validates request body size
 * @param {number} maxSize - Maximum body size in bytes
 * @returns {Function} Express middleware function
 */
export function validateBodySize(maxSize = 10 * 1024 * 1024) {
    return (req, res, next) => {
        const contentLength = parseInt(req.get('Content-Length') || '0');

        if (contentLength > maxSize) {
            return next(new ValidationError(
                `Request body too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
                'body-size',
                'BODY_TOO_LARGE'
            ));
        }

        next();
    };
}

/**
 * Sanitizes request body by removing potentially dangerous properties
 * @param {string[]} dangerousFields - Fields to remove from request body
 * @returns {Function} Express middleware function
 */
export function sanitizeRequestBody(dangerousFields = ['__proto__', 'constructor', 'prototype']) {
    return (req, res, next) => {
        if (req.body && typeof req.body === 'object') {
            for (const field of dangerousFields) {
                delete req.body[field];
            }
        }
        next();
    };
}

/**
 * Generic validation middleware that accepts a custom validation function
 * @param {Function} validationFn - Custom validation function that throws ValidationError
 * @returns {Function} Express middleware function
 */
export function customValidation(validationFn) {
    return async (req, res, next) => {
        try {
            await validationFn(req);
            next();
        } catch (error) {
            if (error instanceof ValidationError) {
                next(error);
            } else {
                next(new ValidationError('Validation failed', null, 'CUSTOM_VALIDATION_ERROR'));
            }
        }
    };
}