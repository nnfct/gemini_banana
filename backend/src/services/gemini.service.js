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
        // Helper to convert base64 -> bytes for @google/genai (expects Uint8Array)
        const toBytes = (b64) => {
            try { return Buffer.from(b64, 'base64'); } catch { return Buffer.alloc(0); }
        };

        const parts = [
            // Global safety/consistency directives
            { text: this._buildSafetyDirectives() },
            {
                inlineData: {
                    data: toBytes(person.base64),
                    mimeType: person.mimeType,
                },
            },
        ];

        const clothingPieces = [];

        // Add clothing items to parts
        if (clothingItems.top) {
            parts.push({
                inlineData: {
                    data: toBytes(clothingItems.top.base64),
                    mimeType: clothingItems.top.mimeType
                }
            });
            clothingPieces.push('the top');
        }

        if (clothingItems.pants) {
            parts.push({
                inlineData: {
                    data: toBytes(clothingItems.pants.base64),
                    mimeType: clothingItems.pants.mimeType
                }
            });
            clothingPieces.push('the pants');
        }

        if (clothingItems.shoes) {
            parts.push({
                inlineData: {
                    data: toBytes(clothingItems.shoes.base64),
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
     * Safety + consistency directives to ensure the person's face/body is never altered
     * and to keep background and lighting consistent. Applied to every request.
     * @private
     */
    _buildSafetyDirectives() {
        return [
            'IMPORTANT SAFETY AND CONSISTENCY DIRECTIVES:',
            '- Use the FIRST image as the immutable base/background.',
            "- Do NOT re-synthesize, redraw, or retouch the person.",
            "- Do NOT alter the person's face, hair, facial expression, skin texture, body shape, or pose.",
            '- Preserve the exact facial identity (no beautification, smoothing, makeup or landmark changes).',
            '- Keep background, perspective, and lighting IDENTICAL to the original person image.',
            '- REPLACE existing garments with the provided clothing: top replaces top layer, pants replace pants, shoes replace shoes.',
            '- Remove/ignore backgrounds from clothing product photos; segment garment only (no mannequin or logos).',
            '- Fit garments to the person\'s pose with correct scale/rotation/warping; align perspective and seams.',
            '- Respect occlusion: body parts (e.g., crossed arms/hands) naturally occlude garments when in front.',
            '- Ensure the ENTIRE PERSON is visible; garments cover appropriate regions (top on torso/arms, pants on legs to ankles, shoes on feet).',
            '- Do NOT add or remove accessories or objects. No text, logos, or watermarks.',
            "- Treat the face region as pixel-locked: identity-specific details MUST remain unchanged.",
            "- If any instruction conflicts, ALWAYS preserve the person\'s identity over clothing fit.",
        ].join('\n');
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

        return `Use the FIRST image as the base. Remove backgrounds from the clothing product photos and extract only the garments. REPLACE the existing garments with the provided items: top -> torso/arms, pants -> legs to ankles, shoes -> feet. Output a single photorealistic image of the SAME person wearing: ${clothingPieces.join(', ')}. Fit garments to the person\'s pose with correct scale/rotation/warping; match perspective and seam alignment. Handle occlusion correctly (e.g., crossed arms remain in front of the top where appropriate). Keep lighting/shadows consistent. Preserve the face and body shape exactly. No text, logos, or watermarks.`;
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
                        // Pass a single user message with parts (required by @google/genai)
                        contents: [{ role: 'user', parts }],
                        // Strong global instruction to preserve identity
                        systemInstruction: {
                            role: 'system',
                            parts: [{ text: this._buildSafetyDirectives() }],
                        },
                        // Prefer image output and reduce randomness
                        config: { responseModalities: [Modality.IMAGE] },
                        generationConfig: { temperature: 0.0 },
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
