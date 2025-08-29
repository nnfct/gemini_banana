import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const catalog = JSON.parse(readFileSync(join(__dirname, '../data/catalog.json'), 'utf8'));

// Azure OpenAI 클라이언트 설정
let openaiClient = null;
if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_KEY) {
    openaiClient = new OpenAI({
        apiKey: process.env.AZURE_OPENAI_KEY,
        baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_ID}`,
        defaultQuery: { 'api-version': '2024-02-15-preview' },
        defaultHeaders: {
            'api-key': process.env.AZURE_OPENAI_KEY,
        },
    });
}

/**
 * 가상 피팅 완료 후 합성된 이미지를 분석하여 유사한 상품을 추천합니다.
 * @param {string} generatedImageBase64 - 가상 피팅으로 생성된 이미지 (base64)
 * @param {string} mimeType - 이미지 MIME 타입
 * @param {object} originalClothingItems - 원본 의류 아이템들 (참고용)
 * @returns {Promise<object>} - 추천 상품 목록
 */
export const recommendFromVirtualTryOn = async (generatedImageBase64, mimeType = 'image/jpeg', originalClothingItems = {}) => {
    // Azure OpenAI가 설정되어 있지 않은 경우 mock 추천 반환
    if (!openaiClient) {
        console.log('Azure OpenAI not configured, using mock recommendations');
        return getMockRecommendations(originalClothingItems);
    }

    try {
        console.log('Analyzing virtual try-on image with Azure OpenAI Vision...');
        
        // Azure OpenAI Vision API를 사용하여 실제 이미지 분석
        const analysisPrompt = `
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
}
`;

        const response = await openaiClient.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT_ID || 'gpt-4-vision-preview',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: analysisPrompt
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${mimeType};base64,${generatedImageBase64}`,
                                detail: 'high'
                            }
                        }
                    ]
                }
            ],
            max_tokens: 500,
            temperature: 0.1
        });

        const analysisText = response.choices[0]?.message?.content;
        console.log('Azure OpenAI Analysis:', analysisText);

        // JSON 파싱 시도
        let analysis;
        try {
            // JSON 부분만 추출 (```json이나 다른 마크다운 제거)
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : analysisText;
            analysis = JSON.parse(jsonString);
        } catch (parseError) {
            console.error('Failed to parse Azure OpenAI response as JSON:', parseError);
            console.log('Raw response:', analysisText);
            // 파싱 실패 시 mock 사용
            return getMockRecommendations(originalClothingItems);
        }

        console.log('Parsed analysis:', analysis);
        return findSimilarProducts(analysis);

    } catch (error) {
        console.error('Error analyzing virtual try-on image with Azure OpenAI:', error);
        // 오류 발생 시 mock 추천 반환
        return getMockRecommendations(originalClothingItems);
    }
};

/**
 * 분석된 키워드를 기반으로 카탈로그에서 유사한 상품을 찾습니다.
 */
function findSimilarProducts(analysis) {
    const allKeywords = [
        ...(analysis.top || []),
        ...(analysis.pants || []),
        ...(analysis.shoes || []),
        ...(analysis.overall_style || [])
    ];

    const recommendations = {
        top: [],
        pants: [],
        shoes: [],
        accessories: []
    };

    // 카테고리별로 유사한 상품 검색
    catalog.forEach(item => {
        const itemText = `${item.title.toLowerCase()} ${item.tags.join(' ')}`;
        let score = 0;

        allKeywords.forEach(keyword => {
            if (itemText.includes(keyword.toLowerCase())) {
                score++;
            }
        });

        if (score > 0) {
            const itemWithScore = { ...item, score };
            
            // 카테고리별 분류 (tags 기반)
            if (item.tags.some(tag => ['shirt', 'top', 'hoodie', 't-shirt'].includes(tag.toLowerCase()))) {
                recommendations.top.push(itemWithScore);
            } else if (item.tags.some(tag => ['pants', 'jeans', 'slacks'].includes(tag.toLowerCase()))) {
                recommendations.pants.push(itemWithScore);
            } else if (item.tags.some(tag => ['shoes', 'sneakers'].includes(tag.toLowerCase()))) {
                recommendations.shoes.push(itemWithScore);
            } else {
                recommendations.accessories.push(itemWithScore);
            }
        }
    });

    // 각 카테고리별로 상위 3개씩 정렬
    Object.keys(recommendations).forEach(category => {
        recommendations[category] = recommendations[category]
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    });

    return { recommendations };
}

/**
 * Azure OpenAI가 없을 때 사용하는 Mock 추천
 */
function getMockRecommendations(originalClothingItems) {
    const mockRecs = {
        top: catalog.filter(item => item.tags.includes('hoodie') || item.tags.includes('shirt')).slice(0, 3),
        pants: catalog.filter(item => item.tags.includes('jeans') || item.tags.includes('slacks')).slice(0, 3),
        shoes: catalog.filter(item => item.tags.includes('shoes')).slice(0, 2),
        accessories: []
    };

    return { recommendations: mockRecs };
}

/**
 * Simple mock implementation for MVP - extracts basic keywords and matches against catalog
 * In a real implementation, this would use Azure OpenAI for more sophisticated analysis
 * @param {object} person - The person image data.
 * @param {object} clothingItems - The clothing items image data.
 * @returns {Promise<object>} - A promise that resolves to an object containing recommendations.
 */
export const recommendSimilarItems = async (person, clothingItems = {}) => {
    // For MVP, we'll do simple mock recommendations based on available items
    // In a real implementation, this would analyze the images using Azure OpenAI
    
    let mockKeywords = [];
    let itemType = 'clothing';

    if (clothingItems.top) {
        mockKeywords = ['top', 'shirt', 'hoodie', 'casual'];
        itemType = 'top';
    } else if (clothingItems.pants) {
        mockKeywords = ['pants', 'jeans', 'bottom'];
        itemType = 'pants';
    } else if (person) {
        mockKeywords = ['casual', 'basic', 'simple'];
        itemType = "person's style";
    }

    if (mockKeywords.length === 0) {
        return { recommendations: [] };
    }

    // Simple keyword matching against the catalog
    const scoredItems = catalog.map(item => {
        const itemText = `${item.title.toLowerCase()} ${item.tags.join(' ')}`;
        let score = 0;
        mockKeywords.forEach(keyword => {
            if (itemText.includes(keyword.toLowerCase())) {
                score++;
            }
        });
        return { ...item, score };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Return top 5 recommendations

    return { recommendations: scoredItems };
};
