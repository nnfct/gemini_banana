// 백엔드 서버 연결 테스트
const testBackendConnection = async () => {
    try {
        console.log('🔍 백엔드 서버 연결 테스트 시작...');

        // Health check 테스트
        const healthResponse = await fetch('http://localhost:5000/health');
        if (healthResponse.ok) {
            console.log('✅ Health check 성공');
        } else {
            console.log('❌ Health check 실패:', healthResponse.status);
        }

        // API 정보 테스트
        const apiResponse = await fetch('http://localhost:5000/api');
        if (apiResponse.ok) {
            const apiData = await apiResponse.json();
            console.log('✅ API 정보 조회 성공:', apiData);
        } else {
            console.log('❌ API 정보 조회 실패:', apiResponse.status);
        }

        // 추천 API 테스트 (간단한 요청)
        const recommendResponse = await fetch('http://localhost:5000/api/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                person: null,
                clothingItems: {
                    top: null,
                    pants: null,
                    shoes: null
                }
            })
        });

        if (recommendResponse.ok) {
            const recommendData = await recommendResponse.json();
            console.log('✅ 추천 API 테스트 성공:', recommendData);
        } else {
            console.log('❌ 추천 API 테스트 실패:', recommendResponse.status);
        }

    } catch (error) {
        console.error('❌ 연결 테스트 중 오류:', error.message);
    }
};

// Node.js 환경에서 fetch 사용을 위한 설정
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

testBackendConnection();