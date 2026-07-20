// [확장 이식] 원본: [루시퍼홍]아실 차트 가격표[실거래 바로가기][단독사용X].user.js v1.01
// greasyfork 업데이트 팝업 제거 — 웹스토어 자동 업데이트로 대체. 본문은 원본 그대로.
(async () => {
  const SCRIPT_ID = 'asil-chart-price-deal-link';
  const { enabled = {} } = await chrome.storage.sync.get('enabled');
  if (enabled[SCRIPT_ID] === false) return; // 미설정 = 켜짐
  console.log('아실 차트 가격표[실거래 바로가기][단독사용X] v1.01 (extension)');



let url = window.location.href;
//console.log("오른쪽 url : "+url);
// URLSearchParams 객체를 사용하여 URL에서 파라미터를 추출
const urlParams = new URLSearchParams(url.split('?')[1]);

// 파라미터를 출력
let v_os = urlParams.get('os');
let v_building = urlParams.get('building');
let v_apt = urlParams.get('apt');
let v_evt = urlParams.get('evt');
let v_year = urlParams.get('year');
let v_year6 = v_year ? v_year.substring(2, 4) + '.' + v_year.substring(4, 6) : null;
let v_year4 = v_year ? v_year.substring(0, 4) : null;
let v_deal = urlParams.get('deal');

/*
// 파라미터를 콘솔에 출력
console.log('os:', v_os);
console.log('building:', v_building);
console.log('apt:', v_apt);
console.log('evt:', v_evt);
console.log('year:', v_year);
console.log('year4:', v_year4);
console.log('year6:', v_year6);
console.log('deal:', v_deal);
*/
var dealLink1 = document.getElementById('deal1');
var dealLink2 = document.getElementById('deal2');
var dealLink3 = document.getElementById('deal3');

if (v_deal === "1") {
    if (dealLink2) {
        dealLink2.click();
    } else {
        console.log('Element not found');
    }

    if (dealLink3) {
        dealLink3.click();
    } else {
        console.log('Element not found');
    }

} else if (v_deal === "2") {
    if (dealLink1) {
        dealLink1.click();
    } else {
        console.log('Element not found');
    }

    if (dealLink3) {
        dealLink3.click();
    } else {
        console.log('Element not found');
    }
}

var links = document.querySelectorAll('#mCSB_1_container ul li a');
var targetText = v_evt.replace("py", "평");
//console.log(targetText);

links.forEach(function (link) {
    if (link.textContent.includes(targetText)) {
        //console.log('Found link:', link);
        // 클릭 이벤트 트리거
        link.click();
    }
});



let lastCheckedIndex = 0;


function searchyear() {
    // iframe 안의 콘텐츠에 접근
    let iframe = document.getElementById('ifrm');
    if (iframe) {
        let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        let table = iframeDoc.getElementById('tableList1');
        if (table) {
            let mmElements = table.querySelectorAll('.mm');
            let found = false;
            for (let i = lastCheckedIndex; i < mmElements.length; i++) {
                let element = mmElements[i];
                //console.log('Checking element:', element.textContent);
                if (element.textContent === v_year6) {
                    //console.log('Found matching element:', element);
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    found = true;
                    break;
                }
                lastCheckedIndex = i + 1;
            }
            if (!found) {
                //console.log('Matching element not found, calling moreList');
                if(iframeDoc.getElementById('morePriceBtn')){iframeDoc.getElementById('morePriceBtn').click()}
                setTimeout(searchyear, 1000); // 2초 후에 다시 검색
            }
        } else {
            console.log('Table not found');
        }
    }
}

// 2초 후에 searchyear 함수 실행
setTimeout(searchyear, 2000);

})();
