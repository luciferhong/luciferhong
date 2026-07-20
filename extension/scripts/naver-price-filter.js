// [확장 이식] 원본: [루시퍼홍] 부동산 매물 가격 필터(based on 모느나님).user.js
// greasyfork 업데이트 팝업 IIFE 제거 — 웹스토어 자동 업데이트로 대체. 본문은 원본 그대로.
(async () => {
  const SCRIPT_ID = 'naver-price-filter';
  const { enabled = {} } = await chrome.storage.sync.get('enabled');
  if (enabled[SCRIPT_ID] === false) return; // 미설정 = 켜짐
  console.log('[루시퍼홍] 부동산 매물 가격 필터(based on 모느나님) v1.31 (extension)');


/* =========================================
   ✅ 복사 로직 (핵심 수정)
   - data-clipboard-text에 a태그를 넣지 않음
   - 클릭 시 plain 텍스트(예: 265000/8/0/-) 복사
========================================= */

// ClipboardJS는 "data-clipboard-text"만 복사하므로,
// 우리가 그 값에 plain 텍스트만 넣으면 된다.
try {
  new ClipboardJS('.copyBtn');
} catch (e) {
  // console.warn('ClipboardJS init failed (it is okay):', e);
}

window.copyTextFromButton = function (button) {
  const text = button.getAttribute('data-clipboard-text') || '';
  if (!text) return;

  // ClipboardJS가 있을 경우 자동으로도 복사되지만,
  // VM/브라우저 이슈 대비해서 navigator.clipboard도 한번 더 시도(무해).
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
};




const AREA_CHECK = 'area_check';
const LOW_JEONSE_CHECK = 'low_jeonse_check';
const ASSOCI_CHECK = 'associ_check';
const SEANGO_CHECK = 'seango_check';
const SHINHO_RADIO = 'shiho_radio';

const STORE_NAME = 'wolbu_price_filter';
const STORE_VALUE = {
  [AREA_CHECK]: false,  // ✅ 기본값을 false로 변경 (35평이상 제외)
  [LOW_JEONSE_CHECK]: false,
  [SEANGO_CHECK]: false,
};

const SIGN_LOW_VALUE = 5;
const SIGN_MIDDLE_VALUE = 10;

const validityCheck = {
  [SHINHO_RADIO]: {
    isCreate: false,
    value: 1,
    defValue: [
      { val: 1, text: 'X1' },
      { val: 2, text: 'X2' },
      { val: 3, text: 'X3' },
    ],
    title: '신호등',
    type: 'radio',
  },
  [SEANGO_CHECK]: { isCreate: false, value: false, title: '세안고포함', type: 'check' },
  [LOW_JEONSE_CHECK]: { isCreate: false, value: false, title: '최저전세값', type: 'check' },
  [AREA_CHECK]: { isCreate: false, value: false, title: '전용86이상 포함', type: 'check' },
  [ASSOCI_CHECK]: { isCreate: false, value: false, title: '협회물건 포함', type: 'check' },
};

function getStoreValue(id) {
  let storeVal = localStorage.getItem(STORE_NAME);

  if (!storeVal) {
    localStorage.setItem(STORE_NAME, JSON.stringify(STORE_VALUE));
    storeVal = localStorage.getItem(STORE_NAME);
  }

  return JSON.parse(storeVal)[id];
}

function setStoreValue(id, val) {
  let storeVal = localStorage.getItem(STORE_NAME);

  if (!storeVal) localStorage.setItem(STORE_NAME, JSON.stringify(STORE_VALUE));

  let parseVal = JSON.parse(storeVal);
  parseVal[id] = val;
  localStorage.setItem(STORE_NAME, JSON.stringify(parseVal));
}

function CheckBox(id, target) {
  this.div_id = 'div_' + id;
  this.id = id;
  this.labelText = validityCheck[id].title;
  this.divEle = this.init();
  target.after(this.divEle);

  let storeVal = getStoreValue(this.id);
  validityCheck[id].value = storeVal;
  document.querySelector('#' + id).checked = storeVal;

  document.querySelector('#' + id).addEventListener('change', function (e) {
    validityCheck[id].value = this.checked;
    setStoreValue(id, this.checked);

    // ✅ 중요 필터 체크박스 변경 시 캐시 초기화 및 자동 새로고침
    const importantFilters = [ASSOCI_CHECK, AREA_CHECK, LOW_JEONSE_CHECK, SEANGO_CHECK];
    if (importantFilters.includes(id)) {
      // console.log(`🔄 중요 필터 변경 감지: ${validityCheck[id].title} - 캐시 초기화`);
      g_cachedResult = null;
      window.__lastCacheKey = null;
      // 자동으로 데이터 재로드
      updateListAndScrollTop();
    }
  });
  validityCheck[id].isCreate = true;
}

CheckBox.prototype = {
  constructor: CheckBox,
  init: function () {
    const divEle = document.createElement('div');
    divEle.setAttribute('id', this.div_id);
    divEle.classList.add('filter_group', 'filter_group--size');
    divEle.style.margin = '6px 10px 0 0';
    divEle.innerHTML =
      '<input type="checkbox" name="type" id="' +
      this.id +
      '" class="checkbox_input" ><label for="' +
      this.id +
      '" class="checkbox_label">' +
      this.labelText +
      '</label>';
    return divEle;
  },
};

function RadioBox(id, target) {
  this.div_id = 'div_' + id;
  this.id = id;
  this.valArr = validityCheck[id].defValue;
  this.divEle = this.init();
  target.after(this.divEle);

  let storeVal = getStoreValue(this.id) || 1;
  validityCheck[id].value = storeVal;

  $("input:radio[name=signal]:radio[value='" + storeVal + "']").prop('checked', true);

  $('input[type=radio][name=signal]').change(function () {
    // console.log($(this).val());
    validityCheck[id].value = $(this).val();
    setStoreValue(id, $(this).val());
  });

  validityCheck[id].isCreate = true;
}

RadioBox.prototype = {
  constructor: RadioBox,
  init: function () {
    const divEle = document.createElement('div');
    divEle.setAttribute('id', this.div_id);
    divEle.classList.add('filter_group', 'filter_group--size');
    divEle.style.margin = '6px 10px 0 0';

    let radioBoxs = '';
    for (let i = 0; i < this.valArr.length; i++) {
      let val = this.valArr[i];
      radioBoxs += `<input type="radio" name="signal" id="shinho_${i}" class="radio_input" value="${val.val}"><label for="shinho_${i}" class="radio_label" style="margin-right: 10px; padding-left: 20px;">${val.text}</label>`;
    }

    divEle.innerHTML = radioBoxs;
    return divEle;
  },
};

function sinhoCheck(signalVal, gap) {
  let multiple = validityCheck[SHINHO_RADIO].value;
  let tootip = `${signalVal}% / ${gap}`;

  if (signalVal < SIGN_LOW_VALUE * multiple) return ['green', tootip];
  else if (signalVal <= SIGN_MIDDLE_VALUE * multiple) return ['orange', tootip];
  return ['red', tootip];
}

function createBox(key, type) {
  if (type === 'check') new CheckBox(key, document.querySelector('.filter_btn_detail'));
  else new RadioBox(key, document.querySelector('.filter_btn_detail'));
}

function checkMandantoryCondition(size, area2) {
  if (validityCheck[AREA_CHECK].value) return true;

  // ✅ area2 값(원본 소수점)이 85㎡를 초과하면 제외
  if (area2 > 85) {
    return false;
  }
  return true;
}

function getFloor(strFloor) {
  return strFloor.replace('층', '').split('/');
}

function checkItemCondition(tradeType, floor, spec) {
  if (tradeType != '전세' && tradeType != '매매') return false;

  if (
    !validityCheck[SEANGO_CHECK].value &&
    (spec.includes('끼고') || spec.includes('안고') || spec.includes('승계'))
  ) {
    return false;
  }

  if (tradeType == '매매') {
    var _floorInfo = getFloor(floor);
    if (_floorInfo[0] == '저') return false;

    if ('1|2|3'.indexOf(_floorInfo[0]) > -1 || _floorInfo[0] == _floorInfo[1]) return false;

    if (_floorInfo[1] >= 5 && _floorInfo[0] <= 3) return false;
  }
  return true;
}

function parsePrice(tradePrice) {
  tradePrice = tradePrice.replace(' ', '').replace(',', '');
  if (tradePrice.includes('억'))
    return parseInt(tradePrice.split('억')[0] * 10000) + (parseInt(tradePrice.split('억')[1]) || 0);
  else return parseInt(tradePrice);
}

function findAgentIndex() {
  const items = document.querySelectorAll('.item');
  let filteredIndex = 0;
  for (let i = 0; i < items.length; i++) {
    if (!items[i].classList.contains('item--child')) {
      const titleElement = items[i].querySelector('.item_agent_title');
      if (titleElement && titleElement.textContent.includes('공인중개사협회매물')) {
        return filteredIndex;
      }
      filteredIndex++;
    }
  }
  return -1;
}

// ✅ API 토큰 가져오기
async function fetchToken() {
  const tokenUrl = 'https://new.land.naver.com/complexes';
  const response = await fetch(tokenUrl, { method: 'GET' });
  const text = await response.text();
  const tokenStartIndex = text.indexOf('token') + 17;
  const tokenEndIndex = text.indexOf('"', tokenStartIndex);
  const token = text.substring(tokenStartIndex, tokenEndIndex);
  return `Bearer ${token}`;
}

// ✅ 인증 포함 fetch 함수
async function fetchWithAuth(url, options = {}) {
  const authorization = await fetchToken();
  const headers = {
    ...options.headers,
    'authorization': authorization
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
    mode: 'cors'
  });
}

// ✅ URL에서 복합단지 번호 추출
function getComplexNoFromUrl() {
  const url = window.location.href;
  const match = url.match(/\/complexes\/(\d+)/);
  return match ? match[1] : null;
}

// ✅ 필터 파라미터 추출
function getFilterParamsFromUrl() {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);

  return {
    realEstateType: 'APT:ABYG:JGC:PRE',
    tradeType: 'A1:B1',
    tag: params.get('q') ? `:${params.get('q')}:` : '',
    rentPriceMin: 0,
    rentPriceMax: 900000000,
    priceMin: 0,
    priceMax: 900000000,
    areaMin: 0,
    areaMax: 900000000,
    minHouseHoldCount: 190,
    showArticle: 'false',
    sameAddressGroup: 'true',
    priceType: 'RETAIL',
    order: 'prc'
  };
}

// ✅ 현재 필터 상태 조회 (캐시 키 생성용)
function getCurrentFilterState() {
  return {
    areaCheck: validityCheck[AREA_CHECK].value,
    lowJeonseCheck: validityCheck[LOW_JEONSE_CHECK].value,
    seangoCheck: validityCheck[SEANGO_CHECK].value,
    associCheck: validityCheck[ASSOCI_CHECK].value,
    shinhoRadio: validityCheck[SHINHO_RADIO].value,
    addressGroup2: document.querySelector('#address_group2')?.checked || false,
  };
}

// ✅ 필터 상태 기반 캐시 키 생성
function getCacheKey(complexId) {
  const filterState = getCurrentFilterState();
  const filterHash = JSON.stringify(filterState);
  return `${complexId}_${filterHash}`;
}

async function getPrice_WeolbuStandard() {
  let result = {};
  let dictPricePerSize = {};

  // ✅ 캐시 확인: 필터값을 포함한 캐시 키로 비교
  const currentComplexId = getComplexNoFromUrl();
  const currentCacheKey = getCacheKey(currentComplexId);

  if (window.__lastCacheKey === currentCacheKey && g_cachedResult) {
    // console.log(`📦 캐시된 결과 사용: cacheKey=${currentCacheKey}`);
    return g_cachedResult;
  }

  // ✅ 캐시 키가 변경되면 새로 로드 (필터값 변경 감지)
  if (window.__lastCacheKey !== currentCacheKey) {
    // console.log(`🔄 필터값 변경 감지: 캐시 무효화`);
    // console.log(`  이전: ${window.__lastCacheKey}`);
    // console.log(`  현재: ${currentCacheKey}`);
    window.__lastCacheKey = currentCacheKey;
  }

  // ✅ 먼저 구조 정보(pyeongInfoMap) 로드
  const t1 = performance.now();
  let t2 = t1;  // ✅ t2 초기화
  let pyeongInfoMap = {};
  try {
    pyeongInfoMap = await findLowestFloorByArea();
    t2 = performance.now();
    // console.log(`📐 pyeongInfoMap 로드 완료 (${(t2-t1).toFixed(0)}ms):`, pyeongInfoMap);
  } catch (error) {
    t2 = performance.now();
    // console.error('⚠️ pyeongInfoMap 로드 실패:', error);
  }

  let tradeTypeValueFnc = function (tradeType, befVal, newVal) {
    let price, floor, index, articleNo;

    if (tradeType === '매매') {
      // 매매: 더 낮은 가격을 선택
      if (befVal[0] > newVal[0]) {
        price = newVal[0];
        floor = newVal[1];
        index = newVal[4];
        articleNo = newVal[5];  // ✅ 더 낮은 가격의 articleNo 선택
      } else {
        price = befVal[0];
        floor = befVal[1];
        index = befVal[4];
        articleNo = befVal[5];  // ✅ 기존 articleNo 유지
      }
    } else {
      // 전세: 설정에 따라 (높은가 or 낮은가)
      if (validityCheck[LOW_JEONSE_CHECK].value) {
        // 최저 전세값 옵션: 낮은 가격
        if (befVal[0] < newVal[0]) {
          price = befVal[0];
          floor = befVal[1];
          index = befVal[4];
          articleNo = befVal[5];  // ✅ 더 낮은 가격의 articleNo
        } else {
          price = newVal[0];
          floor = newVal[1];
          index = newVal[4];
          articleNo = newVal[5];  // ✅ 새로운 더 낮은 가격의 articleNo
        }
      } else {
        // 기본값: 높은 가격
        if (befVal[0] < newVal[0]) {
          price = newVal[0];
          floor = newVal[1];
          index = newVal[4];
          articleNo = newVal[5];  // ✅ 더 높은 가격의 articleNo
        } else {
          price = befVal[0];
          floor = befVal[1];
          index = befVal[4];
          articleNo = befVal[5];  // ✅ 기존 articleNo 유지 (더 낮으니)
        }
      }
    }

    return [price, floor, befVal[2] + newVal[2], ++befVal[3], index, articleNo];  // ✅ articleNo 포함
  };

  // ✅ API로 모든 매물 데이터 가져오기 (스크롤 불필요)
  const complexNo = getComplexNoFromUrl();
  if (!complexNo) {
    // console.error('복합단지 번호를 찾을 수 없습니다.');
    return result;
  }

  try {
    const filters = getFilterParamsFromUrl();
    let allArticles = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 50; // 너무 많은 페이지 방지

    // ✅ 모든 페이지의 1차 매물 데이터 수집
    while (hasMore && page <= maxPages) {
      const queryParams = new URLSearchParams({
        realEstateType: filters.realEstateType,
        tradeType: filters.tradeType,
        tag: filters.tag,
        rentPriceMin: filters.rentPriceMin,
        rentPriceMax: filters.rentPriceMax,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        areaMin: filters.areaMin,
        areaMax: filters.areaMax,
        minHouseHoldCount: filters.minHouseHoldCount,
        showArticle: filters.showArticle,
        sameAddressGroup: filters.sameAddressGroup,
        priceType: filters.priceType,
        order: filters.order,
        page: page,
        complexNo: complexNo
      });

      const apiUrl = `https://new.land.naver.com/api/articles/complex/${complexNo}?${queryParams}`;

      try {
        const response = await fetchWithAuth(apiUrl);
        const data = await response.json();

        if (data.articleList && data.articleList.length > 0) {
          allArticles = allArticles.concat(data.articleList);
          hasMore = data.hasMore !== false && data.isMoreData !== false;
          page++;
        } else {
          hasMore = false;
        }
      } catch (error) {
        // console.error(`페이지 ${page} 수집 오류:`, error);
        hasMore = false;
      }

      // ✅ API 속도 제한 대비 (딜레이 제거)
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // console.log(`📊 API에서 ${allArticles.length}개의 매물 수집 완료`);


    // ✅ API 데이터에서 평형별 가격 정보 추출
    let itemIndex = 0;
    const assocCheckEnabled = validityCheck[ASSOCI_CHECK].value;
    let processedCount = 0;

    allArticles.forEach(function (article, idx) {
      itemIndex++;

      // 협회 물건 제외 옵션
      if (!assocCheckEnabled && article.cpid === 'KAR') {
      // console.log(`⏭️ [${idx}] 협회물건 제외: ${article.articleName}`);
        return;
      }

      // ✅ 매매/전세 구분 (수정됨: tradeTypeCode 사용)
      const tradeType = article.tradeTypeCode === 'A1' ? '매매' : (article.tradeTypeCode === 'B1' ? '전세' : '');
      if (!tradeType) {
        // console.log(`⏭️ [${idx}] 거래유형 없음: ${article.articleName}, tradeTypeCode=${article.tradeTypeCode}`);
        return;
      }

      // ✅ 면적 정보 파싱 (수정됨: areaName/area2㎡ 형식)
      let size = '0';
      let area2 = 0;  // ✅ 변수 초기화 (스코프 문제 해결)
      let area2Original = 0;  // ✅ 원본 소수점 값 저장 (필터링용)
      let originalAreaName = article.areaName; // 구조 정보 검색용
      let gujoInfo = '-'; // 구조 정보 저장

      if (article.areaName && article.area2) {
        area2Original = parseFloat(article.area2) || 0;  // ✅ 원본 소수점 값
        area2 = parseInt(article.area2) || 0;  // ✅ 표시용 정수값
        if (area2 > 0) {
          size = `${article.areaName}/${area2}㎡`;
          // console.log(`📐 [${idx}] 면적 표시: areaName=${article.areaName}, area2=${area2}㎡ → ${size}`);

          // ✅ 구조 정보 lookup (areaName으로 lookup)
          gujoInfo = pyeongInfoMap[article.areaName] || pyeongInfoMap[String(article.areaName)] || '-';
          // console.log(`📐 [${idx}] 구조 정보 lookup: areaName=${article.areaName} → "${gujoInfo}"`);
        }
      }

      if (size === '0') {
        // console.log(`⏭️ [${idx}] 면적 파싱 실패: ${article.articleName}, areaName=${article.areaName}, area2=${article.area2}`);
        return;
      }

      // ✅ 가격 정보 (수정됨: dealOrWarrantPrc 사용)
      let tradePrice = 0;
      let priceStr = '';

      if (tradeType === '매매') {
        priceStr = article.dealOrWarrantPrc || '0';
      } else if (tradeType === '전세') {
        // 전세는 rentPrc 또는 다른 필드 사용
        priceStr = article.rentPrc || article.dealOrWarrantPrc || '0';
      }

      // 가격 문자열 파싱 ("20억" → 2000000000)
      if (priceStr) {
        priceStr = priceStr.replace(/\s/g, '').replace(/,/g, '');
        if (priceStr.includes('억')) {
          const parts = priceStr.split('억');
          tradePrice = parseInt(parts[0] * 10000) + (parseInt(parts[1]) || 0);
        } else {
          tradePrice = parseInt(priceStr) || 0;
        }
      }

      if (tradePrice === 0) {
        // console.log(`⏭️ [${idx}] 가격 파싱 실패: ${article.articleName}, priceStr=${priceStr}`);
        return;
      }

      // console.log(`✅ [${idx}] 통과: ${article.articleName}, 거래=${tradeType}, 면적=${size}, 가격=${tradePrice}`);

      // ✅ 층 정보 파싱 (수정됨: floorInfo 사용)
      let floor = '-';
      if (article.floorInfo) {
        // floorInfo 예: "6/13" 형식
        floor = article.floorInfo;
      }

      // 향 정보 (맞음)
      let orientation = article.direction || '-';

      // 추가 정보 (태그/스펙) (맞음)
      let specInfo = '';
      if (article.tagList && Array.isArray(article.tagList)) {
        specInfo = article.tagList.join(', ');
      } else if (article.tagList) {
        specInfo = article.tagList;
      }

      // aptInfo 형식으로 만들기: "109평, 6/13, 남동향"
      const aptInfoStr = `${size}, ${floor}, ${orientation}`;

      if (tradeType && size !== '0') {
        if (!checkMandantoryCondition(size, area2Original)) {
          // console.log(`⏭️ checkMandantoryCondition 필터링: ${size} (85㎡ 초과)`);
          return;
        }

        if (!(size in result)) {
          result[size] = {
            매매: 0,
            전세: 0,
            갭: 0,
            전세가율: '-',
            매매층: '-',
            전세층: '-',
            매매갯수: 0,
            전세갯수: '0',
            매매신: '',
            id: itemIndex - 1,
            originalAreaName: originalAreaName,  // ✅ 구조 정보 검색용 키 저장
            gujoInfo: gujoInfo,  // ✅ 구조 정보 직접 저장
            매매ArticleNo: null,  // ✅ 매매 매물의 articleNo 저장
            전세ArticleNo: null,  // ✅ 전세 매물의 articleNo 저장
          };
          dictPricePerSize[size] = { 매매: {}, 전세: {} };
        }

        if (!(document.querySelector('#address_group2')?.checked)) {
          if (!dictPricePerSize[size][tradeType][aptInfoStr]) {
            dictPricePerSize[size][tradeType][aptInfoStr] = [
              tradePrice,
              getFloor(floor)[0],
              specInfo,
              1,
              itemIndex - 1 !== undefined ? itemIndex - 1 : -1,
              article.articleNo,  // ✅ articleNo 추가
            ];
          } else {
            let beforeValue = dictPricePerSize[size][tradeType][aptInfoStr];
            let newValue = [tradePrice, getFloor(floor)[0], specInfo, 1, itemIndex - 1, article.articleNo];
            dictPricePerSize[size][tradeType][aptInfoStr] = tradeTypeValueFnc(
              tradeType,
              beforeValue,
              newValue
            );
          }
        } else {
          if (!dictPricePerSize[size][tradeType][aptInfoStr + '_' + tradePrice]) {
            dictPricePerSize[size][tradeType][aptInfoStr + '_' + tradePrice] = [
              tradePrice,
              getFloor(floor)[0],
              specInfo,
              1,
              itemIndex - 1,
              article.articleNo,  // ✅ articleNo 추가
            ];
          } else {
            let beforeValue =
              dictPricePerSize[size][tradeType][aptInfoStr + '_' + tradePrice];
            let newValue = [tradePrice, getFloor(floor)[0], specInfo, 1, itemIndex - 1, article.articleNo];
            dictPricePerSize[size][tradeType][aptInfoStr + '_' + tradePrice] =
              tradeTypeValueFnc(tradeType, beforeValue, newValue);
          }
        }

        processedCount++;
      }
    });

    // console.log(`✅ 처리된 매물: ${processedCount}개, 결과 크기: ${Object.keys(result).length}`);
    const t3 = performance.now();
    // console.log(`⏱️ API 수집 및 처리 완료: ${(t3-t1).toFixed(0)}ms (pyeongInfo: ${(t2-t1).toFixed(0)}ms)`);
    // console.log('🔍 결과 샘플:', Object.entries(result).slice(0, 3));

  } catch (error) {
    // console.error('API 데이터 수집 오류:', error);
    return result;
  }

  let isGrouped = document.querySelector('#address_group2')?.checked || false;

  for (let key in result) {
    let sellObj = dictPricePerSize[key]['매매'];
    let liveObj = dictPricePerSize[key]['전세'];

    let sellCnt = !isGrouped
      ? Object.keys(sellObj).length
      : Object.entries(sellObj).reduce((acc, [, item]) => {
          return parseInt(acc) + parseInt(item[3]);
        }, 0);

    let liveCnt = !isGrouped
      ? Object.keys(liveObj).length
      : Object.entries(liveObj).reduce((acc, [, item]) => parseInt(acc) + parseInt(item[3]), 0);

    for (let k in sellObj) {
      let aptObj = sellObj[k];
      if (!checkItemCondition('매매', k.split(',')[1], aptObj[2])) {
        delete sellObj[k];
      }
    }

    // ✅ 저층/탑층 제외 로직
    let normalFloorSellObj = Object.entries(sellObj).filter(([k, v]) => {
      const floorStr = k.split(',')[1].trim();
      const floorInfo = getFloor(floorStr);
      const isLowFloor = ['1', '2', '3', '저'].includes(floorInfo[0]);
      const isTopFloor = floorInfo[0] === floorInfo[1];
      return !isLowFloor && !isTopFloor;
    });

    let finalSellObj = normalFloorSellObj.length > 0
      ? normalFloorSellObj.sort(([, a], [, b]) => a[0] - b[0])
      : Object.entries(sellObj).sort(([, a], [, b]) => a[0] - b[0]);

    let finalLivelObj = Object.entries(liveObj).sort(([, a], [, b]) => b[0] - a[0]);

    if (finalSellObj && finalSellObj.length) {
      let sellPrice = finalSellObj[0][1][0];

      result[key]['매매'] = finalSellObj[0][1][0];
      result[key]['매매층'] = finalSellObj[0][1][1];
      result[key]['매매ArticleNo'] = finalSellObj[0][1][5] || null;  // ✅ articleNo 추출
      result[key]['매매index'] =
        finalSellObj[0][1] &&
        finalSellObj[0][1].length > 4 &&
        finalSellObj[0][1][4] !== undefined
          ? finalSellObj[0][1][4]
          : '-';

      if (isGrouped) {
        let compareObj = finalSellObj.filter((item) => item[1][0] > sellPrice);

        if (compareObj && compareObj.length) {
          let comparePrice = compareObj[0][1][0];
          let compareRate = (100 - (parseInt(sellPrice) / comparePrice) * 100).toFixed(1);
          result[key]['매매신'] = sinhoCheck(compareRate, comparePrice - parseInt(sellPrice));
        }
      }
    }

    result[key]['매매갯수'] = sellCnt;

    if (finalLivelObj && finalLivelObj.length) {
      let idx = validityCheck[LOW_JEONSE_CHECK].value ? finalLivelObj.length - 1 : 0;

      result[key]['전세'] = finalLivelObj[idx][1][0];
      result[key]['전세층'] = finalLivelObj[idx][1][1];
      result[key]['전세ArticleNo'] = finalLivelObj[idx][1][5] || null;  // ✅ articleNo 추출
      result[key]['전세갯수'] = liveCnt;
      result[key]['전세index'] = finalLivelObj[idx][1][4] !== undefined ? finalLivelObj[idx][1][4] : ' ';
      result[key]['갭'] = parseInt(result[key]['매매']) - parseInt(result[key]['전세']);
      result[key]['전세가율'] =
        parseInt((parseInt(result[key]['전세']) / parseInt(result[key]['매매'])) * 100) + '%';
    }
  }

  // ✅ 캐시 저장 (필터값 포함)
  g_cachedResult = result;

  return result;
}

function makeShinhoDot(shinhoColor) {
  let canvasDiv = document.createElement('div');
  canvasDiv.style.display = 'inline';

  if (typeof shinhoColor === 'object') {
    canvasDiv.title = shinhoColor[1];
    shinhoColor = shinhoColor[0];
  }

  let canvas = document.createElement('canvas');
  canvas.width = 20;
  canvas.height = 20;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(8, 8, 4, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = shinhoColor;
  ctx.fill();
  canvasDiv.appendChild(canvas);
  return canvasDiv;
}

async function findLowestFloorByArea() {
  const url = window.location.href;
  const match = url.match(/complexes\/(\d+)/);
  const complexId = match ? match[1] : null;

  const pyeongInfoResponse = await fetch(
    `https://new.land.naver.com/api/complexes/${parseInt(complexId, 10)}?sameAddressGroup=true`,
    {
      headers: {
        accept: '*/*',
        'accept-language': 'ko-KR,ko;q=0.9,zh-MO;q=0.8,zh;q=0.7,en-US;q=0.6,en;q=0.5',
        authorization: await fetchToken(),
        priority: 'u=1, i',
        'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      },
      referrerPolicy: 'unsafe-url',
      body: null,
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
    }
  );

  const pyeongInfoData = await pyeongInfoResponse.json();
  const pyeongInfoMap = pyeongInfoData.complexPyeongDetailList.reduce((acc, item) => {
    let entranceTypeSymbol = '';
    if (item.entranceType === '계단식') entranceTypeSymbol = '계';
    else if (item.entranceType === '복도식') entranceTypeSymbol = '복';
    else if (item.entranceType === '복합식') entranceTypeSymbol = '합';
    else entranceTypeSymbol = item.entranceType;

    const roomCnt = item.roomCnt;
    const bathroomCnt = item.bathroomCnt;
    const formattedValue = `${entranceTypeSymbol}/${roomCnt}/${bathroomCnt}`;
    acc[item.pyeongName] = formattedValue;
    return acc;
  }, {});

  return pyeongInfoMap;
}

async function fetchToken() {
  const tokenUrl = 'https://new.land.naver.com/complexes';
  const response = await fetch(tokenUrl, { method: 'GET' });
  const text = await response.text();
  const tokenStartIndex = text.indexOf('token') + 17;
  const tokenEndIndex = text.indexOf('"', tokenStartIndex);
  const token = text.substring(tokenStartIndex, tokenEndIndex);
  return `Bearer ${token}`;
}

let hideManually = false;
let bookmarkButton;
let screenInfo;

function updateBookmarkVisibility() {
  try {
    const panel = document.querySelector('.list_panel');
    if (!panel || panel.style.display === 'none') {
      document.querySelector('#bookmarkButton').style.display = 'none';
    } else {
      document.querySelector('#bookmarkButton').style.display = 'block';
    }
  } catch {}
}

async function addInfoToScreen(infos) {
  // ✅ 스크롤 진행 중이면 화면 재생성 막기 (기존 화면이 사라지는 것 방지)
  if (window.__scrollToItemInProgress) {
    // console.log('⏸️ 스크롤 진행 중: addInfoToScreen() 스킵');
    return;
  }

  // console.log('🎨 addInfoToScreen() 호출됨. infos:', Object.keys(infos));

  let isGrouped = document.querySelector('#address_group2')?.checked || false;
  var oldScreenInfo = document.querySelector('.complex_price_info');
  if (oldScreenInfo) oldScreenInfo.remove();

  screenInfo = document.createElement('div');
  screenInfo.style.overflowY = 'auto';
  screenInfo.setAttribute('class', 'complex_price_info');
  screenInfo.style.marginTop = '10px';

  screenInfo.id = 'screenInfo';
  screenInfo.style.position = 'fixed';
  screenInfo.style.top = '400px';
  screenInfo.style.left = '597px';
  screenInfo.style.transform = 'translate(-50%, -50%)';
  screenInfo.style.zIndex = '1000';
  screenInfo.style.backgroundColor = 'white';
  screenInfo.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  screenInfo.style.border = '1px solid #ccc';
  screenInfo.style.padding = '10px';
  screenInfo.style.maxHeight = '400px';
  screenInfo.style.overflowY = 'auto';
  screenInfo.style.width = '390px';

  screenInfo.style.display = 'none';
  hideManually = false;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'style') {
        const currentDisplay = screenInfo.style.display;
        if (currentDisplay === 'none' && !hideManually) {
        }
      }
    });
  });
  observer.observe(screenInfo, { attributes: true, attributeFilter: ['style'] });

  const itemList = document.querySelector('.item_list--article');

  let isFirst = true;
  // ⚠️ findLowestFloorByArea는 이미 getPrice_WeolbuStandard에서 호출 완료되었으므로 중복 호출 제거

  for (let size in infos) {
    // ✅ 화면 표시용(링크 포함) - articleNo 사용
    var tradeArticleNo = infos[size]['매매ArticleNo'];
    var leaseArticleNo = infos[size]['전세ArticleNo'];



    // 매매 가격 - 실제 비교용 숫자 가격 저장
    var strTradePriceInfo = infos[size]['매매']
      ? `<a href='#' class='scroll-link' data-size='${size}' data-numeric-floor='${infos[size]['매매층']}' data-numeric-price='${infos[size]['매매']}'>${infos[size]['매매']}/${infos[size]['매매층']}</a>`
      : '0/-';
    // 전세 가격 - 실제 비교용 숫자 가격 저장
    var strLeasePriceInfo = infos[size]['전세']
      ? `<a href='#' class='scroll-link' data-size='${size}' data-numeric-floor='${infos[size]['전세층']}' data-numeric-price='${infos[size]['전세']}'>${infos[size]['전세']}/${infos[size]['전세층']}</a>`
      : '0/-';

    // ✅ 복사용(plain 텍스트)  <<<<<<<<<<<<<< 핵심
    const plainTrade = infos[size]['매매'] ? `${infos[size]['매매']}/${infos[size]['매매층']}` : '0/-';
    const plainLease = infos[size]['전세'] ? `${infos[size]['전세']}/${infos[size]['전세층']}` : '0/-';
    const clipboardPlainText = `${plainTrade}/${plainLease}`; // 예: 265000/8/0/-

    var additionalInfos = [];
    if (infos[size]['매매'] && infos[size]['전세']) {
      additionalInfos.push(infos[size]['갭']);
      additionalInfos.push(infos[size]['전세가율']);
    }

    if (infos[size]['매매']) {
      // "84B/115㎡" 형식에서 "/" 이후의 숫자만 추출
      const match = size.match(/\/(\d+)㎡/);
      const sqmNum = match ? parseInt(match[1]) : 0;
      if (sqmNum > 0) {
        additionalInfos.push(parseInt(infos[size]['매매'] / sqmNum) + '/㎡');
      }
    }

    var strAdditionalInfo = '';

    if (document.querySelector('#address_group2')?.checked)
      strAdditionalInfo +=
        additionalInfos.length > 0
          ? '  (' + infos[size]['매매갯수'] + '/' + infos[size]['전세갯수'] + ')'
          : '';

    if (isGrouped && isFirst) {
      let multiple = validityCheck[SHINHO_RADIO].value;

      let shinhoDesc = document
        .querySelector('#summaryInfo > div.complex_summary_info > div.complex_trade_wrap > div > dl:nth-child(1)')
        .cloneNode();
      shinhoDesc.setAttribute('added', true);
      let shinhoDt = document.createElement('dt');
      let greenDot = makeShinhoDot('green');
      let orangeDot = makeShinhoDot('orange');
      let redDot = makeShinhoDot('red');

      let greenDescEle = document.createElement('span');
      greenDescEle.innerHTML = `${SIGN_LOW_VALUE * multiple}%미만`;
      greenDescEle.style.margin = '0 8px 0 -3px';
      greenDescEle.classList.add('data');

      let orangeDescEle = document.createElement('span');
      orangeDescEle.innerHTML = `${SIGN_MIDDLE_VALUE * multiple}%미만`;
      orangeDescEle.style.margin = '0 8px 0 -3px';
      orangeDescEle.classList.add('data');

      let redDescEle = document.createElement('span');
      redDescEle.innerHTML = `${SIGN_MIDDLE_VALUE * multiple}%이상`;
      redDescEle.style.margin = '0 8px 0 -3px';
      redDescEle.classList.add('data');

      shinhoDt.appendChild(greenDot);
      shinhoDt.appendChild(greenDescEle);

      shinhoDt.appendChild(orangeDot);
      shinhoDt.appendChild(orangeDescEle);

      shinhoDt.appendChild(redDot);
      shinhoDt.appendChild(redDescEle);

      shinhoDesc.style.lineHeight = '1px';
      shinhoDesc.appendChild(shinhoDt);
      screenInfo.appendChild(shinhoDesc);
      isFirst = false;
    }

    var cloned = document
      .querySelector('#summaryInfo > div.complex_summary_info > div.complex_trade_wrap > div > dl:nth-child(1)')
      .cloneNode(true);
    cloned.setAttribute('added', true);

    // ✅ 구조 정보 표시 (이미 로드된 값 사용)
    const gujo = infos[size].gujoInfo && infos[size].gujoInfo !== '-' ? '(' + infos[size].gujoInfo + ')' : '';

    // ✅ data-clipboard-text에 "plain 텍스트"만 넣는다 (a태그 제거 완료)
    cloned.getElementsByClassName('title')[0].innerHTML = `
      <button class="copyBtn"
        data-clipboard-text="${clipboardPlainText}"
        onMouseOver="this.style.color='red'"
        onMouseOut="this.style.color='#555'"
        onMouseDown="this.style.color='#1F75FE'"
        onMouseUp="this.style.color='red'">
        ${size}${gujo}
      </button>`;

    var trade = cloned.getElementsByClassName('data')[0];
    var lease = trade.cloneNode(true);
    var additionalInfo = trade.cloneNode(true);
    var delim = trade.cloneNode(true);

    trade.innerHTML = strTradePriceInfo; // 화면용 링크
    trade.style.color = '#f34c59';
    lease.innerHTML = strLeasePriceInfo; // 화면용 링크
    lease.style.color = '#4c94e8';
    delim.innerText = ' / ';
    delim.style.color = '#ffffff';
    additionalInfo.innerText = strAdditionalInfo;

    cloned.removeChild(trade);

    cloned.appendChild(delim);
    cloned.appendChild(trade);
    cloned.appendChild(delim.cloneNode(true));
    cloned.appendChild(lease);
    cloned.appendChild(delim.cloneNode(true));
    cloned.appendChild(additionalInfo);

    if (isGrouped && infos[size]['매매'] !== 0 && infos[size]['매매신'] !== '')
      cloned.appendChild(makeShinhoDot(infos[size]['매매신']));

    cloned.style.lineHeight = '1px';
    screenInfo.appendChild(cloned);
  }

  const summaryInfo = document.querySelector('#summaryInfo');
  if (!summaryInfo) {
    // console.error('❌ #summaryInfo 요소를 찾을 수 없습니다.');
    // console.log('📌 DOM 구조:', document.querySelector('#complexOverviewList')?.innerHTML?.substring(0, 200));
    return;
  }

  const dlElement = document.querySelector('#summaryInfo > dl');
  if (dlElement) {
    summaryInfo.insertBefore(screenInfo, dlElement);
  } else {
    summaryInfo.appendChild(screenInfo);
  }

  // console.log('✅ screenInfo 요소가 DOM에 추가됨. 현재 display:', screenInfo.style.display);

  const scrollLinks = document.querySelectorAll('.scroll-link');
  // console.log(`🔗 발견된 scroll-link 개수: ${scrollLinks.length}`);

  scrollLinks.forEach((link) => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      let targetSize = this.getAttribute('data-size');
      let targetNumericFloor = this.getAttribute('data-numeric-floor');
      let targetNumericPrice = parseInt(this.getAttribute('data-numeric-price')) || 0;

      // console.log(`🖱️ 클릭됨! size=${targetSize}, floor=${targetNumericFloor}, price=${targetNumericPrice}`);
      scrollToItem(targetSize, targetNumericFloor, targetNumericPrice);
    });
  });

  // ✅ ClipboardJS 재초기화 (동적으로 생성된 copyBtn을 처리)
  try {
    new ClipboardJS('.copyBtn');
  } catch (e) {
    // console.warn('ClipboardJS reinit failed:', e);
  }

  installHoverRevealOnce();
}

function installHoverRevealOnce() {
  if (window.__pricePanelHoverInstalled) return;
  window.__pricePanelHoverInstalled = true;

  // console.log('🎯 installHoverRevealOnce() 실행됨');

  let hideTimer = null;
  const HOVER_DELAY = 0;

  const inSafeZone = (el) => !!(el && el.closest && el.closest('#screenInfo, .panel_group--upper'));

  const showPanel = () => {
    if (screenInfo) {
      screenInfo.style.display = 'block';
      //console.log('👁️ 패널 표시됨');
    }
  };

  const hidePanel = () => {
    if (screenInfo) {
      screenInfo.style.display = 'none';
      //console.log('👁️ 패널 숨김');
    }
  };

  document.addEventListener('mousemove', (e) => {
    // ✅ 스크롤 진행 중이면 hideTimer를 설정하지 않음 (결과창 계속 표시)
    if (window.__scrollToItemInProgress) {
      showPanel();
      clearTimeout(hideTimer);  // 진행 중인 hideTimer 취소
      return;
    }

    if (inSafeZone(e.target)) {
      clearTimeout(hideTimer);
      showPanel();
    } else {
      clearTimeout(hideTimer);
      const x = e.clientX, y = e.clientY;
      hideTimer = setTimeout(() => {
        const el = document.elementFromPoint(x, y);
        if (!inSafeZone(el)) hidePanel();
      }, HOVER_DELAY);
    }
  }, { passive: true });

  document.body.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab_area_list .tab_item[id^="detailTab"]');
    if (tab && screenInfo) screenInfo.style.display = 'none';
  }, true);
}

// ✅ 스크롤을 끝까지 내려서 모든 아이템 로드 (Promise 반환)
async function scrollToBottom() {
  let listContainer = document.querySelector('#complexOverviewList > div > div.item_area > div');
  if (!listContainer) {
    listContainer = document.querySelector('#articleListArea');
  }
  if (!listContainer) {
    // console.error('❌ 스크롤 컨테이너를 찾을 수 없음');
    return false;
  }

  return new Promise((resolve) => {
    let lastScrollHeight = 0;
    let stableTries = 0; // 스크롤 높이가 변하지 않은 횟수
    const scrollAmount = 1000;  // ✅ 마우스 휠 빠른 움직임

    const scrollLoop = () => {
      const beforeScroll = listContainer.scrollTop;
      listContainer.scrollTop += scrollAmount;
      const afterScroll = listContainer.scrollTop;

      // 스크롤이 더 이상 진행 안 됨 (끝까지 도달)
      if (beforeScroll === afterScroll) {
        stableTries++;
        // console.log(`📍 스크롤 끝 감지 (${stableTries}회 안정화)`);
        if (stableTries >= 2) {
          // console.log(`✅ 스크롤 완료: 총 ${document.querySelectorAll('#articleListArea > div.item').length}개 아이템 로드됨`);
          resolve(true);
          return;
        }
      } else {
        stableTries = 0;
      }

      // 다음 스크롤 예약 (마우스 휠 빠른 연속 클릭과 유사)
      setTimeout(scrollLoop, 80);  // ✅ 사람이 빠르게 휠을 움직일 때 간격
    };

    scrollLoop();
  });
}

function scrollToItem(targetSize, targetFloor, targetNumericPrice) {
  // console.log(`🔍 scrollToItem 호출: size=${targetSize}, floor=${targetFloor}, price=${targetNumericPrice}`);

  // ✅ 스크롤 진행 중 플래그 설정 (다른 코드에서 scrollTop을 0으로 리셋하지 않도록)
  window.__scrollToItemInProgress = true;

  // 면적에서 areaName만 추출 (예: "80B/59m²" → "80B")
  const targetAreaName = targetSize.match(/^([^\/]+)\//)?.[1] || '';

  const findInDOM = () => {
    let items = document.querySelectorAll('#articleListArea > div.item > div.item_inner');

    for (let item of items) {
      // ✅ 가격 추출 (범위 형태 처리)
      const priceEls = item.querySelectorAll('.price_line > .price');
      let itemPrice = '';
      let minPrice = 0, maxPrice = 0;
      let isPriceRange = false;

      if (priceEls.length >= 2) {
        // 범위 형태 (예: "24억 5,000" ~ "25억")
        isPriceRange = true;
        itemPrice = priceEls[0].textContent.trim(); // 표시용
        minPrice = parsePriceToDomValue(priceEls[0].textContent);
        maxPrice = parsePriceToDomValue(priceEls[1].textContent.replace('~', '').trim());
        //console.log(`  범위 가격 감지: ${minPrice} ~ ${maxPrice}`);
      } else if (priceEls.length === 1) {
        // 단일 가격
        itemPrice = priceEls[0].textContent.trim();
      }

      // 면적 추출 (예: "80B/59m²")
      const specEl = item.querySelector('.info_area .spec');
      const itemSpec = specEl ? specEl.textContent.trim() : '';
      const itemAreaName = itemSpec.match(/^([^\/]+)\//)?.[1] || '';

      // 층 추출 (예: "6/13층" → "6", "중/25층" → "중")
      // 쉼표나 "/"가 아닌 문자만 캡처 (면적 정보 제외)
      const floorMatch = itemSpec.match(/([^\/,]+)\/(\d+)층/);
      const itemFloor = floorMatch ? floorMatch[1].trim() : '';

      // 가격을 숫자로 변환 (API와 동일 방식: "26억 5,000" → 265000)
      let parsedItemPrice = 0;
      if (isPriceRange) {
        parsedItemPrice = minPrice; // 범위의 최소값 사용
      } else {
        parsedItemPrice = parsePriceToDomValue(itemPrice);
      }

      // 가격 일치 확인 (범위인 경우 min/max로 판단)
      let priceMatches = false;
      if (isPriceRange) {
        priceMatches = targetNumericPrice >= minPrice && targetNumericPrice <= maxPrice;
        //console.log(`  범위 비교: ${targetNumericPrice} in [${minPrice}, ${maxPrice}]? ${priceMatches}`);
      } else {
        priceMatches = parsedItemPrice === targetNumericPrice;
        //console.log(`  단일 비교: price=${parsedItemPrice} vs ${targetNumericPrice}`);
      }

      //console.log(`  비교: ${priceMatches ? '✓' : '✗'} price, area="${itemAreaName}" vs "${targetAreaName}", floor="${itemFloor}" vs "${targetFloor}"`);

      // 가격, 면적 일치 확인. floor이 없으면 floor 비교 건너뛰기
      const floorMatches = !itemFloor || !targetFloor || itemFloor === targetFloor;
      if (priceMatches && itemAreaName === targetAreaName && floorMatches) {
        // console.log(`✅ DOM에서 발견: ${itemPrice} / ${itemAreaName}${itemFloor ? '/' + itemFloor + '층' : ''}`);
        return item;
      }
    }
    return null;
  };

  // ✅ DOM 가격 파싱 헬퍼 함수 (범위 형태 처리)
  const parsePriceToDomValue = (priceStr) => {
    priceStr = priceStr.replace(/\s/g, '').replace(/,/g, '').replace('~', '');
    if (priceStr.includes('억')) {
      const parts = priceStr.split('억');
      return parseInt(parts[0]) * 10000 + (parseInt(parts[1]) || 0);
    } else if (priceStr.includes('만원')) {
      return parseInt(priceStr.replace(/만원|원/g, ''));
    } else {
      return parseInt(priceStr.replace(/원/g, '')) || 0;
    }
  };

  // 1단계: 현재 DOM에서 먼저 찾기
  let targetItem = findInDOM();
  if (targetItem) {
    // console.log(`✅ 현재 DOM에서 발견: ${targetNumericPrice}`);
    targetItem.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' });

    // ✅ 스크롤 완료 후에 테두리 표시
    addBorderAfterScroll(targetItem);

    // ✅ 1500ms 후 플래그 해제 및 테두리 제거
    setTimeout(() => {
      window.__scrollToItemInProgress = false;
      targetItem.style.border = 'none';
    }, 1500);
    return;
  }

  // console.log(`⚠️ 현재 DOM에서 미발견: ${targetNumericPrice}. 전체 아이템 로드 후 검색...`);

  // 2단계: 스크롤을 끝까지 내려서 모든 아이템 로드
  (async () => {
    const scrolled = await scrollToBottom();

    if (!scrolled) {
      window.__scrollToItemInProgress = false;
      showNotificationPopup('아이템 목록을 찾을 수 없습니다.');
      return;
    }

    // 3단계: 전체 로드 후 다시 검색
    // console.log(`🔍 전체 아이템 로드 완료. 재검색 시작...`);
    targetItem = findInDOM();

    if (targetItem) {
      // console.log(`✅ 전체 로드 후 발견: ${targetNumericPrice}`);
      targetItem.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' });

      // ✅ 스크롤 완료 후에 테두리 표시
      addBorderAfterScroll(targetItem);

      // ✅ 1500ms 후 플래그 해제 및 테두리 제거
      setTimeout(() => {
        window.__scrollToItemInProgress = false;
        targetItem.style.border = 'none';
      }, 1500);
    } else {
      // console.error(`❌ 전체 로드 후에도 매물을 찾을 수 없음: ${targetNumericPrice} / ${targetAreaName}`);
      window.__scrollToItemInProgress = false;
      showNotificationPopup(`해당 매물을 찾을 수 없습니다.\n(${targetNumericPrice} / ${targetAreaName})`);
    }
  })();
}

function addBorderAfterScroll(targetItem) {
  // ✅ scrollIntoView 애니메이션 완료 후 테두리 표시 (auto scroll은 낱 100ms)
  setTimeout(() => {
    targetItem.style.border = '3px solid red';
  }, 100);
}

function showNotificationPopup(message) {
  const popup = document.createElement('div');
  popup.style.position = 'fixed';
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.padding = '20px 30px';
  popup.style.backgroundColor = '#333';
  popup.style.color = 'white';
  popup.style.borderRadius = '8px';
  popup.style.fontSize = '16px';
  popup.style.fontWeight = 'bold';
  popup.style.zIndex = '10001';
  popup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
  popup.style.textAlign = 'center';
  popup.style.minWidth = '300px';
  popup.textContent = message;

  document.body.appendChild(popup);

  // ✅ 1초 후 자동 제거
  setTimeout(() => {
    popup.remove();
  }, 1000);
}

function sortOnKeys(dict) {
  var tempDict = {};

  let sorted = jQuery(
    '#complexOverviewList > div.list_contents > div.list_fixed > div.list_filter > div > div:nth-child(2) > div > div > ul > li label.checkbox_label'
  ).map((idx, item) => item.innerText.replace('㎡', ''));

  let keys = Object.keys(dict);

  sorted.map((idx, item) => {
    keys.map((key) => {
      // ✅ "84B/115㎡" 형식에서 "/" 이전의 areaName을 추출해서 UI 레이블과 매칭
      const keyAreaName = key.match(/^([^\/]+)\//)?.[1];
      if (keyAreaName && keyAreaName === item) {
        tempDict[key] = dict[key];
      }
    });
  });

  // ✅ 폴백: 정렬 결과가 비어있으면 원본 dict 반환 (UI가 로드안됐을 때 대비)
  if (Object.keys(tempDict).length === 0) {
    // console.log('⚠️ sortOnKeys 정렬 실패 (UI가 로드되지 않았을 수 있음), 원본 dict 반환:', Object.keys(dict));
    return dict;
  }

  return tempDict;
}

var g_lastSelectedApt = '';
let g_cachedResult = null;
window.__lastCacheKey = null;  // ✅ 필터값 포함 캐시 키

function addObserverIfDesiredNodeAvailable() {
  var target = document.getElementsByClassName('map_wrap')[0];
  var inDebounce;
  if (!target) return;

  for (let key in validityCheck) {
    let obj = validityCheck[key];
    if (!obj.isCreate) createBox(key, obj.type);
  }


  jQuery(document).on('click', (e) => {
    if (jQuery(e.target).parents('a.item_link').length > 0 || e.target.className === 'complex_link')
      setTimeout(() => { jQuery('.detail_panel').css('left', '406px'); }, 500);
  });

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      [].slice.call(mutation.addedNodes).forEach(function (addedNode) {
        if (!addedNode.classList || (!addedNode.classList.contains('infinite_scroll') && !addedNode.classList.contains('item'))) {
          return;
        }

        if (!document.querySelector('#complexTitle')) return;

        if (document.querySelector('#complexTitle').innerText != g_lastSelectedApt) {
          document
            .querySelectorAll('#summaryInfo > div.complex_summary_info > div.complex_trade_wrap > div > dl')
            .forEach(function (ele) {
              if (ele.hasAttribute('added')) ele.remove();
            });
          g_lastSelectedApt = document.querySelector('#complexTitle').innerText;

          // ✅ 단지 변경 시 캐시 초기화
          g_cachedResult = null;
          window.__lastCacheKey = null;
        }

        // ✅ API 기반으로 변경: 스크롤 제어 불필요
        var runFnc = function () {
          updateListAndScrollTop();
        };

        if (inDebounce) clearTimeout(inDebounce);
        inDebounce = setTimeout(runFnc, 500);
      });
    });
  });

  observer.observe(target, { childList: true, subtree: true });
}

async function updateListAndScrollTop() {
  const startTime = performance.now();
  // console.log('🔄 updateListAndScrollTop() 시작');

  // ✅ 현재 캐시 키를 미리 저장 (addInfoToScreen 호출 판단용)
  const currentComplexId = getComplexNoFromUrl();
  const previousCacheKey = window.__lastCacheKey;
  const currentCacheKey = getCacheKey(currentComplexId);

  let result = await getPrice_WeolbuStandard();
  const afterAPI = performance.now();
  // console.log(`📦 getPrice_WeolbuStandard() 완료 (${(afterAPI-startTime).toFixed(0)}ms)`);

  result = sortOnKeys(result);
  const afterSort = performance.now();
  // console.log(`📋 sortOnKeys() 완료 (누적: ${(afterSort-startTime).toFixed(0)}ms)`);

  // ✅ 캐시 키 변경 또는 screenInfo가 DOM에 없으면 새로 생성
  const screenInfoInDOM = document.querySelector('.complex_price_info');
  const needsRefresh = previousCacheKey !== currentCacheKey || !screenInfoInDOM;

  if (needsRefresh) {
    if (previousCacheKey !== currentCacheKey) {
      // console.log(`✅ 캐시 키 변경 감지: addInfoToScreen() 호출`);
    } else {
      // console.log(`⚠️ screenInfo가 DOM에서 제거됨: 재생성`);
    }
    await addInfoToScreen(result);
    const afterScreen = performance.now();
    // console.log(`✅ addInfoToScreen() 완료 (누적: ${(afterScreen-startTime).toFixed(0)}ms)`);

    // 새 screenInfo에 호버 시스템 재적용
    window.__pricePanelHoverInstalled = false;
    installHoverRevealOnce();
  } else {
    // console.log(`📦 캐시 키 동일 + screenInfo 존재: addInfoToScreen() 스킵`);
  }

  const endTime = performance.now();
  // console.log(`🎁 완전히 준비됨 (총: ${(endTime-startTime).toFixed(0)}ms)`);
}

// ✅ 정렬 버튼 확인 및 변경 함수 (panel_group--upper 생성 시 자동 호출)
function ensurePriceSortingSelected() {
  let sortingCheckInterval = setInterval(() => {
    const rankingButton = document.querySelector('a.sorting_type[data-nclk="TAA.rank"]');
    const priceButton = document.querySelector('a.sorting_type[data-nclk="TAA.price"]');

    if (rankingButton && priceButton) {
      const isRankingSelected = rankingButton.getAttribute('aria-pressed') === 'true';
      const isPriceSelected = priceButton.getAttribute('aria-pressed') === 'true';

      // console.log(`🔍 정렬 상태 - 랭킹: ${isRankingSelected}, 가격: ${isPriceSelected}`);

      if (isRankingSelected && !isPriceSelected) {
        priceButton.click();
        // console.log('✅ 랭킹순에서 가격순으로 변경됨');
      } else if (isRankingSelected && isPriceSelected) {
        // console.log('⚠️ 랭킹이 선택되었지만 가격순도 선택됨 (이상한 상태)');
      } else if (!isRankingSelected && isPriceSelected) {
        // console.log('✅ 이미 가격순이 선택됨 (아무것도 하지 않음)');
      }
      clearInterval(sortingCheckInterval);
    }
  }, 100);
}


function monitorPanelGroupCreation() {
  const observedSet = new WeakSet();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList.contains('panel_group--upper') && !observedSet.has(node)) {
          observedSet.add(node);

          // ✅ panel_group--upper이 생성되면 정렬 자동 변경 실행 (한 번만)
          ensurePriceSortingSelected();
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });


}

monitorPanelGroupCreation();
addObserverIfDesiredNodeAvailable();
})();
