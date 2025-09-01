import OpenAI from 'openai';

/**
 * Azure OpenAI Service for image analysis and recommendation generation
 * Provides standardized interface for Azure OpenAI API interactions
 */
class OpenAIService {
    constructor() {
        this.client = null;
        this.config = {
            endpoint: process.env.AZURE_OPENAI_ENDPOINT,
            apiKey: process.env.AZURE_OPENAI_KEY,
            deploymentId: process.env.AZURE_OPENAI_DEPLOYMENT_ID || 'gpt-4-vision-preview',
            apiVersion: '2024-02-15-preview',
            timeout: 30000,
            maxRetries: 3,
            temperature: 0.1,
            maxTokens: 500
        };
    }

    /**
     * Initialize OpenAI client lazily
     * @private
     */
    _initializeClient() {
        if (!this.client && this.isAvailable()) {
            this.client = new OpenAI({
                apiKey: this.config.apiKey,
                baseURL: `${this.config.endpoint}/openai/deployments/${this.config.deploymentId}`,
                defaultQuery: { 'api-version': this.config.apiVersion },
                defaultHeaders: {
                    'api-key': this.config.apiKey,
                },
            });
        }
        return this.client;
    }

    /**
     * Check if Azure OpenAI service is configured and available
     * @returns {boolean} True if service is available
     */
    isAvailable() {
        return !!(this.config.endpoint && this.config.apiKey);
    }

    /**
     * Analyze virtual try-on image and generate recommendations
     * @param {string} generatedImageBase64 - Base64 encoded generated image
     * @param {string} mimeType - Image MIME type
     * @param {Object} originalClothingItems - Original clothing items for context
     * @returns {Promise<Object>} Analysis result with clothing characteristics
     * @throws {Error} When API call fails or service is not available
     */
    async analyzeVirtualTryOnImage(generatedImageBase64, mimeType = 'image/jpeg', originalClothingItems = {}) {
        try {
            if (!this.isAvailable()) {
                throw new Error('Azure OpenAI service is not configured');
            }

            if (!generatedImageBase64) {
                throw new Error('Generated image data is required');
            }

            const client = this._initializeClient();
            if (!client) {
                throw new Error('Failed to initialize Azure OpenAI client');
            }

            console.log('Analyzing virtual try-on image with Azure OpenAI Vision...');

            const analysisPrompt = this._buildAnalysisPrompt();
            const response = await this._analyzeWithRetry(client, analysisPrompt, generatedImageBase64, mimeType);

            return this._parseAnalysisResponse(response);

        } catch (error) {
            console.error('Azure OpenAI service error:', error);
            throw new Error(`Image analysis failed: ${error.message}`);
        }
    }

    /**
     * Analyze uploaded images for style recommendations
     * @param {Object} person - Person image data
     * @param {Object} clothingItems - Clothing items data
     * @returns {Promise<Object>} Style analysis result
     * @throws {Error} When API call fails or service is not available
     */
    async analyzeStyleFromImages(person, clothingItems = {}) {
        try {
            if (!this.isAvailable()) {
                throw new Error('Azure OpenAI service is not configured');
            }

            if (!person && Object.keys(clothingItems).length === 0) {
                throw new Error('At least person image or clothing items are required');
            }

            const client = this._initializeClient();
            if (!client) {
                throw new Error('Failed to initialize Azure OpenAI client');
            }

            console.log('Analyzing style from uploaded images...');

            const stylePrompt = this._buildStyleAnalysisPrompt();
            const images = this._prepareImagesForAnalysis(person, clothingItems);

            const response = await this._analyzeStyleWithRetry(client, stylePrompt, images);

            return this._parseAnalysisResponse(response);

        } catch (error) {
            console.error('Azure OpenAI style analysis error:', error);
            throw new Error(`Style analysis failed: ${error.message}`);
        }
    }

    /**
     * Build analysis prompt for virtual try-on images
     * @private
     * @returns {string} Analysis prompt
     */
    _buildAnalysisPrompt() {
        return `
이 이미지는 사람이 옷을 입은 가상 피팅 결과입니다. 
이미지를 자세히 분석하여 착용하고 있는 의류의 특징을 파악해주세요.

다음 JSON 형태로만 응답해주세요 (다른 텍스트 없이):
{
    "top": ["색상", "스타일", "패턴", "핏"],
    "pants": ["색상", "스타일", "핏", "길이"],
    "shoes": ["색상", "스타일", "타입"],
    "overall_style": ["캐주얼/포멀", "시즌감", "연령대"]
}

예시:
{
    "top": ["black", "hoodie", "oversized", "casual"],
    "pants": ["blue", "jeans", "straight", "regular"],
    "shoes": ["white", "sneakers", "casual"],
    "overall_style": ["casual", "street", "young"]
}`;
    }

    /**
     * Build style analysis prompt for uploaded images
     * @private
     * @returns {string} Style analysis prompt
     */
    _buildStyleAnalysisPrompt() {
        return `
업로드된 이미지들을 분석하여 스타일 특징을 파악해주세요.
사람 이미지가 있다면 현재 착용한 옷의 스타일을, 의류 이미지가 있다면 해당 아이템의 특징을 분석해주세요.

다음 JSON 형태로만 응답해주세요:
{
    "detected_style": ["스타일 키워드들"],
    "colors": ["주요 색상들"],
    "categories": ["아이템 카테고리들"],
    "style_preference": ["추정되는 스타일 선호도"]
}

예시:
{
    "detected_style": ["casual", "street", "modern"],
    "colors": ["black", "white", "blue"],
    "categories": ["top", "pants"],
    "style_preference": ["casual", "comfortable", "trendy"]
}`;
    }

    /**
     * Prepare images for style analysis
     * @private
     * @param {Object} person - Person image data
     * @param {Object} clothingItems - Clothing items
     * @returns {Array} Array of image data for analysis
     */
    _prepareImagesForAnalysis(person, clothingItems) {
        const images = [];

        if (person) {
            images.push({
                type: 'image_url',
                image_url: {
                    url: `data:${person.mimeType};base64,${person.base64}`,
                    detail: 'high'
                }
            });
        }

        // Add clothing items
        Object.values(clothingItems).forEach(item => {
            if (item && item.base64) {
                images.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:${item.mimeType};base64,${item.base64}`,
                        detail: 'high'
                    }
                });
            }
        });

        return images;
    }

    /**
     * Analyze image with retry logic
     * @private
     * @param {Object} client - OpenAI client
     * @param {string} prompt - Analysis prompt
     * @param {string} imageBase64 - Base64 image data
     * @param {string} mimeType - Image MIME type
     * @returns {Promise<Object>} API response
     */
    async _analyzeWithRetry(client, prompt, imageBase64, mimeType) {
        let lastError;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await Promise.race([
                    client.chat.completions.create({
                        model: this.config.deploymentId,
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: prompt
                                    },
                                    {
                                        type: 'image_url',
                                        image_url: {
                                            url: `data:${mimeType};base64,${imageBase64}`,
                                            detail: 'high'
                                        }
                                    }
                                ]
                            }
                        ],
                        max_tokens: this.config.maxTokens,
                        temperature: this.config.temperature
                    }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Request timeout')), this.config.timeout)
                    )
                ]);

                return response;
            } catch (error) {
                lastError = error;
                console.warn(`Azure OpenAI attempt ${attempt} failed:`, error.message);

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
     * Analyze style with retry logic for multiple images
     * @private
     * @param {Object} client - OpenAI client
     * @param {string} prompt - Analysis prompt
     * @param {Array} images - Array of image data
     * @returns {Promise<Object>} API response
     */
    async _analyzeStyleWithRetry(client, prompt, images) {
        let lastError;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const content = [
                    {
                        type: 'text',
                        text: prompt
                    },
                    ...images
                ];

                const response = await Promise.race([
                    client.chat.completions.create({
                        model: this.config.deploymentId,
                        messages: [
                            {
                                role: 'user',
                                content: content
                            }
                        ],
                        max_tokens: this.config.maxTokens,
                        temperature: this.config.temperature
                    }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Request timeout')), this.config.timeout)
                    )
                ]);

                return response;
            } catch (error) {
                lastError = error;
                console.warn(`Azure OpenAI style analysis attempt ${attempt} failed:`, error.message);

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
     * Parse analysis response from Azure OpenAI
     * @private
     * @param {Object} response - API response
     * @returns {Object} Parsed analysis result
     * @throws {Error} When response parsing fails
     */
    _parseAnalysisResponse(response) {
        const analysisText = response.choices[0]?.message?.content;

        if (!analysisText) {
            throw new Error('No analysis content received from Azure OpenAI');
        }

        console.log('Azure OpenAI Analysis:', analysisText);

        try {
            // Extract JSON part (remove markdown formatting if present)
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : analysisText;
            const analysis = JSON.parse(jsonString);

            console.log('Parsed analysis:', analysis);
            return analysis;
        } catch (parseError) {
            console.error('Failed to parse Azure OpenAI response as JSON:', parseError);
            console.log('Raw response:', analysisText);
            throw new Error('Failed to parse analysis response');
        }
    }

    /**
     * Generate fallback analysis when Azure OpenAI is not available
     * @param {Object} originalClothingItems - Original clothing items for context
     * @returns {Object} Mock analysis result
     */
    generateFallbackAnalysis(originalClothingItems = {}) {
        console.log('Generating fallback analysis (Azure OpenAI not configured)');

        const fallbackAnalysis = {
            top: ["casual", "comfortable", "basic"],
            pants: ["casual", "everyday", "comfortable"],
            shoes: ["casual", "comfortable", "everyday"],
            overall_style: ["casual", "relaxed", "everyday"]
        };

        // Customize based on original items if available
        if (originalClothingItems.top) {
            fallbackAnalysis.top = ["top", "shirt", "casual"];
        }
        if (originalClothingItems.pants) {
            fallbackAnalysis.pants = ["pants", "bottom", "casual"];
        }
        if (originalClothingItems.shoes) {
            fallbackAnalysis.shoes = ["shoes", "footwear", "casual"];
        }

        return fallbackAnalysis;
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
            deploymentId: this.config.deploymentId,
            apiVersion: this.config.apiVersion,
            timeout: this.config.timeout,
            maxRetries: this.config.maxRetries,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
            isConfigured: this.isAvailable()
        };
    }
}

// Export singleton instance
const openaiService = new OpenAIService();
export default openaiService;

// Export class for testing
export { OpenAIService };