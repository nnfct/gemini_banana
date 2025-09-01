// Tests for validation middleware
import { createMockRequest, createMockResponse, createMockNext } from '../utils/mocks.js';

// Import the middleware
const { validateRequiredFields, validateFileUpload, ValidationError } = await import('../../src/middleware/validation.js');

describe('ValidationError', () => {
    it('should create ValidationError with message and field', () => {
        const error = new ValidationError('Invalid field', 'email');

        expect(error.message).toBe('Invalid field');
        expect(error.field).toBe('email');
        expect(error.name).toBe('ValidationError');
    });

    it('should create ValidationError with only message', () => {
        const error = new ValidationError('General validation error');

        expect(error.message).toBe('General validation error');
        expect(error.field).toBeUndefined();
    });
});

describe('validateRequiredFields middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = createMockRequest();
        res = createMockResponse();
        next = createMockNext();
    });

    it('should pass validation when all required fields are present', () => {
        req.body = {
            name: 'John Doe',
            email: 'john@example.com',
            age: 25
        };

        const middleware = validateRequiredFields(['name', 'email']);
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();
    });

    it('should fail validation when required field is missing', () => {
        req.body = {
            name: 'John Doe'
            // email is missing
        };

        const middleware = validateRequiredFields(['name', 'email']);
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        const error = next.mock.calls[0][0];
        expect(error.message).toContain('email');
        expect(error.field).toBe('email');
    });

    it('should fail validation when required field is null', () => {
        req.body = {
            name: 'John Doe',
            email: null
        };

        const middleware = validateRequiredFields(['name', 'email']);
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        const error = next.mock.calls[0][0];
        expect(error.field).toBe('email');
    });

    it('should fail validation when required field is empty string', () => {
        req.body = {
            name: 'John Doe',
            email: ''
        };

        const middleware = validateRequiredFields(['name', 'email']);
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        const error = next.mock.calls[0][0];
        expect(error.field).toBe('email');
    });

    it('should handle nested field validation', () => {
        req.body = {
            user: {
                name: 'John Doe'
                // email is missing
            }
        };

        const middleware = validateRequiredFields(['user.name', 'user.email']);
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        const error = next.mock.calls[0][0];
        expect(error.field).toBe('user.email');
    });

    it('should handle array field validation', () => {
        req.body = {
            items: [
                { name: 'Item 1', price: 10 },
                { name: 'Item 2' } // price is missing
            ]
        };

        const middleware = validateRequiredFields(['items.0.name', 'items.1.price']);
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        const error = next.mock.calls[0][0];
        expect(error.field).toBe('items.1.price');
    });
});

describe('validateFileUpload middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = createMockRequest();
        res = createMockResponse();
        next = createMockNext();
    });

    it('should pass validation for valid file upload', () => {
        req.body = {
            person: {
                base64: 'valid-base64-data',
                mimeType: 'image/jpeg'
            }
        };

        const middleware = validateFileUpload({
            allowedTypes: ['image/jpeg', 'image/png'],
            maxSize: 1024 * 1024 // 1MB
        });
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();
    });

    it('should fail validation for unsupported file type', () => {
        req.body = {
            person: {
                base64: 'valid-base64-data',
                mimeType: 'image/gif' // not allowed
            }
        };

        const middleware = validateFileUpload({
            allowedTypes: ['image/jpeg', 'image/png'],
            maxSize: 1024 * 1024
        });
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        const error = next.mock.calls[0][0];
        expect(error.message).toContain('file type');
        expect(error.message).toContain('image/gif');
    });

    it('should fail validation for file too large', () => {
        // Create a large base64 string (simulate large file)
        const largeBase64 = 'a'.repeat(2 * 1024 * 1024); // 2MB of 'a' characters

        req.body = {
            person: {
                base64: largeBase64,
                mimeType: 'image/jpeg'
            }
        };

        const middleware = validateFileUpload({
            allowedTypes: ['image/jpeg', 'image/png'],
            maxSize: 1024 * 1024 // 1MB limit
        });
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        const error = next.mock.calls[0][0];
        expect(error.message).toContain('file size');
        expect(error.message).toContain('1MB');
    });

    it('should validate nested file objects', () => {
        req.body = {
            clothingItems: {
                top: {
                    base64: 'valid-base64-data',
                    mimeType: 'image/jpeg'
                },
                pants: {
                    base64: 'valid-base64-data',
                    mimeType: 'image/gif' // not allowed
                }
            }
        };

        const middleware = validateFileUpload({
            allowedTypes: ['image/jpeg', 'image/png'],
            maxSize: 1024 * 1024
        });
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        const error = next.mock.calls[0][0];
        expect(error.message).toContain('clothingItems.pants');
        expect(error.message).toContain('image/gif');
    });

    it('should skip validation for missing optional files', () => {
        req.body = {
            person: {
                base64: 'valid-base64-data',
                mimeType: 'image/jpeg'
            }
            // clothingItems is optional and missing
        };

        const middleware = validateFileUpload({
            allowedTypes: ['image/jpeg', 'image/png'],
            maxSize: 1024 * 1024
        });
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();
    });

    it('should use default options when not provided', () => {
        req.body = {
            person: {
                base64: 'valid-base64-data',
                mimeType: 'image/jpeg'
            }
        };

        const middleware = validateFileUpload(); // no options
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();
    });

    it('should handle invalid base64 data', () => {
        req.body = {
            person: {
                base64: null,
                mimeType: 'image/jpeg'
            }
        };

        const middleware = validateFileUpload({
            allowedTypes: ['image/jpeg', 'image/png'],
            maxSize: 1024 * 1024
        });
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        const error = next.mock.calls[0][0];
        expect(error.message).toContain('base64');
    });

    it('should handle missing mimeType', () => {
        req.body = {
            person: {
                base64: 'valid-base64-data'
                // mimeType is missing
            }
        };

        const middleware = validateFileUpload({
            allowedTypes: ['image/jpeg', 'image/png'],
            maxSize: 1024 * 1024
        });
        middleware(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        const error = next.mock.calls[0][0];
        expect(error.message).toContain('mimeType');
    });
});