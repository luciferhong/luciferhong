// [확장 이식] 원본: [루시퍼홍] 아실 중개소 연락처 다운로드.user.js v1.01 — MAIN world(페이지 컨텍스트) 실행
// greasyfork 업데이트 팝업 제거. 토글 플래그는 common/gate.js가 localStorage로 미러링.
(() => {
  const SCRIPT_ID = 'asil-agent-contact-download';
  try {
    const __en = JSON.parse(localStorage.getItem('__luciferhongExtEnabled') || '{}');
    if (__en[SCRIPT_ID] === false) return; // 미설정 = 켜짐
  } catch (e) {}
  console.log('아실 중개소 연락처 다운로드 v1.01 (extension)');

  // [확장 이식] 아실 UI(#filter)가 준비된 뒤 본문 실행 (조기 주입·#filter 없는 iframe 대응)
  const __run = () => {



let agencyDownloadBtn = `<div class="filter_item" id="agencyDownload"><a href="#" class="filter_btn" id="agencyDownload"><i></i>중개소 다운로드</a></div>`;



jQuery('#filter > div.filter_scroll > div').append(agencyDownloadBtn);



document.getElementById('agencyDownload').addEventListener('click', function(event) {
    downloadStart();
});


async function downloadStart(){
// Step 1: SheetJS 라이브러리 로드 — [확장 이식] 번들(vendor/xlsx)이 이미 있으므로 CDN 폴백은 부재 시에만
if (!window.XLSX) {
  const script = document.createElement('script');
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  document.head.appendChild(script);
}

// Step 2: 모든 관련 요소 찾기 (클래스 mmbrPin 사용)
const elements = Array.from(document.querySelectorAll('.mmbrPin'));

// Step 3: 부동산 ID 추출
const memberIds = elements.map(element => {
    const onclickAttr = element.getAttribute('onclick');
    if (!onclickAttr) return null;

    const match = onclickAttr.match(/clickMember\('(-?\d+)'/);
    return match ? match[1] : null;
}).filter(id => id !== null); // null 값을 필터링

console.log("Extracted Member IDs:", memberIds);
console.log(memberIds.length)
if(memberIds.length == 0){
  alert("화면에 표시된 중개소가 없습니다")
  return;
}
// Step 4: fetch 요청 보내기 및 데이터 수집
async function fetchRealEstateData(memberId) {
    try {
        const response = await fetch(`https://asil.kr/app/sale_of_member.jsp?os=pc&user=0&member=${memberId}`, {
            headers: {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "ko-KR,ko;q=0.9,zh-MO;q=0.8,zh;q=0.7,en-US;q=0.6,en;q=0.5",
                "sec-ch-ua": "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "iframe",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1"
            },
            referrer: "https://asil.kr/asil/index.jsp?1500059354",
            referrerPolicy: "strict-origin-when-cross-origin",
            method: "GET",
            mode: "cors",
            credentials: "include"
        });

        if (!response.ok) {
            console.error(`Failed to fetch data for member ID: ${memberId}`);
            return { 중개소: "Unknown", 유선: "Unknown", 무선: "Unknown" };
        }

        // 서버 응답을 ArrayBuffer로 가져옴
        const arrayBuffer = await response.arrayBuffer();

        // TextDecoder로 디코딩 (EUC-KR로 시도)
        const decoder = new TextDecoder("euc-kr");
        const decodedText = decoder.decode(arrayBuffer);

        // HTML 응답 파싱
        const parser = new DOMParser();
        const doc = parser.parseFromString(decodedText, "text/html");

        const name = doc.querySelector(".sale_of_mmbr_info .tit")?.textContent.trim() || "Unknown";
        const tel = doc.querySelector(".sale_of_mmbr_info .tel span")?.textContent.trim() || "Unknown";

        // 연락처를 / 기준으로 나눔
        const [유선, 무선] = (tel || "").split(" / ").map(t => t.trim());

        return { 중개소: name, 유선, 무선 };
    } catch (error) {
        console.error(`Error fetching data for member ID: ${memberId}`, error);
        return { 중개소: "Unknown", 유선: "Unknown", 무선: "Unknown" };
    }
}

// Step 5: 모든 부동산 ID에 대해 데이터 수집 및 출력
(async () => {
    if (memberIds.length === 0) {
        console.log("No member IDs found.");
        return;
    }

    const results = [];
    for (const memberId of memberIds) {
        const data = await fetchRealEstateData(memberId);
        if (data) {
            results.push(data);
        }
    }

    console.log("Collected Data:", results);

    // Step 6: 엑셀 데이터 생성 및 다운로드
    const worksheet = XLSX.utils.json_to_sheet(results); // JSON 데이터를 엑셀 시트로 변환

    // Step 6.1: 헤더 이름 변경
    worksheet['A1'].v = "중개소"; // A1 셀의 헤더를 "중개소"로 변경
    worksheet['B1'].v = "유선";   // B1 셀의 헤더를 "유선"으로 변경
    worksheet['C1'].v = "무선";   // C1 셀의 헤더를 "무선"으로 변경

    const workbook = XLSX.utils.book_new(); // 새로운 엑셀 워크북 생성
    XLSX.utils.book_append_sheet(workbook, worksheet, "Real Estate Data"); // 워크북에 시트 추가

    // 엑셀 파일 생성 및 다운로드
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "중개소 다운로드.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
})();

}

  }; // __run

  (function __wait(n) {
    if (window.jQuery && document.querySelector('#filter > div.filter_scroll > div')) return __run();
    if (n > 100) return; // 약 30초 후 포기
    setTimeout(() => __wait(n + 1), 300);
  })(0);
})();
