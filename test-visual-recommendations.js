import { readFileSync } from 'fs';

/**
 * Test script for visual recommendations API
 * Tests the new /api/recommend-visual endpoint
 */

const API_BASE = 'http://localhost:3000';

// Sample base64 image (1x1 pixel black PNG for testing)
const SAMPLE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function testHealthCheck() {
    console.log('🏥 Testing health check...');

    try {
        const response = await fetch(`${API_BASE}/api/recommend-visual/health`);
        const result = await response.json();

        console.log('✅ Health check result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return null;
    }
}

async function testVisualRecommendations() {
    console.log('🖼️  Testing visual recommendations...');

    try {
        const payload = {
            image: SAMPLE_IMAGE,
            options: {
                provider: 'auto',
                maxResults: 5,
                minSimilarity: 0.1
            }
        };

        const response = await fetch(`${API_BASE}/api/recommend-visual`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ Visual recommendations successful!');
            console.log(`⚡ Processing time: ${result.processingTime}ms`);
            console.log(`🧠 Provider: ${result.provider}`);
            console.log('📊 Recommendations:');

            Object.entries(result.recommendations).forEach(([category, items]) => {
                console.log(`  ${category}: ${items.length} items`);
                items.forEach(item => {
                    console.log(`    - ${item.title} (similarity: ${item.similarity?.toFixed(2) || 'N/A'})`);
                });
            });

            if (result.metadata) {
                console.log('📋 Metadata:', JSON.stringify(result.metadata, null, 2));
            }
        } else {
            console.log('❌ Visual recommendations failed:', result.error);
        }

        return result;
    } catch (error) {
        console.error('❌ Visual recommendations test failed:', error.message);
        return null;
    }
}

async function testWithAzureConfig() {
    console.log('🔧 Testing with Azure configuration...');

    // Check if Azure is configured
    const hasAzureConfig = process.env.AZURE_COMPUTER_VISION_ENDPOINT && process.env.AZURE_COMPUTER_VISION_KEY;

    if (!hasAzureConfig) {
        console.log('⚠️  Azure not configured. Add the following to your .env file:');
        console.log('AZURE_COMPUTER_VISION_ENDPOINT=https://your-resource.cognitiveservices.azure.com/');
        console.log('AZURE_COMPUTER_VISION_KEY=your-azure-key');
        console.log('AZURE_OPENAI_DEPLOYMENT_ID=gpt-4-vision-preview');
        return;
    }

    try {
        const payload = {
            image: SAMPLE_IMAGE,
            options: {
                provider: 'azure',
                maxResults: 3
            }
        };

        const response = await fetch(`${API_BASE}/api/recommend-visual`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ Azure visual recommendations successful!');
            console.log(`⚡ Processing time: ${result.processingTime}ms`);
        } else {
            console.log('❌ Azure visual recommendations failed:', result.error);
        }

        return result;
    } catch (error) {
        console.error('❌ Azure test failed:', error.message);
        return null;
    }
}

async function runTests() {
    console.log('🚀 Starting visual recommendations tests...\n');

    // Test 1: Health check
    await testHealthCheck();
    console.log('');

    // Test 2: Basic visual recommendations (will use fallback)
    await testVisualRecommendations();
    console.log('');

    // Test 3: Azure-specific test (if configured)
    await testWithAzureConfig();
    console.log('');

    console.log('✅ All tests completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Configure Azure credentials in .env file');
    console.log('2. Test with real images');
    console.log('3. Integrate with frontend');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}

export { testHealthCheck, testVisualRecommendations, testWithAzureConfig };