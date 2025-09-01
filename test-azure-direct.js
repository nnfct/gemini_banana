/**
 * Azure Computer Vision 직접 API 테스트
 */

import dotenv from 'dotenv';
dotenv.config();

// 테스트용 샘플 이미지 (1x1 검은색 픽셀)
const SAMPLE_IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function testAzureDirectly() {
    console.log('🔍 Azure Computer Vision 직접 API 테스트...\n');

    const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT;
    const apiKey = process.env.AZURE_COMPUTER_VISION_KEY;

    console.log('📋 설정 확인:');
    console.log(`  엔드포인트: ${endpoint ? '✅ 설정됨' : '❌ 없음'}`);
    console.log(`  API 키: ${apiKey ? '✅ 설정됨' : '❌ 없음'}\n`);

    if (!endpoint || !apiKey) {
        console.log('❌ Azure 설정이 없습니다.');
        return;
    }

    try {
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(SAMPLE_IMAGE, 'base64');

        // Azure Computer Vision analyze endpoint
        const cleanEndpoint = endpoint.replace(/\/$/, '');
        const analyzeUrl = `${cleanEndpoint}/vision/v3.2/analyze`;

        // Features to analyze
        const visualFeatures = [
            'Categories',
            'Tags',
            'Description',
            'Objects',
            'Color'
        ].join(',');

        console.log(`🌐 요청 URL: ${analyzeUrl}?visualFeatures=${visualFeatures}`);
        console.log('📤 이미지 크기:', imageBuffer.length, 'bytes\n');

        const response = await fetch(`${analyzeUrl}?visualFeatures=${visualFeatures}`, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey,
                'Content-Type': 'application/octet-stream'
            },
            body: imageBuffer
        });

        console.log(`📥 응답 상태: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Azure API 오류:');
            console.log(`  상태: ${response.status}`);
            console.log(`  메시지: ${errorText}`);
            return;
        }

        const result = await response.json();

        console.log('✅ Azure Computer Vision 분석 성공!\n');
        console.log('📊 분석 결과:');
        console.log(JSON.stringify(result, null, 2));

        // 결과 요약
        console.log('\n📋 결과 요약:');

        if (result.categories && result.categories.length > 0) {
            console.log('  카테고리:');
            result.categories.forEach(cat => {
                console.log(`    - ${cat.name} (신뢰도: ${(cat.score * 100).toFixed(1)}%)`);
            });
        }

        if (result.tags && result.tags.length > 0) {
            console.log('  태그:');
            result.tags.slice(0, 10).forEach(tag => {
                console.log(`    - ${tag.name} (신뢰도: ${(tag.confidence * 100).toFixed(1)}%)`);
            });
        }

        if (result.color) {
            console.log('  색상 정보:');
            if (result.color.dominantColors) {
                console.log(`    주요 색상: ${result.color.dominantColors.join(', ')}`);
            }
            if (result.color.dominantColorForeground) {
                console.log(`    전경 색상: ${result.color.dominantColorForeground}`);
            }
            if (result.color.dominantColorBackground) {
                console.log(`    배경 색상: ${result.color.dominantColorBackground}`);
            }
        }

        if (result.description && result.description.captions) {
            console.log('  설명:');
            result.description.captions.forEach(caption => {
                console.log(`    - ${caption.text} (신뢰도: ${(caption.confidence * 100).toFixed(1)}%)`);
            });
        }

    } catch (error) {
        console.log('❌ 테스트 실패:');
        console.log(`  오류: ${error.message}`);

        if (error.message.includes('ENOTFOUND')) {
            console.log('  💡 해결 방법: 엔드포인트 URL을 확인하세요.');
        } else if (error.message.includes('ECONNREFUSED')) {
            console.log('  💡 해결 방법: 인터넷 연결을 확인하세요.');
        }
    }
}

// 스크립트 실행
testAzureDirectly().catch(console.error);