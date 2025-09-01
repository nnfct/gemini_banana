// API 연결 디버깅 스크립트
const testApiEndpoints = async () => {
    const baseUrl = 'http://localhost:5000';

    console.log('🔍 API 엔드포인트 테스트 시작...\n');

    // 1. Health check
    try {
        const healthResponse = await fetch(`${baseUrl}/health`);
        console.log('1. Health Check:');
        console.log(`   Status: ${healthResponse.status}`);
        if (healthResponse.ok) {
            const data = await healthResponse.json();
            console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
        }
    } catch (error) {
        console.log('1. Health Check: ❌ FAILED');
        console.log(`   Error: ${error.message}`);
    }

    console.log('\n');

    // 2. Generate endpoint 테스트 (빈 요청)
    try {
        const generateResponse = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });
        console.log('2. Generate Endpoint (empty request):');
        console.log(`   Status: ${generateResponse.status}`);
        const data = await generateResponse.json();
        console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
        console.log('2. Generate Endpoint: ❌ FAILED');
        console.log(`   Error: ${error.message}`);
    }

    console.log('\n');

    // 3. Generate service status
    try {
        const statusResponse = await fetch(`${baseUrl}/api/generate/status`);
        console.log('3. Generate Service Status:');
        console.log(`   Status: ${statusResponse.status}`);
        if (statusResponse.ok) {
            const data = await statusResponse.json();
            console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
        }
    } catch (error) {
        console.log('3. Generate Service Status: ❌ FAILED');
        console.log(`   Error: ${error.message}`);
    }
};

// Node.js 환경에서 fetch 사용을 위한 설정
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

testApiEndpoints();