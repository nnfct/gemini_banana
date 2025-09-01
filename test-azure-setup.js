/**
 * Azure 설정 테스트 스크립트
 * Azure OpenAI 연결을 테스트하고 설정을 검증합니다.
 */

import dotenv from 'dotenv';
import { azureVisionService } from './backend/src/services/azureVisionService.js';

// 환경 변수 로드
dotenv.config();

// 테스트용 샘플 이미지 (1x1 검은색 픽셀)
const SAMPLE_IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function checkAzureConfiguration() {
    console.log('🔧 Azure 설정 확인 중...\n');

    const config = {
        endpoint: process.env.AZURE_COMPUTER_VISION_ENDPOINT,
        apiKey: process.env.AZURE_COMPUTER_VISION_KEY,
        deploymentId: process.env.AZURE_OPENAI_DEPLOYMENT_ID
    };

    console.log('📋 현재 설정:');
    console.log(`  엔드포인트: ${config.endpoint ? '✅ 설정됨' : '❌ 없음'}`);
    console.log(`  API 키: ${config.apiKey ? '✅ 설정됨' : '❌ 없음'}`);
    console.log(`  배포 ID: ${config.deploymentId ? '✅ 설정됨' : '❌ 없음'}\n`);

    if (!config.endpoint || !config.apiKey) {
        console.log('❌ Azure 설정이 완료되지 않았습니다.');
        console.log('\n📝 설정 방법:');
        console.log('1. .env 파일에 다음 내용을 추가하세요:');
        console.log('   AZURE_COMPUTER_VISION_ENDPOINT=https://your-resource.openai.azure.com/');
        console.log('   AZURE_COMPUTER_VISION_KEY=your-api-key');
        console.log('   AZURE_OPENAI_DEPLOYMENT_ID=gpt-4-vision');
        console.log('\n2. docs/azure-setup-guide.md 파일을 참고하세요.');
        return false;
    }

    return true;
}

async function testAzureConnection() {
    console.log('🔗 Azure 연결 테스트 중...\n');

    try {
        if (!azureVisionService.isAvailable()) {
            console.log('❌ Azure Vision Service를 사용할 수 없습니다.');
            return false;
        }

        console.log('✅ Azure Vision Service 사용 가능');

        // 간단한 이미지 분석 테스트
        console.log('🖼️  샘플 이미지 분석 중...');
        const startTime = Date.now();

        const result = await azureVisionService.analyzeImage(SAMPLE_IMAGE, {
            mimeType: 'image/png'
        });

        const processingTime = Date.now() - startTime;

        console.log(`✅ 분석 완료! (${processingTime}ms)`);
        console.log('📊 분석 결과:');
        console.log(`  제공자: ${result.provider}`);
        console.log(`  성공: ${result.success}`);

        if (result.analysis) {
            console.log('  감지된 항목:');
            if (result.analysis.clothing_items) {
                result.analysis.clothing_items.forEach((item, index) => {
                    console.log(`    ${index + 1}. ${item.type} (${item.category}) - 신뢰도: ${item.confidence}`);
                });
            }

            if (result.analysis.dominant_colors) {
                console.log(`  주요 색상: ${result.analysis.dominant_colors.join(', ')}`);
            }

            if (result.analysis.overall_style) {
                console.log(`  전체 스타일: ${result.analysis.overall_style}`);
            }
        }

        return true;

    } catch (error) {
        console.log('❌ Azure 연결 테스트 실패:');
        console.log(`  오류: ${error.message}`);

        if (error.message.includes('401')) {
            console.log('  💡 해결 방법: API 키를 확인하세요.');
        } else if (error.message.includes('403')) {
            console.log('  💡 해결 방법: 구독 상태와 할당량을 확인하세요.');
        } else if (error.message.includes('404')) {
            console.log('  💡 해결 방법: 엔드포인트 URL과 배포 ID를 확인하세요.');
        }

        return false;
    }
}

async function testVisualRecommendationWithAzure() {
    console.log('\n🎯 Azure를 사용한 시각적 추천 테스트...\n');

    try {
        const payload = {
            image: `data:image/png;base64,${SAMPLE_IMAGE}`,
            options: {
                provider: 'azure',
                maxResults: 3,
                minSimilarity: 0.1
            }
        };

        const response = await fetch('http://localhost:3000/api/recommend-visual', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ Azure 시각적 추천 성공!');
            console.log(`⚡ 처리 시간: ${result.processingTime}ms`);
            console.log(`🧠 사용된 제공자: ${result.provider}`);

            console.log('\n📊 추천 결과:');
            Object.entries(result.recommendations).forEach(([category, items]) => {
                if (items.length > 0) {
                    console.log(`  ${category.toUpperCase()}:`);
                    items.forEach((item, index) => {
                        console.log(`    ${index + 1}. ${item.title}`);
                        console.log(`       가격: ${item.price.toLocaleString()}원`);
                        console.log(`       유사도: ${(item.similarity * 100).toFixed(1)}%`);
                        if (item.matchReasons && item.matchReasons.length > 0) {
                            console.log(`       매칭 이유: ${item.matchReasons.join(', ')}`);
                        }
                    });
                }
            });

            if (result.metadata) {
                console.log('\n📋 메타데이터:');
                console.log(`  감지된 카테고리: ${result.metadata.detectedCategories?.join(', ') || '없음'}`);
                console.log(`  주요 색상: ${result.metadata.dominantColors?.join(', ') || '없음'}`);
                console.log(`  총 발견 항목: ${result.metadata.totalFound || 0}개`);
            }

        } else {
            console.log('❌ Azure 시각적 추천 실패:');
            console.log(`  오류: ${result.error?.message || '알 수 없는 오류'}`);
        }

    } catch (error) {
        console.log('❌ 추천 API 테스트 실패:');
        console.log(`  오류: ${error.message}`);
        console.log('  💡 백엔드 서버가 실행 중인지 확인하세요 (npm run dev:backend)');
    }
}

async function runAzureTests() {
    console.log('🚀 Azure 설정 및 연결 테스트 시작\n');
    console.log('='.repeat(50));

    // 1. 설정 확인
    const configOk = await checkAzureConfiguration();
    if (!configOk) {
        return;
    }

    console.log('='.repeat(50));

    // 2. Azure 연결 테스트
    const connectionOk = await testAzureConnection();

    console.log('='.repeat(50));

    // 3. 시각적 추천 API 테스트 (백엔드가 실행 중인 경우)
    await testVisualRecommendationWithAzure();

    console.log('='.repeat(50));
    console.log('\n🎉 테스트 완료!');

    if (connectionOk) {
        console.log('\n✅ Azure 설정이 올바르게 구성되었습니다.');
        console.log('🔄 이제 실제 의류 이미지로 테스트해보세요!');
    } else {
        console.log('\n❌ Azure 설정에 문제가 있습니다.');
        console.log('📖 docs/azure-setup-guide.md를 참고하여 설정을 완료하세요.');
    }
}

// 스크립트 직접 실행 시 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
    runAzureTests().catch(console.error);
}

export { checkAzureConfiguration, testAzureConnection, testVisualRecommendationWithAzure };