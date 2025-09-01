import { GoogleGenAI, Modality } from "@google/genai";

/**
 * Gemini AI Service for virtual try-on image generation
 * Provides standardized interface for Gemini API interactions
 */
class GeminiService {
    constructor() {
        this.client = null;
        this.config = {
            model: 'gemini-2.5-flash-image-preview',
            apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY,
            timeout: 30000,
            maxRetries: 3
        };
    }

    /**
     * Initialize Gemini client lazily
     * @private
     */
    _initializeClient() {
        if (!this.client && this.config.apiKey) {
            this.client = new GoogleGenAI({ apiKey: this.config.apiKey });
        }
        return this.client;
    }

    /**
     * Check if Gemini service is configured and available
     * @returns {boolean} True if service is available
     */
    isAvailable() {
        return !!this.config.apiKey;
    }

    /**
     * Generate virtual try-on image using Gemini AI
     * @param {Object} person - Person image data with base64 and mimeType
     * @param {Object} clothingItems - Clothing items with optional top, pants, shoes
     * @returns {Promise<string|null>} Base64 data URI of generated image or null
     * @throws {Error} When API call fails or configuration is invalid
     */
    async generateVirtualTryOnImage(person, clothingItems = {}) {
        try {
            // Validate inputs
            if (!person || !person.base64 || !person.mimeType) {
                throw new Error('Person image data is required with base64 and mimeType');
            }

            // Check if service is available
            if (!this.isAvailable()) {
                throw new Error('Gemini API key is not configured');
            }

            // Initialize client
            const client = this._initializeClient();
            if (!client) {
                throw new Error('Failed to initialize Gemini client');
            }

            // Build request parts
            const parts = this._buildRequestParts(person, clothingItems);

            // Generate content with retry logic
            const response = await this._generateWithRetry(client, parts);

            // Extract image from response
            return this._extractImageFromResponse(response);

        } catch (error) {
            console.error("Gemini service error:", error);
            throw new Error(`Virtual try-on generation failed: ${error.message}`);
        }
    }

    /**
     * Build request parts for Gemini API
     * @private
     * @param {Object} person - Person image data
     * @param {Object} clothingItems - Clothing items
     * @returns {Array} Array of request parts
     */
    _buildRequestParts(person, clothingItems) {
        const parts = [
            {
                inlineData: {
                    data: person.base64,
                    mimeType: person.mimeType,
                },
            },
        ];

        const clothingPieces = [];

        // Add clothing items to parts
        if (clothingItems.top) {
            parts.push({
                inlineData: {
                    data: clothingItems.top.base64,
                    mimeType: clothingItems.top.mimeType
                }
            });
            clothingPieces.push('the top');
        }

        if (clothingItems.pants) {
            parts.push({
                inlineData: {
                    data: clothingItems.pants.base64,
                    mimeType: clothingItems.pants.mimeType
                }
            });
            clothingPieces.push('the pants');
        }

        if (clothingItems.shoes) {
            parts.push({
                inlineData: {
                    data: clothingItems.shoes.base64,
                    mimeType: clothingItems.shoes.mimeType
                }
            });
            clothingPieces.push('the shoes');
        }

        // Add prompt text
        const promptText = this._buildPrompt(clothingPieces);
        parts.push({ text: promptText });

        return parts;
    }

    /**
     * Build prompt text for virtual try-on
     * @private
     * @param {Array} clothingPieces - Array of clothing piece names
     * @returns {string} Formatted prompt text
     */
    _buildPrompt(clothingPieces) {
        if (clothingPieces.length === 0) {
            throw new Error('At least one clothing item is required');
        }

        return `Analyze the first image, which contains a person (assume it's a full-body shot). Your primary task is to realistically place the clothing items from the subsequent images onto this person. It is of the utmost importance to preserve the original person's identity with no alterations. This means the facial features, face shape, hair, body shape, and pose must remain identical to the original photo. Do not change the person in any way. The final output must be a photorealistic image of the exact same person wearing: ${clothingPieces.join(', ')}. Ensure the clothing fits naturally, and the lighting and shadows are consistent with the original photo. Do not include any text or annotations in the final image.`;
    }

    /**
     * Generate content with retry logic
     * @private
     * @param {Object} client - Gemini client
     * @param {Array} parts - Request parts
     * @returns {Promise<Object>} API response
     */
    async _generateWithRetry(client, parts) {
        let lastError;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await Promise.race([
                    client.models.generateContent({
                        model: this.config.model,
                        contents: { parts },
                        config: {
                            responseModalities: [Modality.IMAGE, Modality.TEXT],
                        },
                    }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Request timeout')), this.config.timeout)
                    )
                ]);

                return response;
            } catch (error) {
                lastError = error;
                console.warn(`Gemini API attempt ${attempt} failed:`, error.message);

                if (attempt < this.config.maxRetries) {
                    // Exponential backoff
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    /**
     * Extract image data from Gemini response
     * @private
     * @param {Object} response - Gemini API response
     * @returns {string|null} Base64 data URI or null
     */
    _extractImageFromResponse(response) {
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData?.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    }

    /**
     * Update service configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        // Reset client to force reinitialization with new config
        this.client = null;
    }

    /**
     * Get current service configuration (excluding sensitive data)
     * @returns {Object} Current configuration
     */
    getConfig() {
        return {
            model: this.config.model,
            timeout: this.config.timeout,
            maxRetries: this.config.maxRetries,
            isConfigured: this.isAvailable()
        };
    }
}

// Export singleton instance
const geminiService = new GeminiService();
export default geminiService;

// Export class for testing
export { GeminiService };