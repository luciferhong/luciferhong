// [확장 이식] 원본: [루시퍼홍] 네이버 부동산 중개소 다운로드.user.js v1.02 — MAIN world(페이지 컨텍스트) 실행
// greasyfork 업데이트 팝업 제거. 토글 플래그는 common/gate.js가 localStorage로 미러링.
(() => {
  const SCRIPT_ID = 'naver-agent-download';
  try {
    const __en = JSON.parse(localStorage.getItem('__luciferhongExtEnabled') || '{}');
    if (__en[SCRIPT_ID] === false) return; // 미설정 = 켜짐
  } catch (e) {}
  console.log('네이버 부동산 중개소 다운로드 v1.02 (extension)');



(function () {

    // 토큰을 비동기적으로 가져오는 함수
    async function fetchToken() {
        const tokenUrl = "https://new.land.naver.com/complexes";
        const response = await fetch(tokenUrl, { method: 'GET' });
        const text = await response.text();
        const tokenStartIndex = text.indexOf('token') + 17;
        const tokenEndIndex = text.indexOf('"', tokenStartIndex);
        const token = text.substring(tokenStartIndex, tokenEndIndex);
        return `Bearer ${token}`;
    }

    // 1초 지연 함수
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 요청 감지 활성화 상태 변수
    let isMonitoringEnabled = false;
    let isIntercepted = false;

    // 기존 XMLHttpRequest 메서드 백업
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    // 버튼 추가
    const newDiv2 = document.createElement("div");
    newDiv2.className = "filter_group filter_group--size";
    newDiv2.style.margin = "6px 10px 0px 0px";
    newDiv2.style.display = "inline-block";

    const realtorBtn = document.createElement("button");
    realtorBtn.innerText = "중개소 내려받기";
    realtorBtn.id = "realtorBtn";
    realtorBtn.style.width = "100px";
    realtorBtn.style.height = "20px";
    realtorBtn.style.color = "white";
    realtorBtn.style.backgroundColor = "#FF0000";

    const parentDiv = document.querySelector("#filter > div");
    newDiv2.appendChild(realtorBtn);
    parentDiv.appendChild(newDiv2);
    console.log("버튼 추가 완료");

    // 엑셀 다운로드 함수
    function downloadExcel(data) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.sheet_add_aoa(worksheet, [["중개소", "유선", "무선", "주소"]], { origin: "A1" });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Realtors");
        XLSX.writeFile(workbook, "네이버부동산 중개소.xlsx");
    }

    // 버튼 클릭 이벤트 리스너
    realtorBtn.addEventListener('click', async function () {
        // 요청 모니터링 활성화 여부 전환
        isMonitoringEnabled = !isMonitoringEnabled;
        console.log(`요청 모니터링: ${isMonitoringEnabled ? '활성화' : '비활성화'}`);

        if (isMonitoringEnabled && !isIntercepted) {
            interceptRequests(); // 요청 가로채기 설정
            isIntercepted = true;
            // 지도 중개사 마커 상태 토글
            const agentButton = document.querySelector('a.map_control--agent');
            if (agentButton) {
                const ariaPressed = agentButton.getAttribute('aria-pressed');
                if (ariaPressed === 'true') {
                    agentButton.click(); // 마커 끄기
                    console.log("중개사 마커 끄기");
                    await sleep(1000);
                    agentButton.click(); // 마커 켜기
                } else {
                    agentButton.click(); // 마커 켜기
                    console.log("중개사 마커 켜기");
                }
            }
        } else if (!isMonitoringEnabled) {
            // XMLHttpRequest 원본 복구 (모니터링 중단)
            XMLHttpRequest.prototype.open = originalOpen;
            XMLHttpRequest.prototype.send = originalSend;
            console.log('요청 모니터링 중단');
            isIntercepted = false;
        }


    });

    // XMLHttpRequest 가로채기 함수
    function interceptRequests() {
        // 요청 정보를 저장할 Map
        const requestMap = new WeakMap();

        // XMLHttpRequest open 메서드 재정의
        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            if (isMonitoringEnabled && url.startsWith('/api/realtors/detailed-clusters?')) { // 활성화 상태에서만 동작
                requestMap.set(this, { method, url });
            }
            return originalOpen.apply(this, [method, url, ...rest]);
        };

        // XMLHttpRequest send 메서드 재정의
        XMLHttpRequest.prototype.send = function (body) {
            if (isMonitoringEnabled) { // 활성화 상태에서만 동작
                this.addEventListener('load', async function () {
                    const requestInfo = requestMap.get(this);
                    const requestUrl = requestInfo?.url || '';

                    if (isMonitoringEnabled && requestUrl.startsWith('/api/realtors/detailed-clusters?')) {
                        console.log(`[Intercepted XHR Request] URL: ${requestUrl}`);
                        showPopupMessage("처리 중입니다.\n\n중개소가 많을 경우 시간이 소요될 수 있습니다.");

                        try {
                            // 응답 데이터 파싱
                            const data = JSON.parse(this.responseText);

                            // realtorId로 상세 정보 요청
                            let extracted = [];
                            let token = await fetchToken();
                            for (const item of data) {
                                for (const realtor of item.realtors) {
                                    const response = await fetch(`https://new.land.naver.com/api/realtors/${realtor.realtorId}`, {
                                        headers: {
                                            "accept": "*/*",
                                            "authorization": token
                                        },
                                        method: "GET"
                                    });
                                    const detail = await response.json();
                                    const realtorDetail = detail.realtor;

                                    extracted.push({
                                        중개소: realtorDetail.realtorName,
                                        유선: realtorDetail.representativeTelNo,
                                        무선: realtorDetail.cellPhoneNo,
                                        주소: realtorDetail.address,
                                        매매 :realtorDetail.dealCount,
                                        전세 :realtorDetail.leaseCount,
                                        월세 :realtorDetail.rentCount
                                    });
                                    sleep(500);
                                }
                            }

                            downloadExcel(extracted);
                            hidePopupMessage();
                            document.querySelector('#realtorBtn').click();
                        } catch (error) {
                            console.error('XHR 처리 중 오류 발생:', error);
                        }
                    }
                });
            }
            return originalSend.apply(this, [body]);
        };
    }



     // 팝업 메시지 표시 함수
    function showPopupMessage(message) {
        let popup = document.querySelector('#download-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'download-popup';
            popup.style.position = 'fixed';
            popup.style.top = '50%';
            popup.style.left = '50%';
            popup.style.transform = 'translate(-50%, -50%)';
            popup.style.width = '500px';
            popup.style.height = '150px';
            popup.style.display = 'flex';
            popup.style.alignItems = 'center';
            popup.style.justifyContent = 'center';
            popup.style.textAlign = 'center';
            popup.style.padding = '20px';
            popup.style.backgroundColor = '#000';
            popup.style.color = '#fff';
            popup.style.fontSize = '16px';
            popup.style.borderRadius = '8px';
            popup.style.zIndex = '9999';
            popup.style.lineHeight = '1.5';
            document.body.appendChild(popup);
        }
        popup.textContent = message;
        popup.innerHTML = message.replace(/\n/g, '<br>'); // 줄바꿈 지원
        popup.style.display = 'block';
    }

    function hidePopupMessage() {
        const popup = document.querySelector('#download-popup');
        if (popup) popup.style.display = 'none';
    }


})();


/* 복사 버튼 추가 */
(function () {
  const observer = new MutationObserver(() => {
    const target = document.querySelector('.info_agent_title');
    if (!target || document.querySelector('#btnCopyAgencyInfo')) return;

    const btn = document.createElement('button');
    btn.textContent = '📋 복사';
    btn.id = 'btnCopyAgencyInfo';
    btn.style.marginLeft = '10px';
    btn.style.padding = '4px 8px';
    btn.style.border = '1px solid #ccc';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '12px';
    target.appendChild(btn);

    btn.addEventListener('click', () => {
      try {
        const name = document.querySelector('.info_agent_title .title')?.innerText.trim() || '';
        const rep = document.querySelector('.info_agent dd.text')?.childNodes[0]?.textContent.trim() || '';
        const addrFull = document.querySelector('.tooltip_site')?.textContent.trim() || '';

        const addrParts = addrFull.split(' ');
        const sido = addrParts[0] || '';
        const sigungu = addrParts[1] || '';
        const eupmyeondong = addrParts[2] || '';
        const restAddr = addrParts.slice(3).join(' ') || '';

        const phoneRaw = Array.from(document.querySelectorAll('.info_agent--call dd.text--number'))
          .map(dd => dd.textContent.trim().replace(/\s+/g, ''))
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .join('/')
          .split('/');

        const phone1 = phoneRaw[0] || '';
        const phone2 = phoneRaw[1] || '';

        const 매매 = document.querySelector('.article_quantity .article_link:nth-child(1) .count')?.textContent.trim() || '0';
        const 전세 = document.querySelector('.article_quantity .article_link:nth-child(2) .count')?.textContent.trim() || '0';
        const 월세 = document.querySelector('.article_quantity .article_link:nth-child(3) .count')?.textContent.trim() || '0';

        const result = [
          name,
          phone1,
          phone2,
          addrFull,
          sido,
          sigungu,
          eupmyeondong,
          restAddr,
          매매,
          전세,
          월세
        ].join('\t');

        navigator.clipboard.writeText(result).then(() => {
         // alert('📋 클립보드에 복사됨:\n\n' + result);
        });
      } catch (e) {
        alert('❌ 복사 중 오류: ' + e.message);
      }
    });

    console.log('✅ 복사 버튼 생성됨');
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();


})();
