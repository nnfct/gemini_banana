import { ImageProcessingService, ImageProcessingError } from '../../src/services/imageProcessingService.js';

describe('ImageProcessingService', () => {
    let service;

    beforeEach(() => {
        service = new ImageProcessingService();
    });

    describe('Configuration', () => {
        test('should have default configuration', () => {
            const config = service.getConfig();

            expect(config.supportedFormats).toContain('jpeg');
            expect(config.supportedFormats).toContain('png');
            expect(config.supportedFormats).toContain('webp');
            expect(config.maxFileSize).toBe(10 * 1024 * 1024);
            expect(config.defaultWidth).toBe(224);
            expect(config.defaultHeight).toBe(224);
        });

        test('should update configuration', () => {
            const newConfig = {
                maxFileSize: 5 * 1024 * 1024,
                defaultWidth: 512
            };

            service.updateConfig(newConfig);
            const config = service.getConfig();

            expect(config.maxFileSize).toBe(5 * 1024 * 1024);
            expect(config.defaultWidth).toBe(512);
            expect(config.defaultHeight).toBe(224); // Should remain unchanged
        });
    });

    describe('Base64 Conversion', () => {
        test('should convert buffer to base64', () => {
            const buffer = Buffer.from('test data');
            const mimeType = 'image/jpeg';

            const base64 = service.toBase64(buffer, mimeType);

            expect(base64).toMatch(/^data:image\/jpeg;base64,/);
            expect(base64).toContain(buffer.toString('base64'));
        });

        test('should convert base64 to buffer', () => {
            const originalData = 'test image data';
            const buffer = Buffer.from(originalData);
            const base64String = `data:image/jpeg;base64,${buffer.toString('base64')}`;

            const result = service.fromBase64(base64String);

            expect(result.buffer).toEqual(buffer);
            expect(result.mimeType).toBe('image/jpeg');
            expect(result.size).toBe(buffer.length);
        });

        test('should throw error for invalid base64 format', () => {
            const invalidBase64 = 'invalid-base64-string';

            expect(() => {
                service.fromBase64(invalidBase64);
            }).toThrow(ImageProcessingError);
        });
    });

    describe('Image Validation', () => {
        test('should validate JPEG image', async () => {
            // Create a minimal JPEG header
            const jpegHeader = Buffer.from([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
                0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
                0x00, 0x48, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11,
                0x08, 0x00, 0x64, 0x00, 0x64, 0x01, 0x01, 0x11,
                0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF,
                0xD9
            ]);

            const imageData = {
                buffer: jpegHeader,
                mimeType: 'image/jpeg',
                size: jpegHeader.length
            };

            const result = await service.validateImage(imageData);

            expect(result.isValid).toBe(true);
            expect(result.format).toBe('jpeg');
        });

        test('should validate PNG image', async () => {
            // Create a minimal PNG header with IHDR chunk
            const pngHeader = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
                0x00, 0x00, 0x00, 0x0D, // IHDR length
                0x49, 0x48, 0x44, 0x52, // IHDR
                0x00, 0x00, 0x00, 0x64, // Width: 100
                0x00, 0x00, 0x00, 0x64, // Height: 100
                0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, etc.
                0x00, 0x00, 0x00, 0x00  // CRC placeholder
            ]);

            const imageData = {
                buffer: pngHeader,
                mimeType: 'image/png',
                size: pngHeader.length
            };

            const result = await service.validateImage(imageData);

            expect(result.isValid).toBe(true);
            expect(result.format).toBe('png');
        });

        test('should reject oversized image', async () => {
            const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
            const imageData = {
                buffer: largeBuffer,
                mimeType: 'image/jpeg',
                size: largeBuffer.length
            };

            const result = await service.validateImage(imageData);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('too large');
        });

        test('should reject unsupported format', async () => {
            const buffer = Buffer.from('fake image data');
            const imageData = {
                buffer,
                mimeType: 'image/bmp',
                size: buffer.length
            };

            const result = await service.validateImage(imageData);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Unsupported image format');
        });
    });

    describe('Image Processing', () => {
        test('should process valid base64 image', async () => {
            // Create a minimal JPEG
            const jpegBuffer = Buffer.from([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
                0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
                0x00, 0x48, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11,
                0x08, 0x00, 0x64, 0x00, 0x64, 0x01, 0x01, 0x11,
                0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF,
                0xD9
            ]);

            const base64Image = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;

            const result = await service.processImage(base64Image);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.metadata).toBeDefined();
            expect(result.processingTime).toBeGreaterThan(0);
        });

        test('should process image with resize option', async () => {
            const jpegBuffer = Buffer.from([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
                0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
                0x00, 0x48, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11,
                0x08, 0x00, 0x64, 0x00, 0x64, 0x01, 0x01, 0x11,
                0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF,
                0xD9
            ]);

            const base64Image = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;

            const result = await service.processImage(base64Image, {
                resize: true,
                targetWidth: 512,
                targetHeight: 512
            });

            expect(result.success).toBe(true);
            expect(result.metadata.operations).toContain('resize');
            expect(result.metadata.targetDimensions).toEqual({
                width: 512,
                height: 512
            });
        });

        test('should throw error for invalid image data', async () => {
            const invalidData = 'not-an-image';

            await expect(service.processImage(invalidData))
                .rejects.toThrow(ImageProcessingError);
        });
    });

    describe('Image Metadata', () => {
        test('should extract metadata from JPEG', async () => {
            const jpegBuffer = Buffer.from([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
                0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
                0x00, 0x48, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11,
                0x08, 0x00, 0x64, 0x00, 0x64, 0x01, 0x01, 0x11,
                0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF,
                0xD9
            ]);

            const base64Image = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;

            const metadata = await service.getImageMetadata(base64Image);

            expect(metadata.format).toBe('jpeg');
            expect(metadata.mimeType).toBe('image/jpeg');
            expect(metadata.size).toBe(jpegBuffer.length);
            expect(metadata.dimensions).toBeDefined();
        });

        test('should extract metadata from PNG', async () => {
            const pngBuffer = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D,
                0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x64, // Width: 100
                0x00, 0x00, 0x00, 0x64, // Height: 100
                0x08, 0x02, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00
            ]);

            const base64Image = `data:image/png;base64,${pngBuffer.toString('base64')}`;

            const metadata = await service.getImageMetadata(base64Image);

            expect(metadata.format).toBe('png');
            expect(metadata.mimeType).toBe('image/png');
            expect(metadata.dimensions.width).toBe(100);
            expect(metadata.dimensions.height).toBe(100);
            expect(metadata.aspectRatio).toBe(1);
        });
    });

    describe('Resize Functionality', () => {
        test('should resize image with default options', async () => {
            const imageData = {
                buffer: Buffer.from('fake image data'),
                mimeType: 'image/jpeg',
                size: 1000
            };

            const result = await service.resizeImage(imageData);

            expect(result.success).toBe(true);
            expect(result.metadata.resized).toBe(true);
            expect(result.metadata.targetDimensions).toEqual({
                width: 224,
                height: 224
            });
        });

        test('should resize image with custom dimensions', async () => {
            const imageData = {
                buffer: Buffer.from('fake image data'),
                mimeType: 'image/jpeg',
                size: 1000
            };

            const result = await service.resizeImage(imageData, {
                width: 512,
                height: 384
            });

            expect(result.success).toBe(true);
            expect(result.metadata.targetDimensions).toEqual({
                width: 512,
                height: 384
            });
        });
    });

    describe('Error Handling', () => {
        test('should create ImageProcessingError with code and details', () => {
            const error = new ImageProcessingError(
                'Test error',
                'TEST_ERROR',
                { detail: 'test detail' }
            );

            expect(error.name).toBe('ImageProcessingError');
            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_ERROR');
            expect(error.details).toEqual({ detail: 'test detail' });
        });

        test('should handle processing errors gracefully', async () => {
            // Mock a method to throw an error
            const originalMethod = service._parseImageData;
            service._parseImageData = jest.fn().mockRejectedValue(new Error('Parse failed'));

            await expect(service.processImage('invalid-data'))
                .rejects.toThrow(ImageProcessingError);

            // Restore original method
            service._parseImageData = originalMethod;
        });
    });

    describe('Format Detection', () => {
        test('should detect JPEG from buffer', () => {
            const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
            const mimeType = service._detectMimeTypeFromBuffer(jpegBuffer);

            expect(mimeType).toBe('image/jpeg');
        });

        test('should detect PNG from buffer', () => {
            const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
            const mimeType = service._detectMimeTypeFromBuffer(pngBuffer);

            expect(mimeType).toBe('image/png');
        });

        test('should return default for unknown format', () => {
            const unknownBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
            const mimeType = service._detectMimeTypeFromBuffer(unknownBuffer);

            expect(mimeType).toBe('application/octet-stream');
        });
    });

    describe('Dimension Extraction', () => {
        test('should extract JPEG dimensions', () => {
            const jpegBuffer = Buffer.from([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
                0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
                0x00, 0x48, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11,
                0x08, 0x00, 0x64, 0x00, 0x64, 0x01, 0x01, 0x11,
                0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF,
                0xD9
            ]);

            const dimensions = service._getJpegDimensions(jpegBuffer);

            expect(dimensions.width).toBe(100);
            expect(dimensions.height).toBe(100);
        });

        test('should extract PNG dimensions', () => {
            const pngBuffer = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D,
                0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x01, 0x00, // Width: 256
                0x00, 0x00, 0x00, 0x80, // Height: 128
                0x08, 0x02, 0x00, 0x00, 0x00
            ]);

            const dimensions = service._getPngDimensions(pngBuffer);

            expect(dimensions.width).toBe(256);
            expect(dimensions.height).toBe(128);
        });

        test('should extract GIF dimensions', () => {
            const gifBuffer = Buffer.from([
                0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
                0x40, 0x01, // Width: 320 (little-endian)
                0xF0, 0x00, // Height: 240 (little-endian)
            ]);

            const dimensions = service._getGifDimensions(gifBuffer);

            expect(dimensions.width).toBe(320);
            expect(dimensions.height).toBe(240);
        });
    });

    describe('Base64 String Validation', () => {
        test('should validate correct base64 string', () => {
            const validBase64 = Buffer.from('test').toString('base64');
            const isValid = service._isBase64String(validBase64);

            expect(isValid).toBe(true);
        });

        test('should reject invalid base64 string', () => {
            const invalidBase64 = 'not-base64!@#';
            const isValid = service._isBase64String(invalidBase64);

            expect(isValid).toBe(false);
        });
    });
});