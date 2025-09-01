import request from 'supertest';
import express from 'express';
import imageProcessingRoutes from '../../src/routes/imageProcessing.js';

// Create test app
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use('/api/image', imageProcessingRoutes);

describe('Image Processing Routes', () => {
    // Create test image data
    const createTestImage = (format = 'jpeg') => {
        let buffer;
        let mimeType;

        switch (format) {
            case 'jpeg':
                buffer = Buffer.from([
                    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
                    0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
                    0x00, 0x48, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11,
                    0x08, 0x00, 0x64, 0x00, 0x64, 0x01, 0x01, 0x11,
                    0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF,
                    0xD9
                ]);
                mimeType = 'image/jpeg';
                break;
            case 'png':
                buffer = Buffer.from([
                    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                    0x00, 0x00, 0x00, 0x0D,
                    0x49, 0x48, 0x44, 0x52,
                    0x00, 0x00, 0x00, 0x64,
                    0x00, 0x00, 0x00, 0x64,
                    0x08, 0x02, 0x00, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00
                ]);
                mimeType = 'image/png';
                break;
            default:
                throw new Error(`Unsupported test format: ${format}`);
        }

        return `data:${mimeType};base64,${buffer.toString('base64')}`;
    };

    describe('POST /api/image/process', () => {
        test('should process valid image', async () => {
            const testImage = createTestImage('jpeg');

            const response = await request(app)
                .post('/api/image/process')
                .send({ image: testImage })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.processed).toBe(true);
            expect(response.body.data.metadata).toBeDefined();
            expect(response.body.data.processingTime).toBeGreaterThanOrEqual(0);
        });

        test('should process image with options', async () => {
            const testImage = createTestImage('jpeg');

            const response = await request(app)
                .post('/api/image/process')
                .send({
                    image: testImage,
                    options: {
                        resize: true,
                        targetWidth: 512,
                        targetHeight: 512,
                        optimize: true
                    }
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.metadata.operations).toContain('resize');
            expect(response.body.data.metadata.operations).toContain('optimize');
        });

        test('should return 400 for missing image', async () => {
            const response = await request(app)
                .post('/api/image/process')
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Image data is required');
            expect(response.body.code).toBe('MISSING_IMAGE');
        });

        test('should return 400 for invalid image', async () => {
            const response = await request(app)
                .post('/api/image/process')
                .send({ image: 'invalid-image-data' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBeDefined();
        });
    });

    describe('POST /api/image/validate', () => {
        test('should validate valid JPEG image', async () => {
            const testImage = createTestImage('jpeg');

            const response = await request(app)
                .post('/api/image/validate')
                .send({ image: testImage })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.valid).toBe(true);
            expect(response.body.data.format).toBe('jpeg');
            expect(response.body.data.dimensions).toBeDefined();
        });

        test('should validate valid PNG image', async () => {
            const testImage = createTestImage('png');

            const response = await request(app)
                .post('/api/image/validate')
                .send({ image: testImage })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.valid).toBe(true);
            expect(response.body.data.format).toBe('png');
        });

        test('should return 400 for missing image', async () => {
            const response = await request(app)
                .post('/api/image/validate')
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('MISSING_IMAGE');
        });

        test('should return 400 for invalid image', async () => {
            // Create oversized image data
            const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
            const oversizedImage = `data:image/jpeg;base64,${largeBuffer.toString('base64')}`;

            const response = await request(app)
                .post('/api/image/validate')
                .send({ image: oversizedImage })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('too large');
        });
    });

    describe('POST /api/image/metadata', () => {
        test('should extract metadata from JPEG', async () => {
            const testImage = createTestImage('jpeg');

            const response = await request(app)
                .post('/api/image/metadata')
                .send({ image: testImage })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.format).toBe('jpeg');
            expect(response.body.data.mimeType).toBe('image/jpeg');
            expect(response.body.data.dimensions).toBeDefined();
            expect(response.body.data.aspectRatio).toBeDefined();
        });

        test('should extract metadata from PNG', async () => {
            const testImage = createTestImage('png');

            const response = await request(app)
                .post('/api/image/metadata')
                .send({ image: testImage })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.format).toBe('png');
            expect(response.body.data.mimeType).toBe('image/png');
        });

        test('should return 400 for missing image', async () => {
            const response = await request(app)
                .post('/api/image/metadata')
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('MISSING_IMAGE');
        });
    });

    describe('POST /api/image/resize', () => {
        test('should resize image with default options', async () => {
            const testImage = createTestImage('jpeg');

            const response = await request(app)
                .post('/api/image/resize')
                .send({ image: testImage })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.image).toMatch(/^data:image\/jpeg;base64,/);
            expect(response.body.data.metadata).toBeDefined();
        });

        test('should resize image with custom dimensions', async () => {
            const testImage = createTestImage('jpeg');

            const response = await request(app)
                .post('/api/image/resize')
                .send({
                    image: testImage,
                    width: 512,
                    height: 384,
                    quality: 90
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.metadata.targetDimensions).toEqual({
                width: 512,
                height: 384
            });
        });

        test('should return 400 for missing image', async () => {
            const response = await request(app)
                .post('/api/image/resize')
                .send({ width: 512, height: 384 })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('MISSING_IMAGE');
        });
    });

    describe('GET /api/image/config', () => {
        test('should return service configuration', async () => {
            const response = await request(app)
                .get('/api/image/config')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.supportedFormats).toBeDefined();
            expect(response.body.data.maxFileSize).toBeDefined();
            expect(response.body.data.defaultWidth).toBeDefined();
            expect(response.body.data.defaultHeight).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/api/image/process')
                .set('Content-Type', 'application/json')
                .send('invalid-json')
                .expect(400);

            // Express should handle malformed JSON and return 400
        });

        test('should handle large payloads', async () => {
            // Create a very large but valid image
            const largeImageData = 'a'.repeat(1000000); // 1MB of 'a' characters
            const largeImage = `data:image/jpeg;base64,${Buffer.from(largeImageData).toString('base64')}`;

            const response = await request(app)
                .post('/api/image/process')
                .send({ image: largeImage });

            // Should either process successfully or return appropriate error
            expect([200, 400, 413]).toContain(response.status);
        });
    });

    describe('Content Type Handling', () => {
        test('should handle different content types', async () => {
            const testImage = createTestImage('jpeg');

            const response = await request(app)
                .post('/api/image/process')
                .set('Content-Type', 'application/json')
                .send(JSON.stringify({ image: testImage }))
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('Concurrent Requests', () => {
        test('should handle multiple concurrent requests', async () => {
            const testImage = createTestImage('jpeg');

            const requests = Array(5).fill().map(() =>
                request(app)
                    .post('/api/image/process')
                    .send({ image: testImage })
            );

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });
    });
});