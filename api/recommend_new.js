import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const catalog = JSON.parse(readFileSync(join(__dirname, '../data/catalog.json'), 'utf8'));

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
