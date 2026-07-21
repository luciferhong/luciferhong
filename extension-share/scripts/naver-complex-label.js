// [확장 이식] 원본: [루시퍼홍] 네이버부동산 단지라벨 색상변경.user.js
// greasyfork 업데이트 팝업 IIFE 제거 — 웹스토어 자동 업데이트로 대체. 본문은 원본 그대로.
(async () => {
  const SCRIPT_ID = 'naver-complex-label';
  const { enabled = {} } = await chrome.storage.sync.get('enabled');
  if (enabled[SCRIPT_ID] === false) return; // 미설정 = 켜짐
  console.log('[루시퍼홍] 네이버부동산 단지라벨 색상변경 v3.32 (extension)');





async function initHoverEvent(elementId) {
    var element = document.getElementById(elementId);
    var hoverTimeout;

    if (!element) {
        console.log("Element not found:", elementId);
        return;
    }

    element.addEventListener('mouseenter', function() {
        hoverTimeout = setTimeout(async function() {

            const complexId = elementId.match(/\d+/)[0];

            if (document.querySelector('#show_aptInfo_check').checked) {
                const complexDetails = await fetchComplexDetails(complexId);
                //console.log("complexDetails :" + complexDetails);
                if (complexDetails) {
                    var titleElement = element.querySelector(".complex_title");
                    if (titleElement) {
                        //let originalTitle = titleElement.textContent.replace(/\s*\([^)]*\)\s*$/, '');
                        let originalTitle = titleElement.textContent;
                        //console.log("originalTitle :" + originalTitle);

                        const useApproveYmdFormatted = `${complexDetails.useApproveYmd.slice(2, 4)}.${complexDetails.useApproveYmd.slice(4, 6)}`;
                        const totalHouseholdCountFormatted = `${complexDetails.totalHouseholdCount}^`;

                        if (!titleElement.textContent.includes(useApproveYmdFormatted) && !titleElement.textContent.includes(totalHouseholdCountFormatted)) {
                            titleElement.textContent = `${originalTitle} (${useApproveYmdFormatted} ${totalHouseholdCountFormatted})`;
                        }
                    } else {
                        console.log("Title element not found");
                    }
                }
            } else {
                var titleElement = element.querySelector(".complex_title");
                if (titleElement) {
                    //titleElement.textContent = titleElement.textContent.replace(/\s*\([^)]*\)\s*$/, '');
                    titleElement.textContent = titleElement.textContent;
                }
            }
            if (document.querySelector('#show_area2_check').checked) {
                const result = await findLowestFloorByArea(complexId);

                const quantityElement = element.querySelector(".complex_quantity");
                const aTag = element.closest('a');

                if (aTag) {
                    originalZIndex = window.getComputedStyle(aTag).zIndex;
                    aTag.style.zIndex = (parseInt(originalZIndex, 10) + 2).toString();
                }

                if (quantityElement && aTag) {
                    const isApart8 = aTag.classList.contains('marker_complex--apart_8');
                    let textColor = isApart8 ? 'black' : '';

                    const previousResultElement = quantityElement.previousElementSibling;
                    if (previousResultElement && previousResultElement.classList.contains('price-result')) {
                        previousResultElement.remove();
                    }

                    const resultElement = document.createElement('div');
                    resultElement.classList.add('price-result');
                    resultElement.innerHTML = `<span style="color:${textColor}; font-size: 12px;">${result}</span>`;
                    quantityElement.parentNode.insertBefore(resultElement, quantityElement);

                } else {
                    console.log("Quantity element or aTag not found");
                }
            }
        }, 300);
    });

    element.addEventListener('mouseleave', function() {
        clearTimeout(hoverTimeout);
    });
}

async function getPriceAll(){
    const complexIds = document.querySelectorAll('[class*="marker_complex--apart"]');

    for (const complexId of complexIds) {

        if (document.querySelector('#show_aptInfo_check').checked) {
                const complexIdNum = complexId.id.match(/\d+/)[0];
                const complexDetails = await fetchComplexDetails(complexIdNum);
                //console.log("complexDetails :" + complexDetails);
                if (complexDetails) {
                    var titleElement = complexId.querySelector(".complex_title");
                    if (titleElement) {
                        let originalTitle = titleElement.textContent.replace(/\s*\([^)]*\)\s*$/, '');
                        //console.log("originalTitle :" + originalTitle);

                        const useApproveYmdFormatted = `${complexDetails.useApproveYmd.slice(2, 4)}.${complexDetails.useApproveYmd.slice(4, 6)}`;
                        const totalHouseholdCountFormatted = `${complexDetails.totalHouseholdCount}^`;

                        if (!titleElement.textContent.includes(useApproveYmdFormatted) && !titleElement.textContent.includes(totalHouseholdCountFormatted)) {
                            titleElement.textContent = `${originalTitle} (${useApproveYmdFormatted} ${totalHouseholdCountFormatted})`;
                        }
                    } else {
                        console.log("Title element not found");
                    }
                }
            } else {
                var titleElement = complexId.querySelector(".complex_title");
                if (titleElement) {
                    titleElement.textContent = titleElement.textContent.replace(/\s*\([^)]*\)\s*$/, '');
                }
            }

        const result = await findLowestFloorByArea(complexId.id);

        console.log("Original elementId:", complexId);

        const quantityElement = complexId.querySelector(".complex_quantity");
        const aTag = complexId.closest('a');

        if (aTag) {
            originalZIndex = window.getComputedStyle(aTag).zIndex;
            aTag.style.zIndex = (parseInt(originalZIndex, 10) + 2).toString();
        }

        if (quantityElement && aTag) {
            const isApart8 = aTag.classList.contains('marker_complex--apart_8');
            let textColor = isApart8 ? 'black' : '';

            const previousResultElement = quantityElement.previousElementSibling;
            if (previousResultElement && previousResultElement.classList.contains('price-result')) {
                previousResultElement.remove();
            }

            const resultElement = document.createElement('div');
            resultElement.classList.add('price-result');
            resultElement.innerHTML = `<span style="color:${textColor}; font-size: 12px;">${result}</span>`;
            quantityElement.parentNode.insertBefore(resultElement, quantityElement);

            aTag.style.width = 'auto';
            aTag.style.display = 'inline-block';
        } else {
            console.log("Quantity element or aTag not found");
        }

        execute(complexId);
    }
}

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

async function fetchComplexDetails(complexId) {
    const url = `https://new.land.naver.com/api/complexes/${complexId}?complexNo=${complexId}&initial=Y`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'accept': '*/*',
            'accept-language': 'ko-KR,ko;q=0.9,zh-MO;q=0.8,zh;q=0.7,en-US;q=0.6,en;q=0.5',
            'authorization': await fetchToken(),
            'priority': 'u=1, i',
            'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin'
        },
        'referrerPolicy': 'unsafe-url',
        'body': null,
        'method': 'GET',
        'mode': 'cors',
        'credentials': 'include'
    });

    const data = await response.json();
    if (data && data.complex) {
        return {
            useApproveYmd: data.complex.useApproveYmd,
            totalHouseholdCount: data.complex.totalHouseholdCount
        };
    }
    return null;
}

function parsePrice(priceStr) {
    let priceInManWon = 0;
    const priceParts = priceStr.split('억');

    if (priceParts.length > 1) {
        const billionPart = parseInt(priceParts[0].replace(/,/g, ''), 10) * 10000;
        const millionPart = priceParts[1] ? parseInt(priceParts[1].replace(/,/g, ''), 10) : 0;
      //console.log(millionPart)
        priceInManWon = billionPart + millionPart;
    } else {
        priceInManWon = parseInt(priceParts[0].replace(/,/g, ''), 10);
    }

    return priceInManWon;
}
function formatPrice(priceInManWon) {
    const billionPart = Math.floor(priceInManWon / 10000);
    const millionPart = priceInManWon % 10000;

    // 소수점 두 자리를 계산하되 반올림 없이 처리
    let formattedMillionPart = (millionPart / 10000).toFixed(4).slice(0, 4);
  /*
    console.log("priceInManWon : " + priceInManWon);
    console.log("billionPart : " + billionPart);
    console.log("millionPart : " + millionPart);
    console.log("formattedMillionPart (initial): " + formattedMillionPart);
  */
    // 필요 없는 소수점 0 제거
    formattedMillionPart = formattedMillionPart.replace(/\.?0+$/, '');

    //console.log(billionPart + "|" + formattedMillionPart);

    let formattedPrice = `${billionPart}${formattedMillionPart !== '0' ? '.' + formattedMillionPart.split('.')[1] : ''}억`;
    if(formattedPrice === "0억"){formattedPrice = ''}
    return formattedPrice;
}



function formatPriceWithNbsp(priceInManWon) {
    const price = formatPrice(priceInManWon);
    return price.replace(/ /g, '&nbsp;');
}

function padPrice(price) {
    const priceWithNbsp = price.replace(/ /g, '&nbsp;');
    return priceWithNbsp.padStart(10, '&nbsp;');
}

function padArea(area) {
    let paddedArea = area.toString();
    while (paddedArea.length < 4) {
        paddedArea = '&nbsp;&nbsp;' + paddedArea;
    }
    return paddedArea;
}

async function findLowestFloorByArea(complexId) {
    const urlParams = new URLSearchParams(window.location.search);
    const h = parseInt(urlParams.get('h'), 10) || 1;
    //const h = 56;
    //const i = 90;
    const i = parseInt(urlParams.get('i'), 10) || 9999;
//console.log(h, i)
    const token = await fetchToken();
    let page = 1;
    let isMoreData = true;
    let area2MinPrices = {};
    let area2MinRentPrices = {};
    let area2MatchingPrices = {};
    let area2MatchingRentPrices = {};
    let saleCounts = {};
    let rentCounts = {};

  // Fetch pyeong information and initialize getResultByPyeongName function
    const pyeongInfoResponse = await fetch(`https://new.land.naver.com/api/complexes/${parseInt(complexId, 10)}?sameAddressGroup=true`, {
        headers: {
            accept: "*/*",
            "accept-language": "ko-KR,ko;q=0.9,zh-MO;q=0.8,zh;q=0.7,en-US;q=0.6,en;q=0.5",
            authorization: token,
            "priority": "u=1, i",
            "sec-ch-ua": "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
        },
        referrerPolicy: "unsafe-url",
        body: null,
        method: "GET",
        mode: "cors",
        credentials: "include",
    });
	const pyeongInfoData = await pyeongInfoResponse.json();
	const pyeongInfoMap = pyeongInfoData.complexPyeongDetailList.reduce((acc, item) => {
		let entranceTypeSymbol = "";
		if (item.entranceType === "계단식") {
			entranceTypeSymbol = "계";
		} else if (item.entranceType === "복도식") {
			entranceTypeSymbol = "복";
		} else if (item.entranceType === "복합식") {
			entranceTypeSymbol = "합";
		} else {
			entranceTypeSymbol = item.entranceType; // 혹시 모를 다른 값 대응
		}

		const roomCnt = item.roomCnt;
		const bathroomCnt = item.bathroomCnt;
		const formattedValue = `${entranceTypeSymbol}/${roomCnt}/${bathroomCnt}`;
		acc[item.pyeongName] = formattedValue;
		return acc;
	}, {});


    function getResultByPyeongName(name) {
        return pyeongInfoMap[name] || "해당 pyeongName을 찾을 수 없습니다.";
    }








    while (isMoreData) {
        const data = await fetchArticles(token, page, complexId);

        if (data.articleList && Array.isArray(data.articleList)) {
            for (const article of data.articleList) {
                const [floorStr, highestFloorStr] = article.floorInfo.split('/');
                const floor = parseInt(floorStr, 10);

                const highestFloor = parseInt(highestFloorStr, 10);
                const area1 = parseInt(article.area1, 10);
                const area2 = article.area2;
                const areaName = article.area2+"㎡ ("+getResultByPyeongName(article.areaName) + ")";
                const priceInManWon = parsePrice(article.dealOrWarrantPrc);


                if (area1 <= i && area1 >= h) {
                    if (article.tradeTypeName === "매매" && article.cpName !== "한국공인중개사협회") {
                        if (!area2MinPrices[areaName] || priceInManWon < area2MinPrices[areaName].priceInManWon) {
                            area2MinPrices[areaName] = {
                                area2: area2,
                                priceInManWon: priceInManWon,
                                floorInfo: article.floorInfo,
                                areaName: areaName
                            };
                        }
                        if ((!isNaN(floor) && !isNaN(highestFloor) && floor > 3 && floor !== highestFloor) || (floorStr === "중" || floorStr === "고")) {
                            if (!area2MatchingPrices[areaName] || priceInManWon < area2MatchingPrices[areaName].priceInManWon) {
                                area2MatchingPrices[areaName] = {
                                    area2: area2,
                                    priceInManWon: priceInManWon,
                                    floorInfo: article.floorInfo,
                                areaName: areaName
                                };
                            }
                        }
                        saleCounts[areaName] = (saleCounts[areaName] || 0) + 1;
                    } else if (article.tradeTypeName === "전세" && article.cpName !== "한국공인중개사협회") {
                        // ① 평형별 최저 전세
                        if (!area2MinRentPrices[areaName] || priceInManWon < area2MinRentPrices[areaName].priceInManWon) {
                            area2MinRentPrices[areaName] = {
                                area2: area2,
                                priceInManWon: priceInManWon,
                                floorInfo: article.floorInfo,
                                areaName: areaName
                            };
                        }

                        // ② 중층/고층 우선 전세 (같은 가격이면 중/고층이 이기게)
                        if ((!isNaN(floor) && !isNaN(highestFloor) && floor > 3 && floor !== highestFloor) || (floorStr === "중" || floorStr === "고")) {

                            const current = area2MatchingRentPrices[areaName];

                            if (
                                !current ||
                                priceInManWon < current.priceInManWon ||
                                (
                                    priceInManWon === current.priceInManWon &&
                                    (floorStr === '중' || floorStr === '고') &&
                                    current.floorStr !== '중' &&
                                    current.floorStr !== '고'
                                )
                            ) {
                                area2MatchingRentPrices[areaName] = {
                                    area2: area2,
                                    priceInManWon: priceInManWon,
                                    floorInfo: article.floorInfo,
                                    floorStr: floorStr,  // ← 비교용으로 저장
                                    areaName: areaName
                                };
                            }
                        }

                        rentCounts[areaName] = (rentCounts[areaName] || 0) + 1;
                    }

                }
            }
        } else {
            console.log('articleList is not an array or not found');
        }

        isMoreData = data.isMoreData;
        page++;
    }

    let results = [];
    let maxWidths = {
        area2: 0,
        salePrice: 0,
        rentPrice: 0,
        gap: 0,
        floor: 0,
        count: 0
    };

    //2025-03-11 전세만 나오게 수정 중
    let allAreas = new Set([...Object.keys(area2MinPrices), ...Object.keys(area2MinRentPrices)]);
//console.log(allAreas)
    Array.from(allAreas).forEach(area2 => {
        const matchingSale = area2MatchingPrices[area2] || area2MinPrices[area2] || {}; // undefined 방지
        let matchingRent = document.querySelector('#show_jsMiddle_check').checked
            ? area2MatchingRentPrices[area2] || area2MinRentPrices[area2] || {}
            : area2MinRentPrices[area2] || {};

        if(document.querySelector('#show_jsMiddle_check').checked){
          matchingRent = area2MatchingRentPrices[area2] || area2MinRentPrices[area2];
        }else{
          matchingRent = area2MinRentPrices[area2];
        }
        const saleCount = saleCounts[area2] || 0;
        const rentCount = rentCounts[area2] || 0;

        // ✅ undefined 방지: matchingSale.area2가 undefined면 빈 문자열 '' 할당
        maxWidths.area2 = Math.max(maxWidths.area2, (matchingSale.areaName  || '정보없음').length);

        if (document.querySelector('#show_maemae_check').checked) {
            // ✅ undefined 방지: matchingSale.priceInManWon이 없으면 0 반환
            maxWidths.salePrice = Math.max(maxWidths.salePrice, matchingSale.priceInManWon ? formatPrice(matchingSale.priceInManWon).length : 0);
        }

       if (document.querySelector('#show_jeonse_check').checked) {
            // ✅ undefined 방지: matchingRent가 없을 경우 0 반환
            maxWidths.rentPrice = Math.max(
                maxWidths.rentPrice,
                matchingRent?.priceInManWon ? formatPrice(matchingRent.priceInManWon).length : 0
            );
        }

        if (document.querySelector('#show_gap_check').checked) {
            if (matchingSale?.priceInManWon !== undefined && matchingRent?.priceInManWon !== undefined) {
                const priceDifference = matchingSale.priceInManWon - matchingRent.priceInManWon;
                maxWidths.gap = Math.max(maxWidths.gap, formatPrice(priceDifference).length);
            } else {
                maxWidths.gap = Math.max(maxWidths.gap, 0); // ✅ gap 값이 없을 경우 0 처리
            }
        }


        if (document.querySelector('#show_floor_check').checked) {
            // ✅ undefined 방지: matchingSale.floorInfo가 없을 경우 빈 문자열 할당
            maxWidths.floor = Math.max(maxWidths.floor, (matchingSale.floorInfo ? matchingSale.floorInfo + '층' : '').length);
        }

        if (document.querySelector('#show_count_check').checked) {
            maxWidths.count = Math.max(maxWidths.count, (saleCount + '/' + rentCount + '개').length);
        }
    });

    const pixelSize = 12;
    Array.from(allAreas).forEach(area2 => {
      //console.log( area2MatchingPrices[area2] )
        const matchingSale = area2MatchingPrices[area2] || area2MinPrices[area2]
     //console.log( matchingSale)
        //const matchingRent = area2MatchingRentPrices[area2] || area2MinRentPrices[area2];
        let matchingRent = [];
        if(document.querySelector('#show_jsMiddle_check').checked){
          matchingRent = area2MatchingRentPrices[area2] || area2MinRentPrices[area2];
        }else{
          matchingRent = area2MinRentPrices[area2];
        }

        const saleCount = saleCounts[area2] || 0;
        const rentCount = rentCounts[area2] || 0;

        let result = '<tr>';
        result += `<td style="min-width:30px;width:${maxWidths.areaName * pixelSize}px;text-align:right;">${padArea(area2)}</td>`;



// ===== 매매가 =====
if (document.querySelector('#show_maemae_check').checked) {
    let salePriceHtml = '';

    if (matchingSale?.priceInManWon) {
        const salePriceText = formatPrice(matchingSale.priceInManWon);

        // 🔻 저층 여부 판단
        let isLowFloor = false;
        if (matchingSale.floorInfo) {
            const floorStr = matchingSale.floorInfo.split('/')[0];
            const floorNum = parseInt(floorStr, 10);

            if ((!isNaN(floorNum) && floorNum <= 3) || floorStr === '저') {
                isLowFloor = true;
            }
        }

        // 🔻 저층이면 (저) 추가
        salePriceHtml = isLowFloor
            ? `(저)${salePriceText}`
            : salePriceText;
    }

    // 🔻 (저) 포함 여부에 따라 너비 가변
    const hasLowTag = salePriceHtml.includes('(저)');
    const baseWidthPx = maxWidths.salePrice * pixelSize;  // 기존 계산값
    const cellMinWidth = hasLowTag ? 80 : 55;             // min-width 차등
    const cellWidth    = hasLowTag ? baseWidthPx + 20 : baseWidthPx; // 여유 폭

    result += `<td style="min-width:${cellMinWidth}px;width:${cellWidth}px;text-align:right;">${salePriceHtml}</td>`;
}






        // ===== 전세가 =====
// ===== 전세가 =====
if (document.querySelector('#show_jeonse_check').checked) {
    let jeonsePriceHtml = '';

    if (matchingRent && matchingRent.priceInManWon) {
        const jeonsePriceText = formatPrice(matchingRent.priceInManWon);

        // 🔻 저층 여부 판단
        let isLowFloor = false;
        if (matchingRent.floorInfo) {
            const floorStr = matchingRent.floorInfo.split('/')[0];
            const floorNum = parseInt(floorStr, 10);

            if ((!isNaN(floorNum) && floorNum <= 3) || floorStr === '저') {
                isLowFloor = true;
            }
        }

        // 🔻 저층이면 (저) 추가
        jeonsePriceHtml = isLowFloor
            ? `(저)${jeonsePriceText}`   // 앞에 붙이든, 뒤에 붙이든 취향대로
            : jeonsePriceText;
    }

    // 🔻 (저) 포함 여부에 따라 너비 가변
    const hasLowTag = jeonsePriceHtml.includes('(저)');
    const baseWidthPx = maxWidths.rentPrice * pixelSize;
    const cellMinWidth = hasLowTag ? 80 : 55;
    const cellWidth    = hasLowTag ? baseWidthPx + 20 : baseWidthPx;

    result += `<td style="min-width:${cellMinWidth}px;width:${cellWidth}px;text-align:right;">${jeonsePriceHtml}</td>`;
}




        if (document.querySelector('#show_gap_check').checked) {
            let gapText = "";

            if (matchingSale?.priceInManWon != null && matchingRent?.priceInManWon != null) {
                const priceDifference = matchingSale.priceInManWon - matchingRent.priceInManWon;
                gapText = formatPrice(priceDifference);
            }

            result += `
        <td style="min-width:55px;width:${maxWidths.gap * pixelSize}px;text-align:right;">
            ${gapText}
        </td>
    `;
        }

        if (document.querySelector('#show_floor_check').checked) {
            const floorText = matchingSale?.floorInfo ? `${matchingSale.floorInfo}층` : "";

            console.log(matchingSale);

            result += `
        <td style="min-width:50px;width:${maxWidths.floor * pixelSize}px;text-align:right;">
            ${floorText}
        </td>
    `;
        }


        if (document.querySelector('#show_count_check').checked) {
            result += `<td style="min-width:50px;width:${maxWidths.count * pixelSize}px;text-align:right;">(${saleCount}/${rentCount})</td>`;
        }
        result += '</tr>';

        results.push(result);
    });

    // 면적순으로 정렬하기 위해 정렬 로직 추가
    results.sort((a, b) => {
        // 각 문자열에서 면적 부분 추출 (예: "49㎡", "57㎡" 등)
        const areaA = parseInt(a.match(/(\d+)㎡/)[1]);
        const areaB = parseInt(b.match(/(\d+)㎡/)[1]);

        // 면적을 기준으로 오름차순 정렬
        return areaA - areaB;
    });

    if (Object.keys(area2MinPrices).length > 0) {
        return `<table><tbody>${results.join('')}</tbody></table>`;
    } else {
        return "매매없음";
    }
}



//////////////////////////////


/*
window.addEventListener("load", function() {
	executeAll();
});
*/
var svgArray = [];
var selectedSvg = "";
var targetElement = "";
var targetElementX = ""
var targetElementY = ""
var isRightClicking = false;


function drawBorder(){
	if(document.querySelector('#show_schoolRange_check').checked){
		pushSvgArray();
		//console.log("pushSvgArray 완료");


		var svgElements = document.querySelectorAll('svg');



		//var svgElements1 = Array.from(document.querySelectorAll('svg'));
		for (let i = 0; i < svgElements.length; i++) {
			 //svgElements[i].style.display = "none";
		}



		// SVG 요소를 가져오기 위해 쿼리 선택자를 사용하여 문서에서 모든 SVG 요소를 가져옵니다.
		svgArray.forEach(function(svgElement) {
			document.querySelector("#complex_map > div:nth-child(1) > div > div:nth-child(1) > div:nth-child(3) > div:nth-child(1)").appendChild(svgElement);
		});
		//console.log("drawBorder 완료");
	}
}

function pushSvgArray() {

	// SVG 요소를 가져오기 위해 쿼리 선택자를 사용하여 문서에서 모든 SVG 요소를 가져옵니다.
	const svgElements = document.querySelectorAll('svg');

	// 각 SVG 요소를 반복하여 하위의 path 요소를 찾고 해당 요소의 fill 속성을 확인합니다.
	svgElements.forEach(svg => {
		const pathElements = svg.querySelectorAll('path');

		// path 요소를 반복하여 fill 속성을 확인합니다.
		pathElements.forEach(path => {
			// 요소의 style 속성을 가져와서 fill 값을 확인합니다.
			const fillValue = path.style.fill;

			// 만약 fill 속성 값이 "#00C73C"와 같다면 해당 요소를 필터링하고 원하는 작업을 수행합니다.
			if (fillValue === 'rgb(0, 199, 60)' || fillValue === '#00C73C') { // fillValue가 rgb 형식으로 반환될 수 있으므로 둘 다 확인합니다.

				const clone = svg.cloneNode(true);
				var svgNamespace = svg.namespaceURI;
				clone.setAttribute('xmlns', svgNamespace);


				// 중복을 확인하여 추가하는 로직 추가
				if (!svgArray.some(element => element.innerHTML === clone.innerHTML)) {
					svgArray.push(clone);

					clone.addEventListener('click', function() {

						var clickedButton = event.button;
						// 클릭한 마우스 버튼에 따라 작업을 수행합니다.
						if (clickedButton === 0) {
							// 왼쪽 버튼을 클릭한 경우
							selectedSvg = clone;
						}else if (clickedButton === 2) {
							// 오른쪽 버튼을 클릭한 경우
							// 오른쪽 버튼에 따른 작업 수행

						}
					});

				}
			}
		});
	});
	//console.log(svgArray);
}

document.addEventListener('keydown', function(event) {

	if (event.key === 'Delete') {
		if(selectedSvg !== ""){


			const existingCloneIndex = svgArray.findIndex(element => element.innerHTML === selectedSvg.innerHTML);

				//const existingClone = svgArray.splice(existingCloneIndex, 1)[0];
				//console.log(existingClone);

            // 선택된 SVG 요소를 배열에서 제거합니다.
				svgArray.splice(existingCloneIndex, 1);
            // 화면에서 선택된 SVG 요소를 숨깁니다.
				console.log(selectedSvg);
				//selectedSvg.style.display = 'none';
				selectedSvg.parentNode.removeChild(selectedSvg);
				selectedSvg = ""; // 이 부분은 필요 없어집니다.
				//console.log(svgArray);
				// 모든 클론이 삭제되었으므로 svgElement도 빈 문자열로 설정합니다.
				//svgArray = [];

		}
	}
});


// 키보드 이벤트 리스너를 등록합니다.
document.addEventListener('keydown', function(event) {

	if(isRightClicking){

		var complexElement = document.getElementById(targetElement)
		// 이동 거리를 지정합니다.
		const moveDistance = 10; // 이동 거리를 조정할 수 있습니다.

		// 왼쪽으로 이동
		if (event.key === 'a' || event.key === 'A' || event.key === 'ㅁ') {
			complexElement.style.left = parseInt(complexElement.style.left) - moveDistance + 'px';
		}
		// 오른쪽으로 이동
		else if (event.key === 'd' || event.key === 'D' || event.key === 'ㅇ') {
			complexElement.style.left = parseInt(complexElement.style.left) + moveDistance + 'px';
		}
		// 위로 이동
		else if (event.key === 'w' || event.key === 'W' || event.key === 'ㅈ') {
			complexElement.style.top = parseInt(complexElement.style.top) - moveDistance + 'px';
		}
		// 아래로 이동
		else if (event.key === 's' || event.key === 'S' || event.key === 'ㄴ') {
			complexElement.style.top = parseInt(complexElement.style.top) + moveDistance + 'px';
		}
		else if (event.key === 'Escape') {
			isRightClicking = false;
		}
		else if (event.key === 'Delete') {
        // complexElement를 화면에서 삭제합니다.
			//console.log("complexElement :"+complexElement);
			 complexElement.style.display = 'none';
			isRightClicking = false;
			targetElement = "";
		}
	}
});


function labelMovement(complexId){
	//console.log("complexId :"+complexId);
	var complexElement = document.getElementById(complexId);
	complexElement.addEventListener("mouseup", function(e) {
		if (e.button === 2) { // 우클릭일 때

			isRightClicking = true; // 우클릭 플래그를 true로 설정
			//console.log("isRightClicking :"+isRightClicking);
			targetElement = complexId;
			// 우클릭한 위치를 저장
			targetElementX = e.pageX - complexElement.offsetLeft;
			targetElementY = e.pageY - complexElement.offsetTop;

		}
	});
}


function saveCheckboxStateToLocalStorage() {
    const checkboxes = document.querySelectorAll('.checkbox_input');
    checkboxes.forEach((checkbox) => {
        localStorage.setItem(checkbox.id, checkbox.checked);
    });
}

function loadCheckboxStateFromLocalStorage() {
    const checkboxes = document.querySelectorAll('.checkbox_input');
    checkboxes.forEach((checkbox) => {
        const storedValue = localStorage.getItem(checkbox.id);
        if (storedValue !== null) {
            checkbox.checked = storedValue === 'true';
        }
    });
}

// 이벤트 리스너 추가
function attachCheckboxListeners() {
    const checkboxes = document.querySelectorAll('.checkbox_input');
    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', saveCheckboxStateToLocalStorage);
    });
}



async function add_price_checkbox(){

    var newDiv = document.createElement("div");
    newDiv.className = "filter_group filter_group--size";
    newDiv.style.margin = "6px 10px 0px 0px";
    newDiv.style.display = "line-block";

    var detailOptionDiv = document.createElement("div");
    detailOptionDiv.id = "detailOptionDiv";
    detailOptionDiv.style.display = "none";

    var emptySpace = document.createElement("div");
    emptySpace.className = "empty-space";
    emptySpace.style.width = "100px";
    emptySpace.style.height = "20px";
    emptySpace.style.backgroundColor = "transparent";

    var label_margin1 = document.createElement("label");
    label_margin1.textContent = "     ";
    label_margin1.setAttribute("for", "margin");
    label_margin1.className = "checkbox_label";
    label_margin1.style.width = "30px";
    label_margin1.style.visibility = "hidden";

    var label_margin2 = document.createElement("label");
    label_margin2.textContent = "     ";
    label_margin2.setAttribute("for", "margin");
    label_margin2.className = "checkbox_label";
    label_margin2.style.width = "30px";
    label_margin2.style.visibility = "hidden";

    var label_margin3 = document.createElement("label");
    label_margin3.textContent = "     ";
    label_margin3.setAttribute("for", "margin");
    label_margin3.className = "checkbox_label";
    label_margin3.style.width = "10px";
    label_margin3.style.visibility = "hidden";

    var checkboxInput1 = document.createElement("input");
    checkboxInput1.type = "checkbox";
    checkboxInput1.id = "show_price_check";
    checkboxInput1.className = "checkbox_input";
    //checkboxInput1.checked = true;

    var label1 = document.createElement("label");
    label1.textContent = "가격 표시";
    label1.setAttribute("for", "show_price_check");
    label1.className = "checkbox_label";
    label1.style.width = "110px";

    var checkboxInput5 = document.createElement("input");
    checkboxInput5.type = "checkbox";
    checkboxInput5.id = "show_size_check";
    checkboxInput5.className = "checkbox_input";
    //checkboxInput5.checked = true;

    var label5 = document.createElement("label");
    label5.textContent = "사이즈 표시";
    label5.setAttribute("for", "show_size_check");
    label5.className = "checkbox_label";
    label5.style.width = "110px";

    var checkboxInput2 = document.createElement("input");
    checkboxInput2.type = "checkbox";
    checkboxInput2.id = "show_school_check";
    checkboxInput2.className = "checkbox_input";
    checkboxInput2.checked = true;

    var label2 = document.createElement("label");
    label2.textContent = "전체 학교 표시";
    label2.setAttribute("for", "show_school_check");
    label2.className = "checkbox_label";
    label2.style.width = "110px";

    var checkboxInput3 = document.createElement("input");
    checkboxInput3.type = "checkbox";
    checkboxInput3.id = "show_aptName_check";
    checkboxInput3.className = "checkbox_input";
    checkboxInput3.checked = true;

    var label3 = document.createElement("label");
    label3.textContent = "단지명 표시";
    label3.setAttribute("for", "show_aptName_check");
    label3.className = "checkbox_label";
    label3.style.width = "120px";

    var checkboxInput4 = document.createElement("input");
    checkboxInput4.type = "checkbox";
    checkboxInput4.id = "show_schoolRange_check";
    checkboxInput4.className = "checkbox_input";
    checkboxInput4.checked = false;

    var label4 = document.createElement("label");
    label4.textContent = "학교배정 표시";
    label4.setAttribute("for", "show_schoolRange_check");
    label4.className = "checkbox_label";
    label4.style.width = "120px";

	  var checkboxInput6 = document.createElement("input");
    checkboxInput6.type = "checkbox";
    checkboxInput6.id = "show_color_check";
    checkboxInput6.className = "checkbox_input";
    checkboxInput6.checked = true;

    var label6 = document.createElement("label");
    label6.textContent = "색상 변경";
    label6.setAttribute("for", "show_color_check");
    label6.className = "checkbox_label";
    label6.style.width = "110px";

    var checkboxInput7 = document.createElement("input");
    checkboxInput7.type = "checkbox";
    checkboxInput7.id = "show_jeonse_check";
    checkboxInput7.className = "checkbox_input";
    checkboxInput7.checked = true;

    var label7 = document.createElement("label");
    label7.textContent = "전세가 표시";
    label7.setAttribute("for", "show_jeonse_check");
    label7.className = "checkbox_label";
    label7.style.width = "110px";

    var checkboxInput8 = document.createElement("input");
    checkboxInput8.type = "checkbox";
    checkboxInput8.id = "show_gap_check";
    checkboxInput8.className = "checkbox_input";
    //checkboxInput8.checked = true;

    var label8 = document.createElement("label");
    label8.textContent = "갭 표시";
    label8.setAttribute("for", "show_gap_check");
    label8.className = "checkbox_label";
    label8.style.width = "110px";

    var checkboxInput9 = document.createElement("input");
    checkboxInput9.type = "checkbox";
    checkboxInput9.id = "show_maemae_check";
    checkboxInput9.className = "checkbox_input";
    checkboxInput9.checked = true;

    var label9 = document.createElement("label");
    label9.textContent = "매매가 표시";
    label9.setAttribute("for", "show_maemae_check");
    label9.className = "checkbox_label";
    label9.style.width = "110px";

    var checkboxInput10 = document.createElement("input");
    checkboxInput10.type = "checkbox";
    checkboxInput10.id = "show_count_check";
    checkboxInput10.className = "checkbox_input";
    //checkboxInput10.checked = true;

    var label10 = document.createElement("label");
    label10.textContent = "물건수 표시";
    label10.setAttribute("for", "show_count_check");
    label10.className = "checkbox_label";
    label10.style.width = "110px";

    var checkboxInput11 = document.createElement("input");
    checkboxInput11.type = "checkbox";
    checkboxInput11.id = "show_floor_check";
    checkboxInput11.className = "checkbox_input";
    //checkboxInput11.checked = true;

    var label11 = document.createElement("label");
    label11.textContent = "층 표시";
    label11.setAttribute("for", "show_floor_check");
    label11.className = "checkbox_label";
    label11.style.width = "110px";

    var checkboxInput13 = document.createElement("input");
    checkboxInput13.type = "checkbox";
    checkboxInput13.id = "show_area2_check";
    checkboxInput13.className = "checkbox_input";
    checkboxInput13.checked = true;

    var label13 = document.createElement("label");
    label13.textContent = "전용면적 표시";
    label13.setAttribute("for", "show_area2_check");
    label13.className = "checkbox_label";
    label13.style.width = "110px";


    var checkboxInput12 = document.createElement("input");
    checkboxInput12.type = "checkbox";
    checkboxInput12.id = "show_aptInfo_check";
    checkboxInput12.className = "checkbox_input";
    checkboxInput12.checked = true;

    var label12 = document.createElement("label");
    label12.textContent = "단지정보 표시";
    label12.setAttribute("for", "show_aptInfo_check");
    label12.className = "checkbox_label";
    label12.style.width = "110px";

    var checkboxInput14 = document.createElement("input");
    checkboxInput14.type = "checkbox";
    checkboxInput14.id = "show_jsMiddle_check";
    checkboxInput14.className = "checkbox_input";
    checkboxInput14.checked = true;

    var label14 = document.createElement("label");
    label14.textContent = "전세 중ꞏ고층 우선";
    label14.setAttribute("for", "show_jsMiddle_check");
    label14.className = "checkbox_label";
    label14.style.width = "110px";

    var yearSettingBtn = document.createElement("button");
    yearSettingBtn.innerText = "연식설정창 보기";
    yearSettingBtn.id = "yearSettingBtn";
    yearSettingBtn.style.width = "100px";
    yearSettingBtn.style.height = "20px";
    yearSettingBtn.style.color = "white";
	  yearSettingBtn.style.display = "none";
    yearSettingBtn.style.backgroundColor = "#FF6600";

    var label15 = document.createElement("label");
    label15.textContent = "세안고/주전 표시";
    label15.setAttribute("for", "show_with_check");
    label15.className = "checkbox_label";
    label15.style.width = "110px";

    var checkboxInput15 = document.createElement("input");
    checkboxInput15.type = "checkbox";
    checkboxInput15.id = "show_with_check";
    checkboxInput15.className = "checkbox_input";
    //checkboxInput15.checked = true;


    var optionBtn = document.createElement("button");
    optionBtn.innerText = "옵션창 보기";
    optionBtn.id = "optionBtn";
    optionBtn.style.width = "100px";
    optionBtn.style.height = "20px";
    optionBtn.style.color = "white";
    optionBtn.style.backgroundColor = "#D86ECC";

    var otherHideBtn = document.createElement("button");
    otherHideBtn.innerText = "나머지 숨기기";
    otherHideBtn.id = "otherHide";
    otherHideBtn.style.width = "100px";
    otherHideBtn.style.height = "20px";
    otherHideBtn.style.color = "white";
    otherHideBtn.style.backgroundColor = "#499D2B";

    var table = document.createElement("table");
    table.id = "yearTable";
    table.style.width = "250px";
    table.style.border = "1px solid black";
    table.style.display = "none";
    table.style.marginTop = "10px";
    var row1 = table.insertRow();
    var cell1_1 = row1.insertCell(0);
    var cell1_2 = row1.insertCell(1);
    var cell1_3 = row1.insertCell(2);
    var row2 = table.insertRow();
    var cell2_1 = row2.insertCell(0);
    var cell2_2 = row2.insertCell(1);
    var cell2_3 = row2.insertCell(2);
    var row3 = table.insertRow();
    var cell3_1 = row3.insertCell(0);
    var cell3_2 = row3.insertCell(1);
    var cell3_3 = row3.insertCell(2);
    var row4 = table.insertRow();
    var cell4_1 = row4.insertCell(0);
    var cell4_2 = row4.insertCell(1);
    var cell4_3 = row4.insertCell(2);

    cell1_3.id = "cell1_3";
    cell2_3.id = "cell2_3";
    cell3_3.id = "cell3_3";
    cell4_3.id = "cell4_3";

    cell1_1.style.width = "100px";
    cell1_2.style.width = "50px";
    cell1_3.style.width = "100px";
    cell2_1.style.width = "100px";
    cell2_2.style.width = "50px";
    cell2_3.style.width = "100px";
    cell3_1.style.width = "100px";
    cell3_2.style.width = "50px";
    cell3_3.style.width = "100px";
    cell4_1.style.width = "100px";
    cell4_2.style.width = "50px";
    cell4_3.style.width = "100px";

    cell1_1.style.backgroundColor = "#3F24D6";
    cell2_1.style.backgroundColor = "#FC541B";
    cell3_1.style.backgroundColor = "rgba(255, 255, 0, 1)";
    cell4_1.style.backgroundColor = "#5C6268";

    cell1_1.innerHTML = "&nbsp;";
    cell1_2.textContent = ">=";
    cell1_3.innerHTML = "<input type='text' style='width: 100%;text-align:center' value='2019' maxlength='4'/>";
    cell2_1.innerHTML = "&nbsp;";
    cell2_2.textContent = ">=";
    cell2_3.innerHTML = "<input type='text' style='width: 100%;text-align:center' value='2010' maxlength='4'/>";
    cell3_1.innerHTML = "&nbsp;";
    cell3_2.textContent = ">=";
    cell3_3.innerHTML = "<input type='text' style='width: 100%;text-align:center' value='2000' maxlength='4'/>";
    cell4_1.innerHTML = "&nbsp;";
    cell4_2.textContent = ">=";
    cell4_3.innerHTML = "<input type='text' style='width: 100%;text-align:center' value='1900' maxlength='4'/>";

    var cells = [cell1_1, cell1_2, cell1_3, cell2_1, cell2_2, cell2_3, cell3_1, cell3_2, cell3_3, cell4_1, cell4_2, cell4_3];
    cells.forEach(cell => {
        cell.style.border = "1px solid black";
        cell.style.textAlign = "center";
    });
    table.style.marginTop = "30px";
    //table.style.marginLeft = "50px";

    var buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "10px";

    buttonContainer.appendChild(optionBtn);
    buttonContainer.appendChild(otherHideBtn);
    buttonContainer.appendChild(yearSettingBtn);
    //buttonContainer.appendChild(getPriceBtn);

    newDiv.appendChild(buttonContainer);
    newDiv.appendChild(detailOptionDiv);
    detailOptionDiv.appendChild(document.createElement("br"));
    detailOptionDiv.appendChild(checkboxInput3);
    detailOptionDiv.appendChild(label3);
    detailOptionDiv.appendChild(document.createElement("br"));
    detailOptionDiv.appendChild(checkboxInput1);
    detailOptionDiv.appendChild(label1);
    detailOptionDiv.appendChild(document.createElement("br"));
    detailOptionDiv.appendChild(checkboxInput5);
    detailOptionDiv.appendChild(label5);
    detailOptionDiv.appendChild(document.createElement("br"));
    detailOptionDiv.appendChild(checkboxInput2);
    detailOptionDiv.appendChild(label2);
    detailOptionDiv.appendChild(document.createElement("br"));
    detailOptionDiv.appendChild(checkboxInput4);
    detailOptionDiv.appendChild(label4);
    detailOptionDiv.appendChild(document.createElement("br"));
 	  detailOptionDiv.appendChild(checkboxInput6);
    detailOptionDiv.appendChild(label6);
    detailOptionDiv.appendChild(document.createElement("br"));
 	  detailOptionDiv.appendChild(checkboxInput13);
    detailOptionDiv.appendChild(label13);
    detailOptionDiv.appendChild(document.createElement("br"));
 	  detailOptionDiv.appendChild(checkboxInput9);
    detailOptionDiv.appendChild(label9);

    detailOptionDiv.appendChild(document.createElement("br"));
 	  detailOptionDiv.appendChild(checkboxInput7);
    detailOptionDiv.appendChild(label7);

    detailOptionDiv.appendChild(document.createElement("br"));
 	  detailOptionDiv.appendChild(checkboxInput14);
    detailOptionDiv.appendChild(label14);

    detailOptionDiv.appendChild(document.createElement("br"));
 	  detailOptionDiv.appendChild(checkboxInput8);
    detailOptionDiv.appendChild(label8);

    detailOptionDiv.appendChild(document.createElement("br"));
 	  detailOptionDiv.appendChild(checkboxInput10);
    detailOptionDiv.appendChild(label10);

    detailOptionDiv.appendChild(document.createElement("br"));
 	  detailOptionDiv.appendChild(checkboxInput11);
    detailOptionDiv.appendChild(label11);

    detailOptionDiv.appendChild(document.createElement("br"));
 	  detailOptionDiv.appendChild(checkboxInput12);
    detailOptionDiv.appendChild(label12);

    detailOptionDiv.appendChild(document.createElement("br"));
 	  detailOptionDiv.appendChild(checkboxInput15);
    detailOptionDiv.appendChild(label15);




    newDiv.appendChild(table);

    yearSettingBtn.addEventListener('click', function() {
        var yearTable = document.getElementById('yearTable');
        var yearSettingBtn = document.getElementById('yearSettingBtn');
        if (yearTable.style.display !== "block") {
            yearTable.style.display = "block";
            yearSettingBtn.innerText = "연식설정창 닫기"
        } else {
            yearTable.style.display = "none";
            yearSettingBtn.innerText = "연식설정창 보기"
        }
    });

    optionBtn.addEventListener('click', function() {
        if (document.getElementById('detailOptionDiv').style.display !== "inline") {
            document.getElementById('detailOptionDiv').style.display = "inline";
            optionBtn.innerText = "옵션창 닫기"
        } else {
            document.getElementById('detailOptionDiv').style.display = "none";
            optionBtn.innerText = "옵션창 보기"
        }
    });

    otherHideBtn.addEventListener('click', function() {
        // 대상 요소를 선택
      const complexIds = document.querySelectorAll('[class*="marker_complex--apart"]');

      // 대상 요소를 순회
      complexIds.forEach(element => {
          // price-result 클래스를 포함하는 자식 요소를 찾음
          const priceResult = element.querySelector('.price-result');

          // price-result가 존재하지 않으면 해당 요소를 숨김
          if (!priceResult) {
              element.style.display = 'none';
          }
      });

    });
/*
    getPriceBtn.addEventListener('click', function() {
        getPriceAll();
    });
*/
    var parentDiv = document.querySelector("#filter > div");
    parentDiv.appendChild(newDiv);


    function checkBoxUpdate(){
      const isDisabled = !checkboxInput13.checked;

        // 매매가 표시
        checkboxInput9.disabled = isDisabled;
        checkboxInput9.style.opacity = isDisabled ? "0.5" : "1.0";
        checkboxInput9.style.cursor = isDisabled ? "not-allowed" : "pointer";
        label9.style.opacity = isDisabled ? "0.5" : "1.0";

        // 전세가 표시
        checkboxInput7.disabled = isDisabled;
        checkboxInput7.style.opacity = isDisabled ? "0.5" : "1.0";
        checkboxInput7.style.cursor = isDisabled ? "not-allowed" : "pointer";
        label7.style.opacity = isDisabled ? "0.5" : "1.0";

        // 갭 표시
        checkboxInput8.disabled = isDisabled;
        checkboxInput8.style.opacity = isDisabled ? "0.5" : "1.0";
        checkboxInput8.style.cursor = isDisabled ? "not-allowed" : "pointer";
        label8.style.opacity = isDisabled ? "0.5" : "1.0";

        // 물건수 표시
        checkboxInput10.disabled = isDisabled;
        checkboxInput10.style.opacity = isDisabled ? "0.5" : "1.0";
        checkboxInput10.style.cursor = isDisabled ? "not-allowed" : "pointer";
        label10.style.opacity = isDisabled ? "0.5" : "1.0";

        // 층 표시
        checkboxInput11.disabled = isDisabled;
        checkboxInput11.style.opacity = isDisabled ? "0.5" : "1.0";
        checkboxInput11.style.cursor = isDisabled ? "not-allowed" : "pointer";
        label11.style.opacity = isDisabled ? "0.5" : "1.0";


    }

   checkboxInput13.addEventListener("change", function () {
        checkBoxUpdate();
    });

    // 저장된 상태 로드
    loadCheckboxStateFromLocalStorage();
     checkBoxUpdate();
    // 이벤트 리스너 추가
    attachCheckboxListeners();
}







function labelFont(){
		// CSS 코드를 문자열로 저장합니다.
	var cssCode = `
		/* 스타일은 CSS로 정의 */
		#overlay {
			display: none;
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.5);
			z-index: 9999;
		}

		#overlay div {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 500px;
			height: 239px;
			background-color: white;
			text-align: center;
		}

		.marker_complex--apart_red .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_red .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #FFF;
		}

		.marker_complex--apart_blue .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_blue .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #FFF;
		}

		.marker_complex--apart_gray .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_gray .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #FFF;
		}

		.marker_complex--apart_gray .complex_infos {
			overflow: hidden;
			position: relative;
			height: 100%;
			padding: 2px 7px 4px 5px;
			font-size: 10px;
			letter-spacing: -0.5px;
			text-align: left;
			vertical-align: top;
			color: #FFF;
		}

		.marker_complex--apart_purple .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_purple .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #FFF;
		}

		.marker_complex--apart_yellow .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_yellow .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #000000;
		}

		.marker_complex--apart_yellow .complex_infos {
			overflow: hidden;
			position: relative;
			height: 100%;
			padding: 2px 7px 4px 5px;
			font-size: 10px;
			letter-spacing: -0.5px;
			text-align: left;
			vertical-align: top;
			color: #000000;
		}

		.marker_complex--apart_3 .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_3 .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #FFF;
		}

		.marker_complex--apart_4 .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_4 .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #FFF;
		}

		.marker_complex--apart_5 .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_5 .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #FFF;
		}

		.marker_complex--apart_6 .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_6 .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #FFF;
		}

		.marker_complex--apart_7 .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_7 .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #FFF;
		}

		.marker_complex--apart_8 .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_8 .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #000000;
		}

		.marker_complex--apart_8 .complex_infos {
			overflow: hidden;
			position: relative;
			height: 100%;
			padding: 2px 7px 4px 5px;
			font-size: 10px;
			letter-spacing: -0.5px;
			text-align: left;
			vertical-align: top;
			color: #000000;
		}

		.marker_complex--apart_9 .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_9 .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #fff;
		}

		.marker_complex--apart_10 .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_10 .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #fff;
		}

		.marker_complex--apart_11 .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_11 .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #fff;
		}

		.marker_complex--apart_12 .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_12 .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #fff;
		}

		.marker_complex--apart_13 .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_13 .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #fff;
		}

		.marker_complex--apart_14 .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_14 .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #fff;
		}

		.marker_complex--apart_15 .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_15 .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #fff;
		}

		.marker_complex--apart_16 .complex_feature {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.3px;
			padding: 0 5px;
			border-top-left-radius: 2px;
			border-top-right-radius: 2px;
			text-align: left;
			white-space: nowrap;
			color: #222;
			background-color: #fff;
		}

		.marker_complex--apart_16 .complex_size {
			font-size: 12px;
			line-height: 14px;
			letter-spacing: -0.56px;
			white-space: nowrap;
			color: #fff;
		}

	`;

	// 스타일 요소를 생성합니다.
	var styleElement = document.createElement('style');
	styleElement.type = 'text/css';

	// CSS 코드를 스타일 요소에 추가합니다.
	if (styleElement.styleSheet){
		// IE에서 작동하는 방법
		styleElement.styleSheet.cssText = cssCode;
	} else {
		// 다른 브라우저에서 작동하는 방법
		styleElement.appendChild(document.createTextNode(cssCode));
	}

	// 문서의 head 요소에 스타일 요소를 추가합니다.
	document.head.appendChild(styleElement);

}


// 공통: 검색창 CSS 싹 제거하는 헬퍼
function stripSearchCss(cssContent) {
  return cssContent
    .replace(/\.search_area[\s\S]*?\}\s*/g, '')
    .replace(/\.search_input[\s\S]*?\}\s*/g, '')
	.replace(/\.logo_area[\s\S]*?\}\s*/g, '');
}


async function css_yeonsik_install(){

	// CSS 파일의 URL
	var cssUrl = "https://ssl.pstatic.net/static.land/static/beta-service/css/1707289307391/land.3b4f8d49993a841858b7.css";

	// CSS 파일을 가져오기 위한 XMLHttpRequest 객체 생성
	var xhr1 = new XMLHttpRequest();
	var xhr2 = new XMLHttpRequest();
	var xhr3 = new XMLHttpRequest();
	var xhr4 = new XMLHttpRequest();
	var xhr5 = new XMLHttpRequest();
	var xhr6 = new XMLHttpRequest();

	xhr1.open('GET', cssUrl, true);

	// blue
	xhr1.onreadystatechange = function() {
		if (xhr1.readyState === 4) {
			if (xhr1.status === 200) {
				// CSS 파일 내용 가져오기
				var cssContent = stripSearchCss(xhr1.responseText);

				// 문자열 치환
				cssContent = cssContent.replace(/marker_complex--apart/g, 'marker_complex--apart_blue');
				cssContent = cssContent.replace(/#8160e2/g, '#3F24D6');

				// style 태그에 추가
				var styleElement = document.createElement('style');
				styleElement.textContent = cssContent;
				document.head.appendChild(styleElement);
			} else {
				console.error('Failed to load CSS:', xhr1.status, xhr1.statusText);
			}
		}
	};
	xhr1.send();

	// red
	xhr2.open('GET', cssUrl, true);
	xhr2.onreadystatechange = function() {
		if (xhr2.readyState === 4) {
			if (xhr2.status === 200) {
				// CSS 파일 내용 가져오기
				var cssContent = stripSearchCss(xhr2.responseText);

				// 문자열 치환
				cssContent = cssContent.replace(/marker_complex--apart/g, 'marker_complex--apart_red');
				cssContent = cssContent.replace(/#8160e2/g, '#FC541B');

				// style 태그에 추가
				var styleElement = document.createElement('style');
				styleElement.textContent = cssContent;
				document.head.appendChild(styleElement);
			} else {
				console.error('Failed to load CSS:', xhr2.status, xhr2.statusText);
			}
		}
	};
	xhr2.send();


	// purple
	xhr3.open('GET', cssUrl, true);
	xhr3.onreadystatechange = function() {
		if (xhr3.readyState === 4) {
			if (xhr3.status === 200) {
				// CSS 파일 내용 가져오기
				var cssContent = stripSearchCss(xhr3.responseText);

				// 문자열 치환
				cssContent = cssContent.replace(/marker_complex--apart/g, 'marker_complex--apart_purple');
				cssContent = cssContent.replace(/#8160e2/g, '#C733B5');

				// style 태그에 추가
				var styleElement = document.createElement('style');
				styleElement.textContent = cssContent;
				document.head.appendChild(styleElement);
			} else {
				console.error('Failed to load CSS:', xhr3.status, xhr3.statusText);
			}
		}
	};
	xhr3.send();



	// green
	xhr4.open('GET', cssUrl, true);
	xhr4.onreadystatechange = function() {
		if (xhr4.readyState === 4) {
			if (xhr4.status === 200) {
				// CSS 파일 내용 가져오기
				var cssContent = stripSearchCss(xhr4.responseText);

				// 문자열 치환
				cssContent = cssContent.replace(/marker_complex--apart/g, 'marker_complex--apart_green');
				cssContent = cssContent.replace(/#8160e2/g, '#43474B');

				// style 태그에 추가
				var styleElement = document.createElement('style');
				styleElement.textContent = cssContent;
				document.head.appendChild(styleElement);
			} else {
				console.error('Failed to load CSS:', xhr4.status, xhr4.statusText);
			}
		}
	};
	xhr4.send();

	// gray
	xhr5.open('GET', cssUrl, true);
	xhr5.onreadystatechange = function() {
		if (xhr5.readyState === 4) {
			if (xhr5.status === 200) {
				// CSS 파일 내용 가져오기
				var cssContent = stripSearchCss(xhr5.responseText);

				// 문자열 치환
				cssContent = cssContent.replace(/marker_complex--apart/g, 'marker_complex--apart_gray');
				cssContent = cssContent.replace(/#8160e2/g, '#5C6268');

				// style 태그에 추가
				var styleElement = document.createElement('style');
				styleElement.textContent = cssContent;
				document.head.appendChild(styleElement);
			} else {
				console.error('Failed to load CSS:', xhr5.status, xhr5.statusText);
			}
		}
	};
	xhr5.send();


	// yellow
	xhr6.open('GET', cssUrl, true);
	xhr6.onreadystatechange = function() {
		if (xhr6.readyState === 4) {
			if (xhr6.status === 200) {
				// CSS 파일 내용 가져오기
				var cssContent = stripSearchCss(xhr6.responseText);

				// 문자열 치환
				cssContent = cssContent.replace(/marker_complex--apart/g, 'marker_complex--apart_yellow');
				cssContent = cssContent.replace(/#8160e2/g, 'rgba(255, 255, 0, 1)');

				// style 태그에 추가
				var styleElement = document.createElement('style');
				styleElement.textContent = cssContent;
				document.head.appendChild(styleElement);
			} else {
				console.error('Failed to load CSS:', xhr6.status, xhr6.statusText);
			}
		}
	};
	xhr6.send();





}

async function css_price_install() {
  const cssUrl = "https://ssl.pstatic.net/static.land/static/beta-service/css/1707289307391/land.3b4f8d49993a841858b7.css";

  const colors = [
    'rgba(0, 0, 0, 1)',
    'rgba(55, 58, 61, 1)',
    'rgba(96, 103, 108, 1)',
    'rgba(255, 0, 0, 1)',
    'rgba(255, 102, 0, 1)',
    'rgba(255, 255, 0, 1)',
    'rgba(146, 208, 80, 1)',
    'rgba(0, 176, 80, 1)',
    'rgba(0, 176, 240, 1)',
    'rgba(0, 112, 192, 1)',
    'rgba(0, 0, 153, 1)',
    'rgba(112, 48, 160, 1)',
    'rgba(204, 51, 153, 1)',
    'rgba(255, 102, 204, 1)'
  ];

  const promises = colors.map((color, i) => {
    const index = i + 3; // 3억 ~ 16억
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', cssUrl, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            var cssContent = stripSearchCss(xhr.responseText);

            cssContent = cssContent.replace(/marker_complex--apart/g, `marker_complex--apart_${index}`);
            cssContent = cssContent.replace(/#8160e2/g, color);

            const styleElement = document.createElement('style');
            styleElement.textContent = cssContent;
            document.head.appendChild(styleElement);
            resolve(); // ✅ 완료됨
          } else {
            console.error(`❌ CSS ${index}억대 실패`, xhr.status);
            reject(xhr.status);
          }
        }
      };
      xhr.send();
    });
  });

  await Promise.all(promises); // ✅ 전체 완료까지 대기
}


function addMouseLeaveEvent(element){
//console.log(element);
	element.addEventListener('mouseleave', function(event) {
		execute(element);
	});

	//마우스 올리면 나오는 창에서 단지명을 매매로 변경
	element.addEventListener('mouseenter', function(event) {
		var elementToReplace = element.querySelector('div.marker_complex_inner > div.complex_infos > div.complex_price_wrap > div > span.price_default');
		var mae_jeon = element.querySelector('div.marker_complex_inner > div.complex_infos > div.complex_price_wrap > div > span.type')

		if (mae_jeon && elementToReplace) {
			mae_jeon.textContent = '매매';
		}
	});

	//마우스 올린 상태에서 클릭시 단지명으로 바뀌는걸 다시 매매로 변경
	element.addEventListener('click', function(event) {
		execute(element);
		var elementToReplace = element.querySelector('div.marker_complex_inner > div.complex_infos > div.complex_price_wrap > div > span.price_default');
		var mae_jeon = element.querySelector('div.marker_complex_inner > div.complex_infos > div.complex_price_wrap > div > span.type')

		if (mae_jeon && elementToReplace) {
			mae_jeon.textContent = '매매';
		}
	});

}


function opserver(){
	try {
		var parentElement = document.querySelector('.map_wrap');
		var observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				// 추가된 노드의 클래스를 확인하여 조건이 맞으면 execute() 함수를 호출합니다.
				if (mutation.addedNodes.length > 0) {
					mutation.addedNodes.forEach(function(addedNode) {
						// 추가된 노드가 HTMLElement인지 확인합니다.
						if (addedNode.nodeType === 1 && addedNode.classList.contains('marker_complex--apart')) {
							//console.log("추가됨");
							addMouseLeaveEvent(addedNode);
							execute(addedNode);
							labelMovement(addedNode.id);
              initHoverEvent(addedNode.id);
						}else if (addedNode.classList && addedNode.classList.contains('btn_map--school')) {
							//console.log("추가됨");
							//addedNode.addEventListener('mouseup', drawBorder);
							addedNode.addEventListener('click', drawBorder);
						}



					});
				}
			});
		});

		// MutationObserver를 설정하여 새로운 자식 노드의 추가를 감시합니다.
		var observerConfig = {
			childList: true,
			subtree: true
		};

		observer.observe(parentElement, observerConfig);
	} catch (e) {

		return;
	}

	//학군누르면 모든 학교 라벨 보이게 하기
	var mapControlSchool = document.querySelector('.map_control--school');
	if (mapControlSchool) {
		var observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {

				if (mutation.attributeName === 'aria-pressed') {

					if (mapControlSchool.getAttribute('aria-pressed') === 'true') {

						if(document.querySelector('#show_school_check').checked){

							//console.log("학군 체크박스 선택");
							setTimeout(function() {
								try {
									var tooltipElements = document.querySelectorAll('.tooltip_map_school');

									tooltipElements.forEach(function(element) {
										element.style.display = 'block';
									});


								} catch (error) {
									console.error('Failed to show tooltip elements:', error);
									// 오류 처리
								}
							}, 500);
						}else{

						}

					}else{

					}
				}
			});
		});

		var observerConfig = { attributes: true };

		observer.observe(mapControlSchool, observerConfig);
	} else {
		console.error('map_control--school 클래스를 가진 요소를 찾을 수 없습니다.');
	}
	//console.log("옵저버 실행");

	//매매평당가 버튼 변경시

  var config = { childList: true, subtree: true, characterData: true };
	var targetElement = document.querySelector("#map > div.wrap > div:nth-child(4) > div > div.map_controls--righttop.is-expanded > div.tooltip--complex_sorting > button");
	var observer = new MutationObserver(function(mutationsList, observer) {

		//console.log("innerHTML의 값이 변경되었습니다:", targetElement.innerHTML);
		var innerHTMLValue = document.querySelector("#map > div.wrap > div:nth-child(4) > div > div.map_controls--righttop.is-expanded > div.tooltip--complex_sorting > button").innerHTML;

		// "<span>"부터 "</span>"까지의 부분을 정규식을 사용하여 제거합니다.
		var spanRemoved = innerHTMLValue.replace(/<span[^>]*>.*?<\/span>/gi, '');
    console.log("spanRemoved :"+spanRemoved)

		//console.log(spanRemoved); // "매매평당가"

		if(spanRemoved == "사용승인일"){
			document.getElementById("yearSettingBtn").style.display = "inline";
			document.getElementById('yearSettingBtn').innerText = "연식설정창 보기";
		}else{
			document.getElementById("yearSettingBtn").style.display = "none";
			document.getElementById('yearTable').style.display = "none";
		}

	});

	// MutationObserver에 대상 엘리먼트와 감시할 옵션을 전달하여 감시를 시작합니다.
	observer.observe(targetElement, config);



	let selectedElement = null;

	function checkSVGElements() {

		const svgElements = document.querySelectorAll('svg');

		svgElements.forEach(svg => {
			const pathElements = svg.querySelectorAll('path');

			pathElements.forEach(path => {
				const fillValue = path.style.fill;

				if (fillValue === '#FF6D41' ||  fillValue === 'rgb(255, 109, 65)') {
					svg.addEventListener("click", function() {
						selectedElement = this;
					});
				}
			});
		});
	}

	// 법정동 빨간 영역 안보이게 처리
	document.addEventListener("keydown", function(event) {
		if (event.key === "Delete" && selectedElement) {
			selectedElement.style.display = "none";
			selectedElement = null; // Reset the selected element
		}
	});

	// Observe DOM mutations
	const observerbd = new MutationObserver(function(mutationsList) {
		for (let mutation of mutationsList) {
			if (mutation.type === 'childList' || mutation.type === 'attributes') {
				mutation.addedNodes.forEach(node => {
					if (node.tagName === 'svg:svg' || node.querySelectorAll && node.querySelectorAll('svg').length > 0) {
						checkSVGElements();
					}
				});
			}
		}
	});

	observerbd.observe(document.body, { childList: true, subtree: true, attributes: true });

}


function execute(element){
	try {
			var show_price_check_yn = document.querySelector("#show_price_check").checked;
			var show_aptName_check_yn = document.querySelector('#show_aptName_check').checked;
	/*
      if(!show_price_check_yn && !show_aptName_check_yn){
        alert('단지명과 가격 둘 중에 하나는 선택해야 합니다');
        return;
      }
	  */

			var yearStd1 = document.getElementById("cell1_3").querySelector("input").value.trim();
			var yearStd2 = document.getElementById("cell2_3").querySelector("input").value.trim();
			var yearStd3 = document.getElementById("cell3_3").querySelector("input").value.trim();
			var yearStd4 = document.getElementById("cell4_3").querySelector("input").value.trim();



			var headTitle = "";
			var newValue = "";
			if(element.querySelector('div.marker_complex_inner > div.complex_feature.is-feature_default')){
				headTitle = element.querySelector('div.marker_complex_inner > div.complex_feature.is-feature_default').textContent;
			}
			if(element.querySelector('div.marker_complex_inner > div.complex_infos > div.complex_title')){
				newValue = element.querySelector('div.marker_complex_inner > div.complex_infos > div.complex_title').textContent;
			}

			var salePriceElement = element.querySelector('div.marker_complex_inner > div.complex_infos > div.complex_price_wrap > div > span.price_default');

			var salePrice = "";
			if (salePriceElement !== null) {

				let hasParenthesis = salePriceElement.textContent.includes('(');
				if (hasParenthesis) {
					let text = salePriceElement.textContent;
					let firstStartIndex = text.indexOf('(');
					let firstEndIndex = text.indexOf(')', firstStartIndex);
					let secondStartIndex = text.indexOf('(', firstEndIndex); // 두 번째 괄호의 시작 인덱스 찾기
					let secondEndIndex = text.indexOf(')', secondStartIndex); // 두 번째 괄호의 끝 인덱스 찾기
					let extractedText;

					if (secondStartIndex !== -1 && secondEndIndex !== -1) { // 두 번째 괄호가 존재하는 경우
						extractedText = text.substring(secondStartIndex + 1, secondEndIndex);
					} else { // 두 번째 괄호가 없는 경우
						extractedText = text.substring(firstStartIndex + 1, firstEndIndex);
					}

					salePrice = extractedText;
				} else {
					salePrice = salePriceElement.textContent;
				}

			}

			var elementToReplace = element.querySelector('div.marker_complex_inner > div.complex_infos > div.complex_price_wrap > div > span.price_default');
			var mae_jeon = element.querySelector('div.marker_complex_inner > div.complex_infos > div.complex_price_wrap > div > span.type')

      //var label_text = "";
			if (elementToReplace && newValue) {
				if(show_aptName_check_yn){
				  if(show_price_check_yn){//단지명, 가격 모두 표시일 때
					mae_jeon.textContent = newValue + '  ' + '(' + salePrice + ')';
				  }else{//단지명만 표시일 때
					mae_jeon.textContent = newValue;
				  }
				}else{
				  if(show_price_check_yn){//가격만 표시일 때
					mae_jeon.textContent = salePrice;
				  }
				}
        //mae_jeon.textContent = label_text;
				elementToReplace.style.display = "none";
			}

			if(document.querySelector("#show_color_check").checked){
				let extractedNumber = parseFloat(salePrice.replace(/[^\d.]/g, ''));
				//console.log("headTitle : "+headTitle);

					if (headTitle.includes('만')) {

						const classesToRemove = Array.from(element.classList).filter(className => className.startsWith('marker_complex--apart'));
							classesToRemove.forEach(className => {
								element.classList.remove(className);
							});

						if (extractedNumber < 4) {
							element.classList.add('marker_complex--apart_3');
						}else if(extractedNumber < 5) {
							element.classList.add('marker_complex--apart_4');
						}else if(extractedNumber < 6) {
							element.classList.add('marker_complex--apart_5');
						}else if(extractedNumber < 7) {
							element.classList.add('marker_complex--apart_6');
						}else if(extractedNumber < 8) {
							element.classList.add('marker_complex--apart_7');
						}else if(extractedNumber < 9) {
							element.classList.add('marker_complex--apart_8');
						}else if(extractedNumber < 10) {
							element.classList.add('marker_complex--apart_9');
						}else if(extractedNumber < 11) {
							element.classList.add('marker_complex--apart_10');
						}else if(extractedNumber < 12) {
							element.classList.add('marker_complex--apart_11');
						}else if(extractedNumber < 13) {
							element.classList.add('marker_complex--apart_12');
						}else if(extractedNumber < 14) {
							element.classList.add('marker_complex--apart_13');
						}else if(extractedNumber < 15) {
							element.classList.add('marker_complex--apart_14');
						}else if(extractedNumber < 16) {
							element.classList.add('marker_complex--apart_15');
						}else if(extractedNumber >= 16) {
							element.classList.add('marker_complex--apart_16');
						}else{
							element.classList.add('marker_complex--apart');
						}
					}else if(headTitle.includes('년')){
						const classesToRemove = Array.from(element.classList).filter(className => className.startsWith('marker_complex--apart'));
						classesToRemove.forEach(className => {
							element.classList.remove(className);
						});




						if (yearStd1 !== "" && headTitle >= yearStd1) {
							element.classList.add('marker_complex--apart_blue');
						} else if (yearStd2 !== "" && headTitle >= yearStd2) {
							element.classList.add('marker_complex--apart_red');
						} else if (yearStd3 !== "" && headTitle >= yearStd3) {
							element.classList.add('marker_complex--apart_yellow');
						} else if (yearStd4 !== "" && headTitle >= yearStd4) {
							element.classList.add('marker_complex--apart_gray');
						} else {
							element.classList.add('marker_complex--apart');
						}




					}else if(headTitle === ""){
						const classesToRemove = Array.from(element.classList).filter(className => className.includes('marker_complex--apart'));
						classesToRemove.forEach(className => {
							element.classList.remove(className);
							element.classList.add('marker_complex--apart');
						});
					}
			}else{
				const classesToRemove = Array.from(element.classList).filter(className => className.includes('marker_complex--apart'));
				classesToRemove.forEach(className => {
					element.classList.remove(className);
					element.classList.add('marker_complex--apart');
				});

			}

			//document.querySelectorAll('.is-small').forEach(function(marker) {
						// complex_title 값을 가져오기
						var complexTitle = element.querySelector('.complex_title').textContent;

						// complex_price_wrap 요소 찾기
						var priceWrap = element.querySelector('.complex_price_wrap');

						if (priceWrap) {
							// complex_price 요소 찾기
							var complexPriceDiv = priceWrap.querySelector('.complex_price');

							if (complexPriceDiv) {


								/*
								// 이미 존재하는 경우, 내용을 업데이트
								var span = complexPriceDiv.querySelector('.type');
								if (span) {
									span.textContent = complexTitle;
								} else {
									span = document.createElement('span');
									span.className = 'type';
									span.textContent = complexTitle;
									complexPriceDiv.appendChild(span);
								}
*/
							} else {
								// 존재하지 않는 경우, 새로운 complex_price div 생성
								complexPriceDiv = document.createElement('div');
								complexPriceDiv.className = 'complex_price';

								// 새로운 span 요소 생성하고 complex_title 값 넣기
								var span = document.createElement('span');
								span.className = 'type';
								span.textContent = complexTitle;

								// span을 complex_price div에 추가
								complexPriceDiv.appendChild(span);

								// complex_price div를 complex_price_wrap에 추가
								priceWrap.appendChild(complexPriceDiv);
							}
						}

				if(document.querySelector('#show_size_check').checked){
					var sizeDefault = element.querySelector('.complex_size-default');
					if (sizeDefault) {
						sizeDefault.style.display = 'block';
					}
				}else{
					var sizeDefault = element.querySelector('.complex_size-default');
					if (sizeDefault) {
						sizeDefault.style.display = 'none';
					}
				}

		} catch (e) {
			console.error(e);
			return;
		}
}

function executeAll(){
	//console.log("executeAll 호출");
	var show_price_check_yn = document.querySelector("#show_price_check").checked;
	var show_aptName_check_yn = document.querySelector('#show_aptName_check').checked;

	if(!show_price_check_yn && !show_aptName_check_yn){
		alert('단지명과 가격 둘 중에 하나는 선택해야 합니다');
		return;
	}


	var yearStd1 = document.getElementById("cell1_3").querySelector("input").value.trim();
	var yearStd2 = document.getElementById("cell2_3").querySelector("input").value.trim();
	var yearStd3 = document.getElementById("cell3_3").querySelector("input").value.trim();
	var yearStd4 = document.getElementById("cell4_3").querySelector("input").value.trim();

	if((yearStd1.length > 0 && yearStd1.length < 4) ||
		(yearStd2.length > 0 && yearStd2.length < 4) ||
		(yearStd3.length > 0 && yearStd3.length < 4) ||
		(yearStd4.length > 0 && yearStd4.length < 4)){
			alert("연식설정창의 년도 조건을 확인하세요. 4자리여야 합니다");
			return;
		}

	if((yearStd1.match(/[^0-9]/g) !== null) ||
		(yearStd2.match(/[^0-9]/g) !== null) ||
		(yearStd3.match(/[^0-9]/g) !== null) ||
		(yearStd4.match(/[^0-9]/g) !== null)){
			alert("년도는 4자리 숫자만 입력 가능합니다");
			return;
		}


	document.querySelectorAll('[class*="marker_complex--apart"]').forEach(function(element) {
		try {

			var headTitle = "";
			var newValue = "";
			if(element.querySelector('div.marker_complex_inner > div.complex_feature.is-feature_default')){
				headTitle = element.querySelector('div.marker_complex_inner > div.complex_feature.is-feature_default').textContent;
			}
			if(element.querySelector('div.marker_complex_inner > div.complex_infos > div.complex_title')){
				newValue = element.querySelector('div.marker_complex_inner > div.complex_infos > div.complex_title').textContent;
			}

			var salePriceElement = element.querySelector('div.marker_complex_inner > div.complex_infos > div.complex_price_wrap > div > span.price_default');

			var salePrice = "";
			if (salePriceElement !== null) {

				let hasParenthesis = salePriceElement.textContent.includes('(');
				if (hasParenthesis) {
					let text = salePriceElement.textContent;
					let firstStartIndex = text.indexOf('(');
					let firstEndIndex = text.indexOf(')', firstStartIndex);
					let secondStartIndex = text.indexOf('(', firstEndIndex); // 두 번째 괄호의 시작 인덱스 찾기
					let secondEndIndex = text.indexOf(')', secondStartIndex); // 두 번째 괄호의 끝 인덱스 찾기
					let extractedText;

					if (secondStartIndex !== -1 && secondEndIndex !== -1) { // 두 번째 괄호가 존재하는 경우
						extractedText = text.substring(secondStartIndex + 1, secondEndIndex);
					} else { // 두 번째 괄호가 없는 경우
						extractedText = text.substring(firstStartIndex + 1, firstEndIndex);
					}

					salePrice = extractedText;
				} else {
					salePrice = salePriceElement.textContent;
				}

			}

			var elementToReplace = element.querySelector('div.marker_complex_inner > div.complex_infos > div.complex_price_wrap > div > span.price_default');
			var mae_jeon = element.querySelector('div.marker_complex_inner > div.complex_infos > div.complex_price_wrap > div > span.type')

      //var label_text = "";
			if (elementToReplace && newValue) {
				if(show_aptName_check_yn){
					  if(show_price_check_yn){//단지명, 가격 모두 표시일 때
						mae_jeon.textContent = newValue + '  ' + '(' + salePrice + ')';
					  }else{//단지명만 표시일 때
						mae_jeon.textContent = newValue;
					  }
				}else{
				  if(show_price_check_yn){//가격만 표시일 때
					mae_jeon.textContent = salePrice;
				  }
				}
        //mae_jeon.textContent = label_text;
				elementToReplace.style.display = "none";
			}


			if(document.querySelector("#show_color_check").checked){
				// 문자열에서 숫자 부분만 추출
				let extractedNumber = parseFloat(salePrice.replace(/[^\d.]/g, ''));

				if (headTitle.includes('만')) {

					const classesToRemove = Array.from(element.classList).filter(className => className.startsWith('marker_complex--apart'));
						classesToRemove.forEach(className => {
							element.classList.remove(className);
						});

					if (extractedNumber < 4) {
						element.classList.add('marker_complex--apart_3');
					}else if(extractedNumber < 5) {
						element.classList.add('marker_complex--apart_4');
					}else if(extractedNumber < 6) {
						element.classList.add('marker_complex--apart_5');
					}else if(extractedNumber < 7) {
						element.classList.add('marker_complex--apart_6');
					}else if(extractedNumber < 8) {
						element.classList.add('marker_complex--apart_7');
					}else if(extractedNumber < 9) {
						element.classList.add('marker_complex--apart_8');
					}else if(extractedNumber < 10) {
						element.classList.add('marker_complex--apart_9');
					}else if(extractedNumber < 11) {
						element.classList.add('marker_complex--apart_10');
					}else if(extractedNumber < 12) {
						element.classList.add('marker_complex--apart_11');
					}else if(extractedNumber < 13) {
						element.classList.add('marker_complex--apart_12');
					}else if(extractedNumber < 14) {
						element.classList.add('marker_complex--apart_13');
					}else if(extractedNumber < 15) {
						element.classList.add('marker_complex--apart_14');
					}else if(extractedNumber < 16) {
						element.classList.add('marker_complex--apart_15');
					}else if(extractedNumber >= 16) {
						element.classList.add('marker_complex--apart_16');
					}else{
						element.classList.add('marker_complex--apart');
					}
				}else if(headTitle.includes('년')){
					const classesToRemove = Array.from(element.classList).filter(className => className.startsWith('marker_complex--apart'));
					classesToRemove.forEach(className => {
						element.classList.remove(className);
					});




					if (yearStd1 !== "" && headTitle >= yearStd1) {
						element.classList.add('marker_complex--apart_blue');
					} else if (yearStd2 !== "" && headTitle >= yearStd2) {
						element.classList.add('marker_complex--apart_red');
					} else if (yearStd3 !== "" && headTitle >= yearStd3) {
						element.classList.add('marker_complex--apart_yellow');
					} else if (yearStd4 !== "" && headTitle >= yearStd4) {
						element.classList.add('marker_complex--apart_gray');
					} else {
						element.classList.add('marker_complex--apart');
					}




				}else if(headTitle === ""){
					const classesToRemove = Array.from(element.classList).filter(className => className.includes('marker_complex--apart'));
					classesToRemove.forEach(className => {
						element.classList.remove(className);
						element.classList.add('marker_complex--apart');
					});
				}
			}else{
				const classesToRemove = Array.from(element.classList).filter(className => className.includes('marker_complex--apart'));
				classesToRemove.forEach(className => {
					element.classList.remove(className);
					element.classList.add('marker_complex--apart');
				});

			}

			//document.querySelectorAll('.is-small').forEach(function(marker) {
						// complex_title 값을 가져오기
						var complexTitle = element.querySelector('.complex_title').textContent;

						// complex_price_wrap 요소 찾기
						var priceWrap = element.querySelector('.complex_price_wrap');

						if (priceWrap) {

						}
					//});

			if(document.querySelector('#show_size_check').checked){
				var sizeDefault = element.querySelector('.complex_size-default');
				if (sizeDefault) {
					sizeDefault.style.display = 'block';
				}
			}else{
				var sizeDefault = element.querySelector('.complex_size-default');
				if (sizeDefault) {
					sizeDefault.style.display = 'none';
				}
			}

             // ★ 여기에 추가: hover 이벤트/우클릭 이동 이벤트가 없으면 한 번만 세팅
            if (!element.dataset.hoverInit) {
                addMouseLeaveEvent(element);
                labelMovement(element.id);
                initHoverEvent(element.id);
                element.dataset.hoverInit = '1';
            }



		} catch (e) {
			console.error(e);
			return;
		}
	});

	try{

		var blueComplexSize = document.querySelector('.marker_complex--apart_blue .complex_size');
		var redComplexSize = document.querySelector('.marker_complex--apart_red .complex_size');
		var grayComplexSize = document.querySelector('.marker_complex--apart_gray .complex_size');
		var yellowComplexSize = document.querySelector('.marker_complex--apart_yellow .complex_size');
		var price3ComplexSize = document.querySelector('.marker_complex--apart_3 .complex_size');
		var price4ComplexSize = document.querySelector('.marker_complex--apart_4 .complex_size');
		var price5ComplexSize = document.querySelector('.marker_complex--apart_5 .complex_size');
		var price6ComplexSize = document.querySelector('.marker_complex--apart_6 .complex_size');
		var price7ComplexSize = document.querySelector('.marker_complex--apart_7 .complex_size');
		var price8ComplexSize = document.querySelector('.marker_complex--apart_8 .complex_size');
		var price9ComplexSize = document.querySelector('.marker_complex--apart_9 .complex_size');
		var price10ComplexSize = document.querySelector('.marker_complex--apart_10 .complex_size');
		var price11ComplexSize = document.querySelector('.marker_complex--apart_11 .complex_size');
		var price12ComplexSize = document.querySelector('.marker_complex--apart_12 .complex_size');
		var price13ComplexSize = document.querySelector('.marker_complex--apart_13 .complex_size');
		var price14ComplexSize = document.querySelector('.marker_complex--apart_14 .complex_size');
		var price15ComplexSize = document.querySelector('.marker_complex--apart_15 .complex_size');
		var price16ComplexSize = document.querySelector('.marker_complex--apart_16 .complex_size');


		var fontSize = "";

		if(blueComplexSize){
			fontSize = window.getComputedStyle(blueComplexSize).getPropertyValue('font-size');
		}else if(redComplexSize){
			fontSize = window.getComputedStyle(redComplexSize).getPropertyValue('font-size');
		}else if(grayComplexSize){
			fontSize = window.getComputedStyle(grayComplexSize).getPropertyValue('font-size');
		}else if(yellowComplexSize){
			fontSize = window.getComputedStyle(yellowComplexSize).getPropertyValue('font-size');
		}else if(price3ComplexSize){
			fontSize = window.getComputedStyle(price3ComplexSize).getPropertyValue('font-size');
		}else if(price4ComplexSize){
			fontSize = window.getComputedStyle(price4ComplexSize).getPropertyValue('font-size');
		}else if(price5ComplexSize){
			fontSize = window.getComputedStyle(price5ComplexSize).getPropertyValue('font-size');
		}else if(price6ComplexSize){
			fontSize = window.getComputedStyle(price6ComplexSize).getPropertyValue('font-size');
		}else if(price7ComplexSize){
			fontSize = window.getComputedStyle(price7ComplexSize).getPropertyValue('font-size');
		}else if(price8ComplexSize){
			fontSize = window.getComputedStyle(price8ComplexSize).getPropertyValue('font-size');
		}else if(price9ComplexSize){
			fontSize = window.getComputedStyle(price9ComplexSize).getPropertyValue('font-size');
		}else if(price10ComplexSize){
			fontSize = window.getComputedStyle(price10ComplexSize).getPropertyValue('font-size');
		}
		//console.log(fontSize);
		if(fontSize == "9px" || fontSize == ''){
			labelFont();
		}
	}catch(e){

	}



	function modifyTooltipSchool(div) {
		// Extract the class size and remove the li element containing 학급당 학생수
		let classSize = '';
		div.querySelectorAll('.school_info_list .school_info_item').forEach(li => {
			const title = li.querySelector('.tit');
			if (title && title.textContent.includes('학급당 학생수')) {
				classSize = li.querySelector('.data').textContent;
				li.style.display = 'none'; // Hide the li element
			}
			if (title && title.textContent.includes('교사당 학생수')) {
				//li.remove();
				li.style.display = 'none'; // Hide the li element
			}
		});

		// Modify the title by removing the word "등학교" and appending the class size
		const titleDiv = div.querySelector('.title');
		let newTitleText = "";
		if (titleDiv) {
			const titleText = titleDiv.textContent.replace('등학교', '');
			const indexOfParenthesis = titleText.indexOf('(');
			if (indexOfParenthesis !== -1) {
				newTitleText = titleText.substring(0, indexOfParenthesis).trim() + " (" + classSize + ")";
			}else{
				newTitleText = titleText + " (" + classSize + ")";
			}
			titleDiv.textContent = newTitleText;
		}



		const schoolImg = div.querySelector('.school_type.school_type--small');
		if (schoolImg) {
		  schoolImg.parentNode.removeChild(schoolImg);
		}
		// 대상 div 요소를 선택합니다. 예를 들어, 클래스가 "title"인 요소를 선택합니다.


		// 텍스트 크기를 13으로 변경합니다.
		if (titleDiv) {
			titleDiv.style.fontSize = '13px';
		}

			//titleDiv.style.whiteSpace = 'nowrap'; // Allow text to wrap
			//titleDiv.style.overflow = 'visible';  // Ensure overflow is visible
			//titleDiv.style.textOverflow = 'clip'; // Ensure text is not truncated
			//titleDiv.style.display = 'inline-block'; // Ensure the titleDiv expands to fit content

			// Set the height and min-width
			div.style.height = '30px';
			div.style.minWidth = '90px';
      div.style.padding = '4px';

		}



		if(document.querySelector('#show_school_check').checked){
			setTimeout(function() {
				try {

					document.querySelectorAll('.tooltip_map_school').forEach(modifyTooltipSchool);

					var tooltipElements = document.querySelectorAll('.tooltip_map_school');

					tooltipElements.forEach(function(element) {
						element.style.display = 'block';
					});
				} catch (error) {
					console.error('Failed to show tooltip elements:', error);
				}
			}, 500);
		}else{
			setTimeout(function() {
				try {
					var tooltipElements = document.querySelectorAll('.tooltip_map_school');

					tooltipElements.forEach(function(element) {
						element.style.removeProperty('display');
					});
				} catch (error) {
					console.error('Failed to remove display property from tooltip elements:', error);
				}
			}, 500);
		}

		if(!document.querySelector('#show_schoolRange_check').checked){
			//학교 배정 svg 일괄 삭제
			const svgElements = document.querySelectorAll('svg');

			svgElements.forEach(svg => {
				const pathElements = svg.querySelectorAll('path');

				pathElements.forEach(path => {
					const fillValue = path.style.fill;

					if (fillValue === 'rgb(0, 199, 60)' || fillValue === '#00C73C') {


						// 중복 체크
						const isDuplicate = svgArray.some(element => element.isEqualNode(svg));

						if (isDuplicate) {
							// 배열에서 중복된 요소 삭제
							const index = svgArray.findIndex(element => element.isEqualNode(svg));
							svgArray.splice(index, 1);
							svg.parentNode.removeChild(svg);
							selectedSvg = ""; // 이 부분은 필요 없어집니다.
						} else {
							// 배열에 없는 요소는 화면에서 안 보이게 처리
							svg.style.display = 'none';
						}
					}
				});
			});
		}

}





function highlightListingsWithKeyword(keywords) {
    const listings = document.querySelectorAll('.item_list--article .item');
    const keywordArray = keywords.split(',').map(keyword => keyword.trim().toLowerCase());

    listings.forEach((listing) => {
        const textContent = listing.innerText.toLowerCase();
        const hasKeyword = keywordArray.some(keyword => textContent.includes(keyword));

        if (hasKeyword) {
            listing.style.border = '2px solid blue'; // 테두리를 파란색으로 설정
        } else {
            listing.style.border = ''; // 기존 테두리를 초기화
        }
    });
}

// MutationObserver 설정
function observeListings() {
//  console.log("observeListings 실행")
    const targetNode = document.querySelector('.item_list--article');
 // console.log(targetNode)
    const config = { childList: true, subtree: true };

    const observer = new MutationObserver(() => {
        // 새로운 리스트가 추가될 때마다 "세안고" 문구를 감지하여 테두리를 칠함
        highlightListingsWithKeyword("안고,승계,점유개정,주인전세,주전,주인 전세,끼고"); // 초기 리스트에서 "세안고" 감지
    });

    observer.observe(targetNode, config);
}



// ✅ 아파트 라벨이 뜰 때까지 기다리는 헬퍼
function waitForAptMarkers() {
  return new Promise((resolve) => {
    const check = () => {
      // 라벨 클래스가 뜨는지 확인
      const marker = document.querySelector('[class*="marker_complex--apart"]');
      if (marker) {
        resolve();
      } else {
        setTimeout(check, 200);
      }
    };
    check();
  });
}

// ✅ 지도 패널(.map_panel)이 생길 때까지 기다렸다가 이벤트 바인딩
function bindMapWrap() {
  const mapWrap = document.querySelector('.map_panel');
  if (!mapWrap) {
    setTimeout(bindMapWrap, 300);
    return;
  }

  mapWrap.addEventListener('mouseup', function (event) {
    if (
      !event.target.classList.contains('complex_data_button') &&
      !event.target.classList.contains('marker_transparent') &&
      !event.target.classList.contains('complex_quantity')
    ) {
      executeAll();
    }
  });
}

// ✅ 실제 초기화 함수 (load 에만 의존 X)
async function start() {
  console.log("시작");

  // 1) 필터 UI + 색상 CSS 주입 (라벨이 없어도 먼저 해둬도 됨)
  await Promise.all([
    add_price_checkbox(),
    css_price_install(),
    css_yeonsik_install()
  ]);

  // 2) 아파트 라벨이 화면에 뜰 때까지 대기
  await waitForAptMarkers();

  console.log("executeAll 실행");
  executeAll();

  // 세안고/주전, 전세표 등 각종 로직
  opserver();

  // ===== MutationObserver 설정 =====
  const targetNode = document.body;

  const config = {
    childList: true, // 자식 노드 추가/제거 감지
    subtree: true,   // 하위 노드 전체 감지
  };

  let panelVisible = false;

  const callback = (mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        const panel = document.querySelector('#complexOverviewList');

        if (panel && !panelVisible) {
          // 패널이 나타났을 때
          panelVisible = true;

          // 세안주/주전 표시 체크일 때만 동작
          if (document.querySelector('#show_with_check').checked) {
            observeListings();
          }

        } else if (!panel && panelVisible) {
          // 패널이 사라졌을 때
          panelVisible = false;
        }
      }
    }
  };

  const observer = new MutationObserver(callback);
  observer.observe(targetNode, config);

  // 지도 mouseup 이벤트 바인딩 (패널 생성 타이밍 보정)
  bindMapWrap();
}

// ✅ load 이벤트가 이미 끝났으면 바로, 아니면 load 때 실행
if (document.readyState === 'complete') {
  start();
} else {
  window.addEventListener("load", start);
}

})();
