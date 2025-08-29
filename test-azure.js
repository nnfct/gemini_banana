import OpenAI from 'openai';
import 'dotenv/config';

// Azure OpenAI 연결 테스트 스크립트
async function testAzureOpenAI() {
    console.log('🔍 Azure OpenAI 설정 확인 중...');
    
    // 환경 변수 확인
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_ID;

    console.log('환경 변수 확인:');
    console.log('- AZURE_OPENAI_ENDPOINT:', endpoint ? '✅ 설정됨' : '❌ 누락');
    console.log('- AZURE_OPENAI_KEY:', apiKey ? '✅ 설정됨' : '❌ 누락');
    console.log('- AZURE_OPENAI_DEPLOYMENT_ID:', deployment ? '✅ 설정됨' : '❌ 누락');

    if (!endpoint || !apiKey || !deployment) {
        console.log('\n❌ Azure OpenAI 환경 변수가 설정되지 않았습니다.');
        console.log('   .env 파일에 올바른 값을 설정해주세요.');
        return false;
    }

    try {
        const client = new OpenAI({
            apiKey: apiKey,
            baseURL: `${endpoint}/openai/deployments/${deployment}`,
            defaultQuery: { 'api-version': '2024-02-15-preview' },
            defaultHeaders: {
                'api-key': apiKey,
            },
        });

        console.log('\n🔗 Azure OpenAI 연결 테스트 중...');

        const response = await client.chat.completions.create({
            model: deployment,
            messages: [
                {
                    role: 'user',
                    content: 'Hello, this is a test message. Please respond with "Azure OpenAI connection successful!"'
                }
            ],
            max_tokens: 50
        });

        console.log('✅ Azure OpenAI 연결 성공!');
        console.log('응답:', response.choices[0]?.message?.content);
        return true;

    } catch (error) {
        console.log('❌ Azure OpenAI 연결 실패:');
        console.error(error.message);
        
        if (error.status === 401) {
            console.log('💡 API 키가 잘못되었을 수 있습니다.');
        } else if (error.status === 404) {
            console.log('💡 Endpoint URL이나 Deployment ID가 잘못되었을 수 있습니다.');
        }
        
        return false;
    }
}

// 가상 피팅 이미지 분석 테스트 (샘플 이미지 사용)
async function testVisionAnalysis() {
    console.log('\n🖼️  Vision API 테스트 중...');
    
    // 간단한 테스트 이미지 (1x1 픽셀 PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA/L5DVAAAAASUVORK5CYII=';
    
    try {
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_KEY;
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_ID;

        const client = new OpenAI({
            apiKey: apiKey,
            baseURL: `${endpoint}/openai/deployments/${deployment}`,
            defaultQuery: { 'api-version': '2024-02-15-preview' },
            defaultHeaders: {
                'api-key': apiKey,
            },
        });

        const response = await client.chat.completions.create({
            model: deployment,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'This is a test image. Can you see it? Just respond with "Yes, I can see the image" if vision is working.'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/png;base64,${testImageBase64}`,
                                detail: 'low'
                            }
                        }
                    ]
                }
            ],
            max_tokens: 50
        });

        console.log('✅ Vision API 테스트 성공!');
        console.log('응답:', response.choices[0]?.message?.content);
        return true;

    } catch (error) {
        console.log('❌ Vision API 테스트 실패:');
        console.error(error.message);
        
        if (error.message.includes('vision')) {
            console.log('💡 Vision 기능이 지원되지 않는 모델일 수 있습니다.');
            console.log('   gpt-4-vision-preview 또는 gpt-4o 모델을 사용해주세요.');
        }
        
        return false;
    }
}

// 메인 테스트 실행
async function main() {
    console.log('🚀 Azure OpenAI 연동 테스트 시작\n');
    
    const basicTest = await testAzureOpenAI();
    
    if (basicTest) {
        await testVisionAnalysis();
    }
    
    console.log('\n📋 다음 단계:');
    console.log('1. Azure OpenAI 리소스에서 gpt-4-vision-preview 모델을 배포하세요');
    console.log('2. .env 파일에 올바른 Endpoint, Key, Deployment ID를 설정하세요');
    console.log('3. npm run test-azure 명령으로 연결을 확인하세요');
    console.log('4. npm run server로 서버를 시작하세요');
}

main().catch(console.error);
