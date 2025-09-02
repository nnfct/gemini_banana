import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const catalog = JSON.parse(readFileSync(join(__dirname, '../data/catalog.json'), 'utf8'));

// Azure Computer Vision 클라이언트 설정
let computerVisionClient = null;
if (process.env.AZURE_COMPUTER_VISION_ENDPOINT && process.env.AZURE_COMPUTER_VISION_KEY) {
    const credentials = new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_COMPUTER_VISION_KEY } });
    computerVisionClient = new ComputerVisionClient(credentials, process.env.AZURE_COMPUTER_VISION_ENDPOINT);
}

/**
 * 가상 피팅 완료 후 합성된 이미지를 분석하여 유사한 상품을 추천합니다.
 * @param {string} generatedImageBase64 - 가상 피팅으로 생성된 이미지 (base64)
 * @param {string} mimeType - 이미지 MIME 타입
 * @param {object} originalClothingItems - 원본 의류 아이템들 (참고용)
 * @returns {Promise<object>} - 추천 상품 목록
 */
export const recommendFromVirtualTryOn = async (generatedImageBase64, mimeType = 'image/jpeg', originalClothingItems = {}) => {
    // Azure Computer Vision이 설정되어 있지 않은 경우 mock 추천 반환
    if (!computerVisionClient) {
        console.log('Azure Computer Vision not configured, using mock recommendations');
        return getMockRecommendations(originalClothingItems);
    }

    try {
        console.log('Analyzing virtual try-on image with Azure Computer Vision...');

        // Base64를 Buffer로 변환
        const imageBuffer = Buffer.from(generatedImageBase64, 'base64');

        // Computer Vision API로 이미지 분석 (태그와 캡션 추출)
        const analysisResult = await computerVisionClient.analyzeImageInStream(imageBuffer, {
            visualFeatures: ['Tags', 'Description']
        });

        // 태그와 캡션 추출
        const tags = analysisResult.tags ? analysisResult.tags.map(tag => tag.name) : [];
        const captions = analysisResult.description ? analysisResult.description.captions.map(cap => cap.text) : [];

        console.log('Computer Vision Tags:', tags);
        console.log('Computer Vision Captions:', captions);

        // 분석 결과를 구조화
        const analysis = {
            tags: tags,
            captions: captions,
            overall_style: [] // 추가 분석 필요 시 확장
        };

        console.log('Parsed analysis:', analysis);
        return findSimilarProducts(analysis);

    } catch (error) {
        console.error('Error analyzing virtual try-on image with Azure Computer Vision:', error);
        // 오류 발생 시 mock 추천 반환
        return getMockRecommendations(originalClothingItems);
    }
};

/**
 * 분석된 키워드를 기반으로 카탈로그에서 유사한 상품을 찾습니다.
 */
function findSimilarProducts(analysis) {
    const allKeywords = [
        ...(analysis.tags || []),
        ...(analysis.captions || [])
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
            // 정확한 매칭
            if (itemText.includes(keyword.toLowerCase())) {
                score += 1;
            }
            // 부분 매칭 (예: "blue shirt"에서 "blue"만 매칭)
            else if (keyword.split(' ').some(word => itemText.includes(word.toLowerCase()))) {
                score += 0.5;
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
