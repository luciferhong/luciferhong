/**
 * 네이버부동산 콘솔에서 실행할 수 있는 가격 조회 스크립트
 * 사용법: 
 * 1. 네이버부동산 페이지(https://new.land.naver.com/complexes)에 접속
 * 2. F12로 개발자도구 열기
 * 3. 콘솔(Console) 탭에서 아래 함수들 실행
 */

// ========== UI 생성 ==========

// 페이지에 버튼 추가
(function() {
    try {
        const aptPopupBtn = document.createElement('button');
        aptPopupBtn.id = 'apt-price-popup-btn';
        aptPopupBtn.innerText = '🏢 가격조회';
        aptPopupBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background-color: #00ac42;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            z-index: 9999;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        `;
        
        aptPopupBtn.onmouseover = () => aptPopupBtn.style.backgroundColor = '#009a37';
        aptPopupBtn.onmouseout = () => aptPopupBtn.style.backgroundColor = '#00ac42';
        
        aptPopupBtn.onclick = () => showPricePopup();
        
        document.body.appendChild(aptPopupBtn);
        console.log('✓ 가격조회 UI 버튼 추가됨');
    } catch (e) {
        console.error('버튼 추가 실패:', e);
    }
})();

// ========== 기본 함수들 ==========

// 토큰 가져오기
async function fetchToken() {
    const tokenUrl = "https://new.land.naver.com/complexes";
    const response = await fetch(tokenUrl, {
        method: 'GET'
    });
    const text = await response.text();
    const tokenStartIndex = text.indexOf('token') + 17;
    const tokenEndIndex = text.indexOf('"', tokenStartIndex);
    const token = text.substring(tokenStartIndex, tokenEndIndex);
    return `Bearer ${token}`;
}

// 아파트 목록 가져오기
async function fetchArticles(token, page, complexId) {
    const url = `https://new.land.naver.com/api/articles/complex/${parseInt(complexId, 10)}?realEstateType=APT%3APRE%3AABYG%3AJGC&tradeType=A1%3AB1&tag=%3A%3A%3A%3A%3A%3A%3A%3A&rentPriceMin=0&rentPriceMax=900000000&priceMin=0&priceMax=900000000&areaMin=0&areaMax=900000000&oldBuildYears&recentlyBuildYears&minHouseHoldCount&maxHouseHoldCount&showArticle=false&sameAddressGroup=true&minMaintenanceCost&maxMaintenanceCost&priceType=RETAIL&directions=&page=${page}&complexNo=${parseInt(complexId, 10)}&buildingNos=&areaNos=&type=list&order=prc`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'authorization': token,
            'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'referrerPolicy': 'unsafe-url'
        }
    });
    const data = await response.json();
    return data;
}

// 가격 파싱 (억 단위를 만원으로 변환)
function parsePrice(priceStr) {
    let priceInManWon = 0;
    const priceParts = priceStr.split('억');

    if (priceParts.length > 1) {
        const billionPart = parseInt(priceParts[0].replace(/,/g, ''), 10) * 10000;
        const millionPart = priceParts[1] ? parseInt(priceParts[1].replace(/,/g, ''), 10) : 0;
        priceInManWon = billionPart + millionPart;
    } else {
        priceInManWon = parseInt(priceParts[0].replace(/,/g, ''), 10);
    }

    return priceInManWon;
}

// 가격 포맷팅 (만원을 억 단위로 변환)
function formatPrice(priceInManWon) {
    const billionPart = Math.floor(priceInManWon / 10000);
    const millionPart = priceInManWon % 10000;

    // 소수점 두 자리를 계산하되 반올림 없이 처리
    let formattedMillionPart = (millionPart / 10000).toFixed(4).slice(0, 4);

    // 필요 없는 소수점 0 제거
    formattedMillionPart = formattedMillionPart.replace(/\.?0+$/, '');

    let formattedPrice = `${billionPart}${formattedMillionPart !== '0' ? '.' + formattedMillionPart.split('.')[1] : ''}억`;
    if (formattedPrice === "0억") { formattedPrice = '' }
    return formattedPrice;
}

// 가격 포맷팅 (만원 단위로 표시)
function formatPriceAsManWon(priceInManWon) {
    if (priceInManWon === undefined || priceInManWon === null || priceInManWon === 0) {
        return '-';
    }
    return priceInManWon.toString();
}

// 단지 상세 정보 가져오기
async function fetchComplexDetails(complexId) {
    const token = await fetchToken();
    const url = `https://new.land.naver.com/api/complexes/${complexId}?complexNo=${complexId}&initial=Y`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'accept': '*/*',
            'authorization': token,
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'referrerPolicy': 'unsafe-url'
        },
        mode: 'cors',
        credentials: 'include'
    });

    const data = await response.json();
    if (data && data.complex) {
        return {
            name: data.complex.complexName,
            useApproveYmd: data.complex.useApproveYmd,
            totalHouseholdCount: data.complex.totalHouseholdCount
        };
    }
    return null;
}

// ========== 주요 함수 ==========

/**
 * 특정 단지의 가격 정보를 콘솔에 출력
 * @param {number} complexId - 단지 ID (예: 847, 374, 587 등)
 * @param {number} areaMinThreshold - 면적 최소값 (기본값: 0)
 * @param {number} areaMaxThreshold - 면적 최대값 (기본값: 9999)
 * @example
 * await getPriceInfoByConsole(847);
 * await getPriceInfoByConsole(374, 70, 120);
 */
async function getPriceInfoByConsole(complexId, areaMinThreshold = 0, areaMaxThreshold = 9999) {
    console.log(`\n========== 단지 ID ${complexId} 가격 조회 시작 ==========\n`);
    
    try {
        const token = await fetchToken();
        console.log('✓ 토큰 획득 완료');

        let page = 1;
        let isMoreData = true;
        let allData = [];

        // 모든 페이지의 데이터 수집
        while (isMoreData) {
            const data = await fetchArticles(token, page, complexId);

            if (data.articleList && Array.isArray(data.articleList)) {
                allData = allData.concat(data.articleList);
                console.log(`✓ 페이지 ${page}: ${data.articleList.length}개 항목 조회`);
            }

            isMoreData = data.isMoreData;
            page++;

            // 과도한 요청 방지
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`\n총 ${allData.length}개 항목 조회 완료\n`);

        // 면적별로 최저 가격 정리
        const priceByArea = {};

        allData.forEach(article => {
            const area1 = parseInt(article.area1, 10);

            // 면적 범위 필터링
            if (area1 < areaMinThreshold || area1 > areaMaxThreshold) {
                return;
            }

            const area2 = article.area2;
            const areaName = `${area2}㎡`;
            const priceInManWon = parsePrice(article.dealOrWarrantPrc);
            const tradeType = article.tradeTypeName; // "매매" 또는 "전세"
            const floorInfo = article.floorInfo;

            if (!priceByArea[areaName]) {
                priceByArea[areaName] = {
                    area2: area2,
                    sale: [], // 매매 정보
                    rent: []  // 전세 정보
                };
            }

            const priceInfo = {
                price: priceInManWon,
                displayPrice: formatPrice(priceInManWon),
                floor: floorInfo
            };

            if (tradeType === '매매') {
                priceByArea[areaName].sale.push(priceInfo);
            } else if (tradeType === '전세') {
                priceByArea[areaName].rent.push(priceInfo);
            }
        });

        // 정렬하여 출력
        const sortedAreas = Object.keys(priceByArea).sort((a, b) => {
            return parseFloat(a) - parseFloat(b);
        });

        console.log('========== 면적별 가격 정보 ==========\n');
        
        sortedAreas.forEach(areaName => {
            const data = priceByArea[areaName];
            console.log(`[${areaName}] (${data.area2}㎡)`);

            if (data.sale.length > 0) {
                data.sale.sort((a, b) => a.price - b.price);
                console.log(`  📍 매매 최저가: ${data.sale[0].displayPrice} (${data.sale[0].floor}층) - ${data.sale.length}건`);
            } else {
                console.log(`  📍 매매: 없음`);
            }

            if (data.rent.length > 0) {
                data.rent.sort((a, b) => a.price - b.price);
                console.log(`  📍 전세 최저가: ${data.rent[0].displayPrice} (${data.rent[0].floor}층) - ${data.rent.length}건`);
            } else {
                console.log(`  📍 전세: 없음`);
            }

            console.log('');
        });

        console.log('========== 조회 완료 ==========\n');
        return priceByArea;

    } catch (error) {
        console.error('❌ 오류 발생:', error);
    }
}

/**
 * 여러 단지의 가격을 한번에 조회
 * @param {array} complexIds - 단지 ID 배열
 * @example
 * await getPriceInfoMultiple([847, 374, 587]);
 */
async function getPriceInfoMultiple(complexIds) {
    const results = {};
    for (const id of complexIds) {
        results[id] = await getPriceInfoByConsole(id);
        // 요청 사이에 대기
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return results;
}

/**
 * 테이블 형식으로 가격 정보 출력
 * 컬럼: 아파트명 | 입주시기 | 세대수 | 면적 | 매매가 | 전세가 | 물건수
 * @param {number} complexId - 단지 ID
 * @param {number} areaMinThreshold - 면적 최소값 (기본값: 0)
 * @param {number} areaMaxThreshold - 면적 최대값 (기본값: 9999)
 * @example
 * await getPriceTableFormat(847);
 * await getPriceTableFormat(374, 80, 120);
 */
async function getPriceTableFormat(complexId, areaMinThreshold = 0, areaMaxThreshold = 9999) {
    console.log(`\n========== 단지 ID ${complexId} 테이블 조회 시작 ==========\n`);
    
    try {
        // 1. 단지 상세 정보 가져오기
        const complexDetails = await fetchComplexDetails(complexId);
        if (!complexDetails) {
            console.log('❌ 단지 정보를 찾을 수 없습니다.');
            return;
        }

        const token = await fetchToken();
        let page = 1;
        let isMoreData = true;
        let allData = [];

        // 2. 모든 페이지의 데이터 수집
        while (isMoreData) {
            const data = await fetchArticles(token, page, complexId);

            if (data.articleList && Array.isArray(data.articleList)) {
                allData = allData.concat(data.articleList);
            }

            isMoreData = data.isMoreData;
            page++;
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 3. 면적별로 정리
        const priceByArea = {};

        allData.forEach(article => {
            const area1 = parseInt(article.area1, 10);

            if (area1 < areaMinThreshold || area1 > areaMaxThreshold) {
                return;
            }

            const area2 = article.area2;
            const priceInManWon = parsePrice(article.dealOrWarrantPrc);
            const tradeType = article.tradeTypeName;
            const floorInfo = article.floorInfo;

            if (!priceByArea[area2]) {
                priceByArea[area2] = {
                    area2: area2,
                    sale: { prices: [] },
                    rent: { prices: [] },
                    saleCnt: 0,
                    rentCnt: 0
                };
            }

            if (tradeType === '매매') {
                priceByArea[area2].sale.prices.push(priceInManWon);
                priceByArea[area2].saleCnt++;
            } else if (tradeType === '전세') {
                priceByArea[area2].rent.prices.push(priceInManWon);
                priceByArea[area2].rentCnt++;
            }
        });

        // 4. 최저가 계산
        Object.keys(priceByArea).forEach(area2 => {
            const data = priceByArea[area2];
            if (data.sale.prices.length > 0) {
                data.sale.min = Math.min(...data.sale.prices);
            }
            if (data.rent.prices.length > 0) {
                data.rent.min = Math.min(...data.rent.prices);
            }
        });

        // 5. 테이블 헤더
        console.log('┌─────────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
        console.log('│   아파트명  │  입주시기 │  세대수  │   면적   │  매매가  │  전세가  │매매물건수│전세물건수│');
        console.log('├─────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');

        // 6. 데이터 행
        const sortedAreas = Object.keys(priceByArea).sort((a, b) => parseFloat(a) - parseFloat(b));
        let isFirstRow = true;

        sortedAreas.forEach(area2 => {
            const data = priceByArea[area2];
            
            const aptName = isFirstRow ? complexDetails.name : '';
            const moveDate = isFirstRow ? `${complexDetails.useApproveYmd.slice(0, 2)}.${complexDetails.useApproveYmd.slice(2, 4)}` : '';
            const household = isFirstRow ? complexDetails.totalHouseholdCount : '';
            const salePrice = data.sale.min ? formatPriceAsManWon(data.sale.min) : '-';
            const rentPrice = data.rent.min ? formatPriceAsManWon(data.rent.min) : '-';
            const saleCnt = data.saleCnt.toString();
            const rentCnt = data.rentCnt.toString();

            const aptNameStr = aptName.substring(0, 11).padEnd(11, ' ');
            const moveDateStr = moveDate.toString().padEnd(8, ' ');
            const householdStr = household.toString().padStart(6, ' ').padEnd(8, ' ');
            const areaStr = area2.toString().padStart(4, ' ').padEnd(8, ' ');
            const salePriceStr = salePrice.padStart(6, ' ').padEnd(8, ' ');
            const rentPriceStr = rentPrice.padStart(6, ' ').padEnd(8, ' ');
            const saleCntStr = saleCnt.padStart(6, ' ').padEnd(8, ' ');
            const rentCntStr = rentCnt.padStart(6, ' ').padEnd(8, ' ');

            console.log(`│ ${aptNameStr} │ ${moveDateStr} │ ${householdStr} │ ${areaStr} │ ${salePriceStr} │ ${rentPriceStr} │ ${saleCntStr} │ ${rentCntStr} │`);

            isFirstRow = false;
        });

        console.log('└─────────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘');
        console.log(`\n✓ 조회 완료: 총 ${sortedAreas.length}개 면적\n`);

        return priceByArea;

    } catch (error) {
        console.error('❌ 오류 발생:', error);
    }
}

/**
 * xlsx 라이브러리 동적 로드 (여러 CDN 지원)
 */
async function loadSheetJS() {
    // 이미 로드되어 있는지 확인
    if (window.XLSX) {
        return window.XLSX;
    }

    const cdnUrls = [
        'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
        'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js'
    ];

    for (const url of cdnUrls) {
        try {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.timeout = 5000;
                
                const timeout = setTimeout(() => {
                    reject(new Error(`CDN 로드 타임아웃: ${url}`));
                }, 5000);

                script.onload = () => {
                    clearTimeout(timeout);
                    resolve(window.XLSX);
                };

                script.onerror = () => {
                    clearTimeout(timeout);
                    document.head.removeChild(script);
                    reject(new Error(`CDN 로드 실패: ${url}`));
                };

                document.head.appendChild(script);
            });

            console.log(`✓ XLSX 라이브러리 로드 완료: ${url}`);
            return window.XLSX;

        } catch (error) {
            console.log(`⚠ ${url} 실패, 다음 CDN 시도...`);
            continue;
        }
    }

    throw new Error('모든 CDN에서 XLSX 라이브러리 로드 실패');
}

/**
 * 가격 정보를 엑셀로 다운로드
 * @param {number} complexId - 단지 ID
 * @param {number} areaMinThreshold - 면적 최소값 (기본값: 0)
 * @param {number} areaMaxThreshold - 면적 최대값 (기본값: 9999)
 * @example
 * await getPriceExcel(847);
 * await getPriceExcel(374, 80, 120);
 */
async function getPriceExcel(complexId, areaMinThreshold = 0, areaMaxThreshold = 9999) {
    console.log(`\n========== 단지 ID ${complexId} 엑셀 다운로드 시작 ==========\n`);
    
    try {
        // 1. xlsx 라이브러리 로드
        console.log('✓ xlsx 라이브러리 로드 중...');
        const XLSX = await loadSheetJS();

        // 2. 단지 상세 정보 가져오기
        const complexDetails = await fetchComplexDetails(complexId);
        if (!complexDetails) {
            console.log('❌ 단지 정보를 찾을 수 없습니다.');
            return;
        }

        const token = await fetchToken();
        let page = 1;
        let isMoreData = true;
        let allData = [];

        // 3. 모든 페이지의 데이터 수집
        while (isMoreData) {
            const data = await fetchArticles(token, page, complexId);

            if (data.articleList && Array.isArray(data.articleList)) {
                allData = allData.concat(data.articleList);
            }

            isMoreData = data.isMoreData;
            page++;
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 4. 면적별로 정리
        const priceByArea = {};

        allData.forEach(article => {
            const area1 = parseInt(article.area1, 10);

            if (area1 < areaMinThreshold || area1 > areaMaxThreshold) {
                return;
            }

            const area2 = article.area2;
            const priceInManWon = parsePrice(article.dealOrWarrantPrc);
            const tradeType = article.tradeTypeName;

            if (!priceByArea[area2]) {
                priceByArea[area2] = {
                    area2: area2,
                    sale: { prices: [] },
                    rent: { prices: [] },
                    saleCnt: 0,
                    rentCnt: 0
                };
            }

            if (tradeType === '매매') {
                priceByArea[area2].sale.prices.push(priceInManWon);
                priceByArea[area2].saleCnt++;
            } else if (tradeType === '전세') {
                priceByArea[area2].rent.prices.push(priceInManWon);
                priceByArea[area2].rentCnt++;
            }
        });

        // 5. 최저가 계산
        Object.keys(priceByArea).forEach(area2 => {
            const data = priceByArea[area2];
            if (data.sale.prices.length > 0) {
                data.sale.min = Math.min(...data.sale.prices);
            }
            if (data.rent.prices.length > 0) {
                data.rent.min = Math.min(...data.rent.prices);
            }
        });

        // 6. 엑셀 데이터 구성
        const sortedAreas = Object.keys(priceByArea).sort((a, b) => parseFloat(a) - parseFloat(b));
        const excelData = [];

        // 헤더 행
        excelData.push([
            '아파트명',
            '입주시기',
            '세대수',
            '면적',
            '매매가',
            '전세가',
            '매매물건수',
            '전세물건수'
        ]);

        // 데이터 행
        let isFirstRow = true;
        sortedAreas.forEach(area2 => {
            const data = priceByArea[area2];
            
            const aptName = isFirstRow ? complexDetails.name : '';
            const moveDate = isFirstRow ? `${complexDetails.useApproveYmd.slice(0, 2)}.${complexDetails.useApproveYmd.slice(2, 4)}` : '';
            const household = isFirstRow ? complexDetails.totalHouseholdCount : '';
            const salePrice = data.sale.min ? formatPriceAsManWon(data.sale.min) : '-';
            const rentPrice = data.rent.min ? formatPriceAsManWon(data.rent.min) : '-';
            const saleCnt = data.saleCnt;
            const rentCnt = data.rentCnt;

            excelData.push([
                aptName,
                moveDate,
                household,
                area2,
                salePrice,
                rentPrice,
                saleCnt,
                rentCnt
            ]);

            isFirstRow = false;
        });

        // 7. 워크북 생성
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        
        // 컬럼 너비 설정
        ws['!cols'] = [
            { wch: 15 },  // 아파트명
            { wch: 12 },  // 입주시기
            { wch: 12 },  // 세대수
            { wch: 10 },  // 면적
            { wch: 12 },  // 매매가
            { wch: 12 },  // 전세가
            { wch: 12 },  // 매매물건수
            { wch: 12 }   // 전세물건수
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '가격정보');

        // 8. 파일 다운로드
        const fileName = `${complexDetails.name}_${new Date().getTime()}.xlsx`;
        XLSX.writeFile(wb, fileName);

        console.log(`✓ 엑셀 파일 다운로드 완료: ${fileName}`);
        console.log(`✓ 총 ${sortedAreas.length}개 면적이 저장되었습니다.\n`);

        return excelData;

    } catch (error) {
        console.error('❌ 오류 발생:', error);
    }
}

// ========== 사용 예제 ==========
/*

// 단일 단지 조회 (상세 목록)
await getPriceInfoByConsole(847);

// 특정 면적 범위로 조회 (80~120㎡)
await getPriceInfoByConsole(374, 80, 120);

// 테이블 형식으로 조회
await getPriceTableFormat(847);

// 테이블 형식 + 면적 범위
await getPriceTableFormat(374, 80, 120);

// 엑셀로 다운로드
await getPriceExcel(847);

// 엑셀 + 면적 범위
await getPriceExcel(374, 80, 120);

// 여러 단지 한번에 조회
await getPriceInfoMultiple([847, 374, 587, 472]);

// 지역으로 단지 검색 후 각 단지의 면적별 가격 정보 조회
await getComplexesByRegion();

*/

/**
 * 지역별 단지 검색 후 각 단지의 면적별 가격 정보 조회
 * @example
 * await getComplexesByRegion();
 */
async function getComplexesByRegion() {
    console.log('\n========== 지역별 단지 검색 시작 ==========\n');

    // 지역 입력받기 (서울시 강남구 개포동 형식)
    const regionInput = prompt(
        '지역을 입력하세요 (예: 강남구/개포동, 강서구/가양동):\n' +
        '또는 단일 동만 입력 가능 (예: 개포동)'
    );

    if (!regionInput) {
        console.log('❌ 지역 선택이 취소되었습니다.');
        return;
    }

    try {
        const token = await fetchToken();
        console.log('✓ 토큰 획득 완료\n');

        // 지역 정보 파싱
        const parts = regionInput.split('/').map(p => p.trim());
        const emdName = parts[parts.length - 1]; // 마지막이 읍면동
        
        // 네이버 지역 코드에서 동명으로 검색
        // 실제로는 지역 코드 맵이 필요하지만, 여기서는 API로 직접 검색
        console.log(`${emdName} 지역의 단지를 검색 중...\n`);

        // cortarNo를 모를 경우, 먼저 지역 검색 API가 필요합니다.
        // 여기서는 사용자가 단지 ID를 직접 입력하도록 유도합니다.
        const complexIdInput = prompt(
            '단지 ID를 입력하세요 (쉼표로 구분 가능):\n' +
            '예: 847,374,587'
        );

        if (!complexIdInput) {
            console.log('❌ 단지 ID 입력이 취소되었습니다.');
            return;
        }

        const complexIds = complexIdInput
            .split(',')
            .map(id => parseInt(id.trim(), 10))
            .filter(id => !isNaN(id));

        if (complexIds.length === 0) {
            console.log('❌ 유효한 단지 ID가 없습니다.');
            return;
        }

        console.log(`선택된 단지: ${complexIds.join(', ')}\n`);

        // 각 단지의 세부 정보와 가격 정보 수집
        const allComplexData = [];

        for (const complexId of complexIds) {
            console.log(`\n========== 단지 ${complexId} 정보 수집 중 ==========`);

            const complexDetails = await fetchComplexDetails(complexId);
            if (!complexDetails) {
                console.log(`❌ 단지 ${complexId} 정보를 찾을 수 없습니다.`);
                continue;
            }

            console.log(`단지명: ${complexDetails.name}`);
            console.log(`입주시기: ${complexDetails.useApproveYmd.slice(0, 4)}.${complexDetails.useApproveYmd.slice(4, 6)}`);
            console.log(`전체 세대수: ${complexDetails.totalHouseholdCount}세대`);

            // 각 면적별 가격 정보
            let page = 1;
            let isMoreData = true;
            let allData = [];

            while (isMoreData) {
                const data = await fetchArticles(token, page, complexId);

                if (data.articleList && Array.isArray(data.articleList)) {
                    allData = allData.concat(data.articleList);
                }

                isMoreData = data.isMoreData;
                page++;
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const priceByArea = {};

            allData.forEach(article => {
                const area2 = article.area2;
                const priceInManWon = parsePrice(article.dealOrWarrantPrc);
                const tradeType = article.tradeTypeName;

                if (!priceByArea[area2]) {
                    priceByArea[area2] = {
                        area2: area2,
                        sale: { prices: [] },
                        rent: { prices: [] },
                        saleCnt: 0,
                        rentCnt: 0
                    };
                }

                if (tradeType === '매매') {
                    priceByArea[area2].sale.prices.push(priceInManWon);
                    priceByArea[area2].saleCnt++;
                } else if (tradeType === '전세') {
                    priceByArea[area2].rent.prices.push(priceInManWon);
                    priceByArea[area2].rentCnt++;
                }
            });

            // 최저가 계산
            Object.keys(priceByArea).forEach(area2 => {
                const data = priceByArea[area2];
                if (data.sale.prices.length > 0) {
                    data.sale.min = Math.min(...data.sale.prices);
                }
                if (data.rent.prices.length > 0) {
                    data.rent.min = Math.min(...data.rent.prices);
                }
            });

            // 결과 저장
            const sortedAreas = Object.keys(priceByArea).sort((a, b) => parseFloat(a) - parseFloat(b));
            
            sortedAreas.forEach(area2 => {
                const data = priceByArea[area2];
                allComplexData.push({
                    단지명: complexDetails.name,
                    입주시기: `${complexDetails.useApproveYmd.slice(0, 4)}.${complexDetails.useApproveYmd.slice(4, 6)}`,
                    전체세대수: complexDetails.totalHouseholdCount,
                    면적: area2,
                    매매가: data.sale.min ? formatPriceAsManWon(data.sale.min) : '-',
                    전세가: data.rent.min ? formatPriceAsManWon(data.rent.min) : '-',
                    매매물건수: data.saleCnt,
                    전세물건수: data.rentCnt
                });
            });

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // 최종 결과 출력
        console.log('\n\n========== 최종 결과 ==========\n');
        console.table(allComplexData);

        // 엑셀로 저장할지 묻기
        const saveExcel = confirm('엑셀로 저장하시겠습니까?');
        if (saveExcel) {
            await saveComplexDataToExcel(allComplexData);
        }

        return allComplexData;

    } catch (error) {
        console.error('❌ 오류 발생:', error);
    }
}

/**
 * 지역 정보 파싱 (시도, 시군구, 동)
 */
function parseRegionTSV(tsv) {
    const lines = tsv.trim().split(/\r?\n/);
    const out = [];
    const hasHeader = /시도.?코드/.test(lines[0]);
    for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
        const cols = lines[i].split(/\t/);
        if (cols.length < 6) continue;
        const [sidoCode, sidoName, sigunguCode, sigunguName, cortarNo, dongName] = cols.map((s) => s.trim());
        if (!sidoCode || !sigunguCode || !cortarNo) continue;
        out.push({ sidoCode, sidoName, sigunguCode, sigunguName, cortarNo, dongName });
    }
    return out;
}

function uniqueBy(arr, keyFn) {
    const m = new Map();
    for (const x of arr) {
        const k = keyFn(x);
        if (!m.has(k)) m.set(k, x);
    }
    return [...m.values()];
}

/**
 * UI 팝업으로 가격 조회 (네부단지추출 스타일)
 */
async function showPricePopup() {
    // 스타일 추가
    const style = document.createElement("style");
    style.textContent = `
        .apt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 999999; }
        .apt-modal { background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.2); width: min(750px, 90vw); max-height: 90vh; display: flex; flex-direction: column; }
        .apt-hd { padding: 14px 18px; border-bottom: 1px solid #eee; font-weight: 700; font-size: 16px; }
        .apt-bd { padding: 16px; overflow: auto; flex: 1; }
        .apt-ft { padding: 12px 16px; border-top: 1px solid #eee; display: flex; gap: 8px; justify-content: flex-end; }
        .apt-row { display: flex; gap: 8px; align-items: center; margin: 10px 0; }
        .apt-row label { width: 100px; color: #333; font-weight: 600; }
        .apt-row select { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
        .apt-btn { padding: 8px 16px; border: 1px solid #ccc; border-radius: 4px; background: #fafafa; cursor: pointer; font-weight: 600; }
        .apt-btn.primary { background: #00ac42; color: #fff; border-color: #00ac42; }
        .apt-btn.primary:hover { background: #009a37; }
        .apt-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .apt-log { display: block; box-sizing: border-box; width: 100%; height: 120px; padding: 10px 12px; background: #0b1020; color: #cde3ff; border: 1px solid #1f2a40; border-radius: 4px; font-family: monospace; font-size: 12px; white-space: pre-wrap; overflow-y: auto; margin-top: 10px; }
        .apt-info { padding: 8px; background: #f0f0f0; border-radius: 4px; margin: 10px 0; font-size: 13px; }
        .apt-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
        .apt-table th { border: 1px solid #ddd; padding: 8px; background: #f5f5f5; font-weight: bold; text-align: center; }
        .apt-table td { border: 1px solid #ddd; padding: 6px; text-align: center; }
    `;
    document.head.appendChild(style);

    // 배경 및 모달 생성
    const overlay = document.createElement("div");
    overlay.className = "apt-overlay";
    const modal = document.createElement("div");
    modal.className = "apt-modal";
    
    const hd = document.createElement("div");
    hd.className = "apt-hd";
    hd.textContent = "🏢 아파트 가격 조회 (지역별)";
    
    const bd = document.createElement("div");
    bd.className = "apt-bd";
    
    const ft = document.createElement("div");
    ft.className = "apt-ft";
    
    modal.append(hd, bd, ft);
    overlay.appendChild(modal);

    // 시도 선택
    const rowSido = document.createElement("div");
    rowSido.className = "apt-row";
    rowSido.innerHTML = `<label>시도</label><select id="apt-sido" disabled><option value="">데이터 로딩 중…</option></select>`;

    // 시군구 선택
    const rowSigungu = document.createElement("div");
    rowSigungu.className = "apt-row";
    rowSigungu.innerHTML = `<label>시군구</label><select id="apt-sigungu" disabled><option value="">시도를 선택하세요</option></select>`;

    // 동 선택
    const rowDong = document.createElement("div");
    rowDong.className = "apt-row";
    rowDong.innerHTML = `<label>읍면동</label><select id="apt-dong" disabled><option value="">시군구를 선택하세요</option></select>`;

    // 단지 목록
    const rowComplex = document.createElement("div");
    rowComplex.className = "apt-row";
    rowComplex.innerHTML = `<label>단지</label><select id="apt-complex" disabled multiple style="height: 100px;"><option value="">동을 선택하세요</option></select>`;

    // 진행 정보
    const rowInfo = document.createElement("div");
    rowInfo.className = "apt-info";
    rowInfo.innerHTML = `<div id="apt-info">준비 중...</div>`;

    // 로그
    const logArea = document.createElement("div");
    logArea.id = "apt-log";
    logArea.className = "apt-log";

    bd.append(rowSido, rowSigungu, rowDong, rowComplex, rowInfo, logArea);

    // 버튼
    const btnStart = document.createElement("button");
    btnStart.className = "apt-btn primary";
    btnStart.textContent = "조회";
    btnStart.disabled = true;

    const btnExcel = document.createElement("button");
    btnExcel.className = "apt-btn";
    btnExcel.textContent = "📊 엑셀저장";
    btnExcel.disabled = true;

    const btnClose = document.createElement("button");
    btnClose.className = "apt-btn";
    btnClose.textContent = "닫기";

    ft.append(btnStart, btnExcel, btnClose);
    document.body.appendChild(overlay);

    // Helper functions
    function log(msg) {
        const el = document.getElementById("apt-log");
        el.textContent += (el.textContent ? "\n" : "") + msg;
        el.scrollTop = el.scrollHeight;
    }

    function setInfo(text) {
        document.getElementById("apt-info").textContent = text;
    }

    // 데이터 저장
    let entries = [];
    let selectedSidoCode = null;
    let selectedSigunguCode = null;
    let selectedCortarNo = null;
    let collectedData = [];

    function uniqueSidos() {
        return uniqueBy(entries, (e) => e.sidoCode)
            .map((e) => ({ code: e.sidoCode, name: e.sidoName }))
            .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    }

    function uniqueSigungus(sidoCode) {
        return uniqueBy(
            entries.filter((e) => e.sidoCode === sidoCode),
            (e) => e.sigunguCode
        )
            .map((e) => ({ code: e.sigunguCode, name: e.sigunguName }))
            .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    }

    function uniqueDongs(sidoCode, sigunguCode) {
        return entries
            .filter((e) => e.sidoCode === sidoCode && e.sigunguCode === sigunguCode)
            .sort((a, b) => a.dongName.localeCompare(b.dongName, "ko"));
    }

    // 지역 데이터 로드
    try {
        // 임베디드 지역 데이터 파싱 (네부단지추출.js의 데이터 사용)
        const tsvText = window.EMBEDDED_REGION_TSV_GZIP_BASE64 || '';
        entries = parseRegionTSV(tsvText);

        if (entries.length === 0) {
            throw new Error('지역 데이터가 없습니다');
        }

        // 시도 드롭다운 채우기
        const sidoSelect = document.getElementById("apt-sido");
        sidoSelect.innerHTML = '<option value="">선택하세요</option>';
        uniqueSidos().forEach((sido) => {
            const opt = document.createElement("option");
            opt.value = sido.code;
            opt.textContent = sido.name;
            sidoSelect.appendChild(opt);
        });
        sidoSelect.disabled = false;

        setInfo(`✓ ${entries.length}개 지역 데이터 로드 완료`);
        log('✓ 지역 데이터 로드 완료');

    } catch (error) {
        setInfo(`❌ 지역 데이터 로드 실패: ${error.message}`);
        log(`❌ ${error.message}`);
    }

    // 시도 선택 이벤트
    document.getElementById("apt-sido").addEventListener("change", (e) => {
        selectedSidoCode = e.target.value;
        const sigunguSelect = document.getElementById("apt-sigungu");
        const dongSelect = document.getElementById("apt-dong");
        const complexSelect = document.getElementById("apt-complex");

        if (!selectedSidoCode) {
            sigunguSelect.innerHTML = '<option value="">시도를 선택하세요</option>';
            sigunguSelect.disabled = true;
            dongSelect.innerHTML = '<option value="">시군구를 선택하세요</option>';
            dongSelect.disabled = true;
            complexSelect.innerHTML = '<option value="">동을 선택하세요</option>';
            complexSelect.disabled = true;
            btnStart.disabled = true;
            return;
        }

        const sigungus = uniqueSigungus(selectedSidoCode);
        sigunguSelect.innerHTML = '<option value="">선택하세요</option>';
        sigungus.forEach((sigungu) => {
            const opt = document.createElement("option");
            opt.value = sigungu.code;
            opt.textContent = sigungu.name;
            sigunguSelect.appendChild(opt);
        });
        sigunguSelect.disabled = false;

        dongSelect.innerHTML = '<option value="">시군구를 선택하세요</option>';
        dongSelect.disabled = true;
        complexSelect.innerHTML = '<option value="">동을 선택하세요</option>';
        complexSelect.disabled = true;
        btnStart.disabled = true;
    });

    // 시군구 선택 이벤트
    document.getElementById("apt-sigungu").addEventListener("change", (e) => {
        selectedSigunguCode = e.target.value;
        const dongSelect = document.getElementById("apt-dong");
        const complexSelect = document.getElementById("apt-complex");

        if (!selectedSigunguCode) {
            dongSelect.innerHTML = '<option value="">시군구를 선택하세요</option>';
            dongSelect.disabled = true;
            complexSelect.innerHTML = '<option value="">동을 선택하세요</option>';
            complexSelect.disabled = true;
            btnStart.disabled = true;
            return;
        }

        const dongs = uniqueDongs(selectedSidoCode, selectedSigunguCode);
        dongSelect.innerHTML = '<option value="">선택하세요</option>';
        dongs.forEach((dong) => {
            const opt = document.createElement("option");
            opt.value = dong.cortarNo;
            opt.textContent = dong.dongName;
            dongSelect.appendChild(opt);
        });
        dongSelect.disabled = false;

        complexSelect.innerHTML = '<option value="">동을 선택하세요</option>';
        complexSelect.disabled = true;
        btnStart.disabled = true;
    });

    // 동 선택 이벤트
    document.getElementById("apt-dong").addEventListener("change", async (e) => {
        selectedCortarNo = e.target.value;
        const complexSelect = document.getElementById("apt-complex");

        if (!selectedCortarNo) {
            complexSelect.innerHTML = '<option value="">동을 선택하세요</option>';
            complexSelect.disabled = true;
            btnStart.disabled = true;
            return;
        }

        try {
            complexSelect.disabled = true;
            complexSelect.innerHTML = '<option value="">단지 로딩 중...</option>';
            setInfo('단지 정보 조회 중...');
            log(`▶ ${selectedCortarNo} 지역의 단지 조회 중...`);

            const token = await fetchToken();
            const listUrl = `https://new.land.naver.com/api/regions/complexes?cortarNo=${selectedCortarNo}&realEstateType=APT%3APRE%3AABYG%3AJGC&order=`;

            const response = await fetch(listUrl, {
                method: 'GET',
                headers: {
                    'authorization': token,
                    'accept': '*/*'
                }
            });

            const data = await response.json();
            const complexList = data?.complexList || [];

            if (complexList.length === 0) {
                complexSelect.innerHTML = '<option value="">해당 지역에 단지가 없습니다</option>';
                setInfo('이 지역에는 등록된 단지가 없습니다.');
                log('❌ 단지 없음');
                return;
            }

            complexSelect.innerHTML = '';
            complexList.forEach((complex) => {
                const opt = document.createElement("option");
                opt.value = complex.complexNo;
                opt.textContent = `${complex.complexName} (${complex.totalHouseholdCount}세대)`;
                complexSelect.appendChild(opt);
            });
            complexSelect.disabled = false;
            setInfo(`✓ ${complexList.length}개 단지 로드 완료`);
            log(`✓ ${complexList.length}개 단지 조회 완료`);
            btnStart.disabled = false;

        } catch (error) {
            setInfo(`❌ 단지 조회 실패: ${error.message}`);
            log(`❌ ${error.message}`);
            complexSelect.disabled = true;
            btnStart.disabled = true;
        }
    });

    // 조회 버튼
    btnStart.addEventListener("click", async () => {
        const complexSelect = document.getElementById("apt-complex");
        const selectedComplexes = Array.from(complexSelect.selectedOptions).map(opt => parseInt(opt.value));

        if (selectedComplexes.length === 0) {
            alert('단지를 선택하세요');
            return;
        }

        btnStart.disabled = true;
        btnExcel.disabled = true;
        collectedData = [];

        try {
            const token = await fetchToken();
            let processedCount = 0;

            for (const complexId of selectedComplexes) {
                setInfo(`조회 중: ${processedCount + 1}/${selectedComplexes.length}`);
                log(`▶ 단지 ${complexId} 조회 중...`);

                const complexDetails = await fetchComplexDetails(complexId);
                if (!complexDetails) {
                    log(`❌ 단지 ${complexId} 정보 없음`);
                    processedCount++;
                    continue;
                }

                // 가격 정보 수집
                let page = 1;
                let isMoreData = true;
                let allData = [];

                while (isMoreData) {
                    const data = await fetchArticles(token, page, complexId);
                    if (data.articleList && Array.isArray(data.articleList)) {
                        allData = allData.concat(data.articleList);
                    }
                    isMoreData = data.isMoreData;
                    page++;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                // 면적별 정리
                const priceByArea = {};
                allData.forEach(article => {
                    const area2 = article.area2;
                    const priceInManWon = parsePrice(article.dealOrWarrantPrc);
                    const tradeType = article.tradeTypeName;

                    if (!priceByArea[area2]) {
                        priceByArea[area2] = {
                            sale: { prices: [] },
                            rent: { prices: [] },
                            saleCnt: 0,
                            rentCnt: 0
                        };
                    }

                    if (tradeType === '매매') {
                        priceByArea[area2].sale.prices.push(priceInManWon);
                        priceByArea[area2].saleCnt++;
                    } else if (tradeType === '전세') {
                        priceByArea[area2].rent.prices.push(priceInManWon);
                        priceByArea[area2].rentCnt++;
                    }
                });

                // 최저가 계산
                Object.keys(priceByArea).forEach(area2 => {
                    const data = priceByArea[area2];
                    if (data.sale.prices.length > 0) data.sale.min = Math.min(...data.sale.prices);
                    if (data.rent.prices.length > 0) data.rent.min = Math.min(...data.rent.prices);
                });

                // 결과 저장
                const sortedAreas = Object.keys(priceByArea).sort((a, b) => parseFloat(a) - parseFloat(b));
                sortedAreas.forEach(area2 => {
                    const data = priceByArea[area2];
                    collectedData.push({
                        단지명: complexDetails.name,
                        입주시기: `${complexDetails.useApproveYmd.slice(0, 4)}.${complexDetails.useApproveYmd.slice(4, 6)}`,
                        전체세대수: complexDetails.totalHouseholdCount,
                        면적: area2,
                        매매가: data.sale.min ? formatPriceAsManWon(data.sale.min) : '-',
                        전세가: data.rent.min ? formatPriceAsManWon(data.rent.min) : '-',
                        매매물건수: data.saleCnt,
                        전세물건수: data.rentCnt
                    });
                });

                log(`✓ ${sortedAreas.length}개 면적 정보 수집`);
                processedCount++;
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // 결과 표시
            setInfo(`✓ 조회 완료: 총 ${collectedData.length}개 면적`);
            log(`✓ 조회 완료`);

            // 테이블 생성
            if (collectedData.length > 0) {
                const table = document.createElement('table');
                table.className = 'apt-table';

                // 헤더
                const headerRow = table.insertRow();
                ['단지명', '입주시기', '전체세대수', '면적', '매매가', '전세가', '매매물건수', '전세물건수'].forEach(text => {
                    const th = document.createElement('th');
                    th.innerText = text;
                    headerRow.appendChild(th);
                });

                // 데이터
                collectedData.forEach(item => {
                    const row = table.insertRow();
                    [item.단지명, item.입주시기, item.전체세대수, item.면적, item.매매가, item.전세가, item.매매물건수, item.전세물건수].forEach(text => {
                        const td = document.createElement('td');
                        td.innerText = text;
                        row.appendChild(td);
                    });
                });

                // 기존 테이블 제거 후 추가
                const existingTable = bd.querySelector('.apt-table');
                if (existingTable) existingTable.remove();
                bd.appendChild(table);
                btnExcel.disabled = false;
            }

        } catch (error) {
            setInfo(`❌ 오류: ${error.message}`);
            log(`❌ ${error.message}`);
        } finally {
            btnStart.disabled = false;
        }
    });

    // 엑셀 저장 버튼
    btnExcel.addEventListener("click", async () => {
        if (collectedData.length === 0) {
            alert('저장할 데이터가 없습니다.');
            return;
        }
        btnExcel.disabled = true;
        try {
            await saveComplexDataToExcel(collectedData);
            log('✓ 엑셀 파일 다운로드 완료');
        } finally {
            btnExcel.disabled = false;
        }
    });

    // 닫기 버튼
    btnClose.addEventListener("click", () => {
        overlay.remove();
    });
}

/**
 * 지역별 단지 정보를 엑셀로 저장
 * @param {array} complexData - 단지 정보 배열
 */
async function saveComplexDataToExcel(complexData) {
    try {
        console.log('\n엑셀 라이브러리 로드 중...');
        const XLSX = await loadSheetJS();

        const ws = XLSX.utils.json_to_sheet(complexData);
        
        ws['!cols'] = [
            { wch: 15 },  // 단지명
            { wch: 12 },  // 입주시기
            { wch: 12 },  // 전체세대수
            { wch: 10 },  // 면적
            { wch: 12 },  // 매매가
            { wch: 12 },  // 전세가
            { wch: 12 },  // 매매물건수
            { wch: 12 }   // 전세물건수
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '단지정보');

        const fileName = `단지정보_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);

        console.log(`✓ 엑셀 파일 다운로드 완료: ${fileName}\n`);

    } catch (error) {
        console.error('❌ 엑셀 저장 실패:', error);
    }
}
console.log('✓ 가격 조회 스크립트 로드 완료');
console.log('\n사용 가능한 함수:');
console.log('  - getPriceTableFormat(단지ID) : 테이블 형식으로 조회');
console.log('  - getPriceTableFormat(단지ID, 최소면적, 최대면적) : 테이블 형식 + 면적 범위');
console.log('  - getPriceExcel(단지ID) : 엑셀로 다운로드');
console.log('  - getPriceExcel(단지ID, 최소면적, 최대면적) : 엑셀 + 면적 범위');
console.log('  - getPriceInfoByConsole(단지ID) : 상세 목록으로 조회');
console.log('  - getPriceInfoMultiple([ID1, ID2, ...]) : 여러 단지 조회');
console.log('  - getComplexesByRegion() : 지역별 단지 검색 (대화형)');
console.log('\n예: await getPriceTableFormat(847)');
console.log('예: await getPriceExcel(374, 80, 120);');
console.log('예: await getComplexesByRegion();');
