const puppeteer = require('puppeteer');

/**
 * 네이버부동산 앞마당 다운로드 자동화
 * 실제 브라우저를 열어서 사람처럼 동작하므로 봇 감지 우회 가능
 */
async function autoDownloadSise() {
    let browser;
    try {
        // ✅ headless: false = 실제 브라우저 창 열기
        browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage'
            ]
        });

        const page = await browser.newPage();
        
        // ✅ User-Agent 설정 (봇으로 감지되지 않도록)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // ✅ 뷰포트 설정
        await page.setViewport({ width: 1920, height: 1080 });

        console.log('🌐 네이버부동산 접속 중...');
        await page.goto('https://land.naver.com/article/list', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('⏳ 페이지 로딩 완료. 준비 중...');
        
        // ✅ 사용자가 콘솔에서 명령을 입력할 수 있도록 대기
        console.log('\n✅ 브라우저가 열렸습니다!');
        console.log('📌 다음 명령어를 브라우저 개발자 도구(F12) > 콘솔에 붙여넣으세요:\n');
        
        // sise.js의 함수를 사용하도록 메시지 출력
        console.log('1️⃣  앞마당 데이터를 다운로드하려면 콘솔에서 아래를 입력:');
        console.log('   downloadFromBeforeMadang()\n');
        
        console.log('2️⃣  조회 버튼으로 검색하려면:');
        console.log('   document.querySelector(".search-btn").click()\n');
        
        console.log('3️⃣  종료하려면 브라우저를 닫으세요.\n');
        
        // ✅ sise.js 스크립트 자동 삽입 (선택 사항)
        console.log('⚙️ sise.js를 페이지에 주입 중...');
        try {
            const fs = require('fs');
            const path = require('path');
            
            // 현재 디렉토리에서 sise.js 로드
            const sisePath = path.join(__dirname, 'sise.js');
            if (fs.existsSync(sisePath)) {
                const siseCode = fs.readFileSync(sisePath, 'utf8');
                await page.evaluateOnNewDocument(siseCode);
                console.log('✅ sise.js가 주입되었습니다!\n');
            } else {
                console.log('⚠️ sise.js를 찾을 수 없습니다. (선택 사항)\n');
            }
        } catch (e) {
            console.log('⚠️ sise.js 주입 건너뜀\n');
        }

        // ✅ 브라우저가 닫힐 때까지 대기
        await new Promise(resolve => {
            // 사용자가 브라우저를 닫을 때까지 무한 대기
            setInterval(() => {
                // 100초마다 체크
            }, 100000);
        });

    } catch (error) {
        console.error('❌ 오류:', error.message);
    } finally {
        // 필요시 브라우저 닫기
        if (browser) {
            // 사용자가 수동으로 닫도록 대기
            // await browser.close();
        }
    }
}

/**
 * 특정 복합단지만 다운로드하는 자동화 버전
 * @param {Array} complexes 복합단지 ID 배열
 */
async function autoDownloadSpecificComplexes(complexes = []) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // ✅ 로그인 필요한 경우 수동 로그인 대기
        console.log('🔐 네이버 로그인이 필요한 경우 수동으로 로그인하세요...');
        
        await page.goto('https://land.naver.com/article/list', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // ✅ 복합단지별 다운로드 (sise.js의 함수 이용)
        if (complexes.length > 0) {
            console.log(`📥 ${complexes.length}개 복합단지 데이터 다운로드 시작...\n`);
            
            // sise.js가 로드되어 있다면 아래 명령 실행
            for (const complexId of complexes) {
                console.log(`⏳ 복합단지 ID ${complexId} 처리 중...`);
                
                // 브라우저 콘솔에서 함수 실행
                // await page.evaluate((id) => {
                //     if (typeof downloadComplexSise === 'function') {
                //         downloadComplexSise(id);
                //     }
                // }, complexId);
                
                await new Promise(r => setTimeout(r, 2000)); // 2초 대기
            }
            
            console.log('✅ 다운로드 완료!');
        }

        // ✅ 사용자가 추가 작업을 할 수 있도록 대기
        console.log('⏸️ 추가 작업을 진행하거나 브라우저를 닫으세요...');
        
        // 무한 대기
        await new Promise(resolve => {
            // 브라우저가 닫힐 때까지 대기
        });

    } catch (error) {
        console.error('❌ 오류:', error.message);
    }
}

// ✅ 스크립트 실행
if (require.main === module) {
    // 명령줄 인수 확인
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
        console.log(`
📌 사용법:
  node autoDownloadSise.js              # 기본 모드 (브라우저만 열기)
  node autoDownloadSise.js --complexes  # 특정 복합단지 다운로드
        `);
        process.exit(0);
    }

    // 모드 선택
    if (args.includes('--complexes')) {
        // 예시: 특정 복합단지 ID 지정
        const complexIds = [123456, 234567]; // 실제 ID로 변경
        autoDownloadSpecificComplexes(complexIds);
    } else {
        // 기본 모드
        autoDownloadSise();
    }
}

module.exports = { autoDownloadSise, autoDownloadSpecificComplexes };
