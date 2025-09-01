import { Router } from 'express';
import geminiService from '../services/gemini.service.js';
import { validateRequiredFields, validateFileUpload, ValidationError } from '../middleware/validation.js';
import { ApiError, ApiErrors, asyncHandler } from '../middleware/error.js';
import {
    validateVirtualTryOnRequest,
    createApiResponse,
    createApiError
} from '../types/api.types.js';

/**
 * Virtual try-on API routes
 * Handles image generation using Gemini AI service
 */

const router = Router();

/**
 * @api {post} /api/generate Generate virtual try-on image
 * @apiName GenerateVirtualTryOn
 * @apiGroup VirtualTryOn
 * @apiVersion 1.0.0
 * 
 * @apiDescription Generates a virtual try-on image by combining a person image with clothing items using Gemini AI.
 * 
 * @apiBody {Object} person Person image data
 * @apiBody {String} person.base64 Base64 encoded image data (without data URI prefix)
 * @apiBody {String} person.mimeType MIME type of the image (image/jpeg, image/png, image/webp)
 * @apiBody {Object} clothingItems Clothing items to try on
 * @apiBody {Object} [clothingItems.top] Top clothing item (shirt, jacket, etc.)
 * @apiBody {String} [clothingItems.top.base64] Base64 encoded image data
 * @apiBody {String} [clothingItems.top.mimeType] MIME type of the image
 * @apiBody {Object} [clothingItems.pants] Pants clothing item
 * @apiBody {String} [clothingItems.pants.base64] Base64 encoded image data
 * @apiBody {String} [clothingItems.pants.mimeType] MIME type of the image
 * @apiBody {Object} [clothingItems.shoes] Shoes clothing item
 * @apiBody {String} [clothingItems.shoes.base64] Base64 encoded image data
 * @apiBody {String} [clothingItems.shoes.mimeType] MIME type of the image
 * 
 * @apiExample {json} Request Example:
 * {
 *   "person": {
 *     "base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
 *     "mimeType": "image/jpeg"
 *   },
 *   "clothingItems": {
 *     "top": {
 *       "base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
 *       "mimeType": "image/jpeg"
 *     },
 *     "pants": {
 *       "base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
 *       "mimeType": "image/jpeg"
 *     }
 *   }
 * }
 * 
 * @apiSuccess {String} generatedImage Base64 data URI of the generated image
 * @apiSuccess {String} requestId Unique identifier for the request
 * @apiSuccess {String} timestamp ISO timestamp of the response
 * 
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 200 OK
 * {
 *   "generatedImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
 *   "requestId": "req_1234567890_abc123",
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 * 
 * @apiError (400) ValidationError Invalid request data
 * @apiError (500) ServiceError Gemini AI service error
 * @apiError (503) ServiceUnavailable Gemini AI service not configured
 * 
 * @apiErrorExample {json} Validation Error:
 * HTTP/1.1 400 Bad Request
 * {
 *   "error": {
 *     "message": "Missing required fields: person",
 *     "code": "MISSING_REQUIRED_FIELDS",
 *     "field": "person"
 *   }
 * }
 * 
 * @apiErrorExample {json} Service Error:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "error": {
 *     "message": "Virtual try-on generation failed: API quota exceeded",
 *     "code": "SERVICE_ERROR"
 *   }
 * }
 */
router.post('/', [
    // Schema validation using type definitions
    (req, res, next) => {
        try {
            validateVirtualTryOnRequest(req.body);
            next();
        } catch (error) {
            next(ApiErrors.badRequest(error.message, { field: 'request_body' }));
        }
    },

    // Additional file upload validation
    validateFileUpload({
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSize: 10 * 1024 * 1024 // 10MB
    })
], asyncHandler(async (req, res, next) => {
    try {
        const { person, clothingItems } = req.body;

        // Check if Gemini service is available
        if (!geminiService.isAvailable()) {
            throw ApiErrors.serviceUnavailable('Virtual try-on service is not available. Please check configuration.');
        }

        // Log request for debugging (in development)
        if (process.env.NODE_ENV === 'development') {
            console.log(`🎨 Generating virtual try-on [${req.id}]`);
            console.log(`   Person: ${person.mimeType}`);
            console.log(`   Clothing items: ${Object.keys(clothingItems).join(', ')}`);
        }

        // Generate virtual try-on image
        const generatedImage = await geminiService.generateVirtualTryOnImage(person, clothingItems);

        if (!generatedImage) {
            throw ApiErrors.internalServer('Failed to generate virtual try-on image. No image returned from AI service.');
        }

        // Success response
        res.json(createApiResponse({
            generatedImage
        }, req.id, req.timestamp));

        // Log success (in development)
        if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Virtual try-on generated successfully [${req.id}]`);
        }

    } catch (error) {
        // Handle specific error types and convert to ApiError
        if (error.message.includes('API key')) {
            throw ApiErrors.serviceUnavailable('AI service configuration error');
        }

        if (error.message.includes('quota') || error.message.includes('rate limit')) {
            throw ApiErrors.tooManyRequests('AI service rate limit exceeded. Please try again later.');
        }

        if (error.message.includes('timeout')) {
            throw ApiErrors.gatewayTimeout('Request timeout. The AI service took too long to respond.');
        }

        // If it's already an ApiError, re-throw it
        if (error instanceof ApiError) {
            throw error;
        }

        // Generic service error
        throw ApiErrors.internalServer('Virtual try-on generation failed');
    }
}));

/**
 * @api {get} /api/generate/status Get service status
 * @apiName GetGenerateServiceStatus
 * @apiGroup VirtualTryOn
 * @apiVersion 1.0.0
 * 
 * @apiDescription Returns the current status of the virtual try-on generation service.
 * 
 * @apiSuccess {Boolean} available Whether the service is available
 * @apiSuccess {Object} config Service configuration details
 * @apiSuccess {String} config.model AI model being used
 * @apiSuccess {Number} config.timeout Request timeout in milliseconds
 * @apiSuccess {Number} config.maxRetries Maximum retry attempts
 * @apiSuccess {Boolean} config.isConfigured Whether the service is properly configured
 * 
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 200 OK
 * {
 *   "available": true,
 *   "config": {
 *     "model": "gemini-2.5-flash-image-preview",
 *     "timeout": 30000,
 *     "maxRetries": 3,
 *     "isConfigured": true
 *   }
 * }
 */
router.get('/status', asyncHandler(async (req, res) => {
    const config = geminiService.getConfig();

    res.json({
        available: geminiService.isAvailable(),
        config
    });
}));

export default router;