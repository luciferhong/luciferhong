// ==UserScript==
// @name        [루시퍼홍] 아실 여러단지비교 편하게 써보자
// @namespace   Violentmonkey Scripts
// @match       https://asil.kr/app/investor*
// @grant       none
// @version     1.41
// @description 2024. 7. 31. 오후 10:00:03
// @downloadURL https://update.greasyfork.org/scripts/502081/%5B%EB%A3%A8%EC%8B%9C%ED%8D%BC%ED%99%8D%5D%20%EC%95%84%EC%8B%A4%20%EC%97%AC%EB%9F%AC%EB%8B%A8%EC%A7%80%EB%B9%84%EA%B5%90%20%ED%8E%B8%ED%95%98%EA%B2%8C%20%EC%8D%A8%EB%B3%B4%EC%9E%90.user.js
// @updateURL https://update.greasyfork.org/scripts/502081/%5B%EB%A3%A8%EC%8B%9C%ED%8D%BC%ED%99%8D%5D%20%EC%95%84%EC%8B%A4%20%EC%97%AC%EB%9F%AC%EB%8B%A8%EC%A7%80%EB%B9%84%EA%B5%90%20%ED%8E%B8%ED%95%98%EA%B2%8C%20%EC%8D%A8%EB%B3%B4%EC%9E%90.meta.js
// ==/UserScript==
(function() {
    'use strict';

    const currentVersion = GM_info.script.version;
    const scriptName = GM_info.script.name;
    console.log(scriptName + ' ' + "currentVersion: " + currentVersion);
    const updateUrl = GM_info.script.updateURL;
    const cafeUrl = 'https://cafe.naver.com/wecando7/11113482';
    const popupDismissKey = 'scriptUpdatePopupDismissed';
    const dismissDuration = 24 * 60 * 60 * 1000; // 24시간

    // 한국 시간을 가져오는 함수
    function getKoreanTime() {
        const now = new Date();
        const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000); // UTC 시간
        const koreanTime = new Date(utcNow + (9 * 60 * 60 * 1000)); // 한국 시간 (UTC+9)
        return koreanTime;
    }

    // 날짜를 24시간 형식으로 포맷하는 함수
    function formatDateTo24Hour(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    // 최신 버전을 가져오기 위해 메타 파일을 가져옴
    fetch(`${updateUrl}?_=${Date.now()}`)
        .then(response => response.text())
        .then(meta => {
            const latestVersionMatch = meta.match(/@version\s+([^\s]+)/);

            if (latestVersionMatch) {
                const latestVersion = latestVersionMatch[1];
                console.log(scriptName + ' ' + "latestVersion: " + latestVersion);

                if (currentVersion !== latestVersion) {
                    if (!shouldDismissPopup()) {
                        showUpdatePopup(latestVersion);
                    }
                }
            }
        })
        .catch(error => {
            console.error('Failed to fetch the latest version information:', error);
        });

    function shouldDismissPopup() {
        const lastDismissTime = localStorage.getItem(popupDismissKey);
        if (!lastDismissTime) return false;

        const timeSinceDismiss = getKoreanTime().getTime() - new Date(lastDismissTime).getTime();
        return timeSinceDismiss < dismissDuration;
    }

    function dismissPopup() {
        const koreanTime = getKoreanTime();
        const formattedTime = formatDateTo24Hour(koreanTime);
        localStorage.setItem(popupDismissKey, formattedTime);
    }

    function showUpdatePopup(latestVersion) {
        const popup = document.createElement('div');
        popup.style.position = 'fixed';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.padding = '20px';
        popup.style.backgroundColor = 'white';
        popup.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        popup.style.zIndex = '10000';

        const message = document.createElement('p');
        message.innerHTML = `${scriptName} (${latestVersion}) 버젼 업데이트가 있습니다. 확인하시겠습니까?<br><br>(닫기 버튼을 누르실 경우 24시간 동안 다시 알림이 뜨지 않습니다)<br><br>`;
        popup.appendChild(message);

        const confirmButton = document.createElement('button');
        confirmButton.textContent = '확인';
        confirmButton.style.marginRight = '10px';
        confirmButton.onclick = () => {
            window.open(cafeUrl, '_blank');
            document.body.removeChild(popup);
        };
        popup.appendChild(confirmButton);

        const closeButton = document.createElement('button');
        closeButton.textContent = '닫기';
        closeButton.onclick = () => {
            dismissPopup();
            document.body.removeChild(popup);
        };
        popup.appendChild(closeButton);

        document.body.appendChild(popup);
    }

    // Function to generate a unique ID for each pick element
    function generateUniqueId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    // 필터 기능을 위한 함수
    function filterOptions() {
        var input = document.getElementById("filterInput").value.toUpperCase();
        var div = document.getElementById("optionsDiv");
        var options = div.getElementsByTagName("div");

        for (var i = 0; i < options.length; i++) {
            var txtValue = options[i].textContent || options[i].innerText;
            if (txtValue.toUpperCase().indexOf(input) > -1) {
                options[i].style.display = "";
            } else {
                options[i].style.display = "none";
            }
        }
    }

    // Function to save area values and display them
    function saveAndDisplayAreaValues() {
        var area_si = $('#area_si_0').val();
        var area_gu = $('#area_gu_0').val();
        var area_si_text = $('#area_si_0 option:selected').text();
        var area_gu_text = $('#area_gu_0 option:selected').text();

        if (area_si && area_gu) {
            var areas = JSON.parse(localStorage.getItem('savedAreas')) || [];
            var areaObj = { si: area_si, gu: area_gu, si_text: area_si_text, gu_text: area_gu_text };

            // Check if the area already exists in local storage and remove it if found
            areas = areas.filter(area => !(area.si === area_si && area.gu === area_gu));

            // Ensure only 20 items are stored, remove the oldest if limit is reached
            if (areas.length >= 20) {
                areas.shift();
            }

            // Add the new area to the end of the list
            areas.push(areaObj);

            // Save the updated list to local storage
            localStorage.setItem('savedAreas', JSON.stringify(areas));

            // Render the saved areas
            renderSavedAreas();
        } else {
            alert('Please select both 시 and 구 values.');
        }
    }

    // Function to apply colors to font elements
    function applyColors() {
        var colors = ['#FF3838', '#3246F8', '#403E43', '#1BB70E', '#EF0FE2', '#AAA9AA', '#D78003', '#13EF4C', '#8E5EFB', '#F6F423'];
        var colorIndex = 0;

        $('#search_lst .pick').each(function() {
            var $this = $(this);
            if ($this.css('opacity') == 1) {
                $this.find('font').attr('color', colors[colorIndex % colors.length]);
                colorIndex++;
            } else if ($this.css('opacity') == 0.5) {
                $this.find('font').attr('color', '#F5F5F5');
            }
        });
    }

    // Function to render saved areas
    function renderSavedAreas() {
        var areas = JSON.parse(localStorage.getItem('savedAreas')) || [];
        var savedAreaContainer = $('#saved_area_container');
        savedAreaContainer.empty(); // Clear previous entries

        var table = $('<table style="width: 100%; border-collapse: collapse;"></table>');
        var row, cell, areaElement, deleteButton;

        var columns = 2;
        var totalAreas = areas.length;
        var rows = Math.ceil(totalAreas / columns);

        for (var i = 0; i < rows; i++) {
            row = $('<tr></tr>');
            for (var j = 0; j < columns; j++) {
                cell = $('<td style="padding: 3px; text-align: center; width: 50%; height: 15px; position: relative; border: 0px;"></td>');
                if (areas.length > 0) {
                    var area = areas.shift();
                    areaElement = $('<div class="saved-area" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; height: 15px; line-height: 15px; font-size: 13px; display: inline-block;"></div>')
                        .text(`${area.si_text} ${area.gu_text}`)
                        .data('si', area.si)
                        .data('gu', area.gu)
                        .click(function () {
                            $('#area_si_0').val($(this).data('si')).change();
                            setTimeout(() => { // Add a slight delay to ensure the change event for area_si_0 is processed
                                $('#area_gu_0').val($(this).data('gu')).change();
                            }, 300);
                        });

                    deleteButton = $('<span style="color: red; cursor: pointer; position: absolute; right: 5px; top: 0; font-size: 13px;">x</span>')
                        .data('si', area.si)
                        .data('gu', area.gu)
                        .click(function (e) {
                            e.stopPropagation(); // Prevent triggering the parent click event
                            var si = $(this).data('si');
                            var gu = $(this).data('gu');
                            var storedAreas = JSON.parse(localStorage.getItem('savedAreas')) || [];
                            storedAreas = storedAreas.filter(a => !(a.si === si && a.gu === gu));
                            localStorage.setItem('savedAreas', JSON.stringify(storedAreas));
                            renderSavedAreas();
                        });

                    cell.append(areaElement).append(deleteButton);
                }
                row.append(cell);
            }
            table.append(row);
        }

        savedAreaContainer.append(table);
    }

    // `area_apt_0` 요소를 클릭할 때 실행될 함수
document.getElementById('area_apt_0').addEventListener('mousedown', function(event) {
    event.preventDefault();
    event.stopPropagation();

    var existingDiv = document.getElementById('optionsDivContainer');
    if (existingDiv) {
        existingDiv.remove();
        return;
    }

    var optionsDivContainer = document.createElement('div');
    optionsDivContainer.id = 'optionsDivContainer';
    optionsDivContainer.style.position = 'fixed';
    optionsDivContainer.style.zIndex = '1000';
    optionsDivContainer.style.backgroundColor = '#fff';
    optionsDivContainer.style.border = '1px solid #ccc';
    optionsDivContainer.style.width = '70%';
    optionsDivContainer.style.maxHeight = '600px';
    optionsDivContainer.style.overflowY = 'scroll';

    var filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.id = 'filterInput';
    filterInput.placeholder = '검색...';
    filterInput.style.width = '100%';
    filterInput.style.boxSizing = 'border-box';
    filterInput.addEventListener('keyup', filterOptions); // 검색 필터링 함수 연결

    optionsDivContainer.appendChild(filterInput);

    var optionsDiv = document.createElement('div');
    optionsDiv.id = 'optionsDiv';
    var select = document.getElementById('area_apt_0');
    for (var i = 0; i < select.options.length; i++) {
        var optionDiv = document.createElement('div');
        optionDiv.textContent = select.options[i].textContent;
        optionDiv.setAttribute('data-value', select.options[i].value);
        optionDiv.style.cursor = 'pointer';
        optionDiv.style.padding = '2px 5px';

        if (select.options[i].selected) {
            optionDiv.style.backgroundColor = '#b3d4fc';
        }

        optionDiv.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent the click from bubbling up
            var value = this.getAttribute('data-value');
            select.value = value;

            var allOptions = optionsDiv.getElementsByTagName('div');
            for (var j = 0; j < allOptions.length; j++) {
                allOptions[j].style.backgroundColor = '';
            }
            this.style.backgroundColor = '#b3d4fc';

            var event = new Event('change', {
                'bubbles': true,
                'cancelable': true
            });
            select.dispatchEvent(event);

            optionsDivContainer.remove();
        });
        optionsDiv.appendChild(optionDiv);
    }

    optionsDivContainer.appendChild(optionsDiv);
    document.body.appendChild(optionsDivContainer);

    var rect = select.getBoundingClientRect();
    optionsDivContainer.style.top = rect.bottom + 'px';
    optionsDivContainer.style.left = rect.left + 'px';

    filterInput.focus();
});
// Helper function to decompose Hangul into Jamo
// 초성 테이블
const chosung = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const hangulBase = 44032;
const chosungBase = 588;

// 한글 초성을 추출하는 함수
function getChosung(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) - hangulBase;
        if (charCode >= 0 && charCode <= 11171) { // 한글 범위 내인지 체크
            result += chosung[Math.floor(charCode / chosungBase)];
        } else {
            result += text.charAt(i); // 한글이 아닌 경우 그대로 추가
        }
    }
    return result;
}

// 필터 기능을 위한 함수
function filterOptions() {
    var input = document.getElementById("filterInput").value.toUpperCase();
    var div = document.getElementById("optionsDiv");
    var options = div.getElementsByTagName("div");

    for (var i = 0; i < options.length; i++) {
        var txtValue = options[i].textContent || options[i].innerText;
        var chosungValue = getChosung(txtValue).toUpperCase();

        // 초성 또는 전체 텍스트가 입력값과 일치하는지 확인
        if (txtValue.toUpperCase().indexOf(input) > -1 || chosungValue.indexOf(input) > -1) {
            options[i].style.display = "";
        } else {
            options[i].style.display = "none";
        }
    }
}

// 클릭 시 외부를 클릭하면 div 제거
document.addEventListener('click', function(event) {
    var optionsDivContainer = document.getElementById('optionsDivContainer');
    if (optionsDivContainer && !optionsDivContainer.contains(event.target) && event.target.id !== 'area_apt_0') {
        optionsDivContainer.remove();
    }
});


    window.addPriceObj = function() {
        var idx = multiData.length;

        //console.log("Current multiData length: " + idx);

        if (idx >= 10) {
            alert('최대 10개까지 등록할 수 있습니다. 선택해제된 아파트가 있다면 대상에서 제외됩니다');
            return;
        }

        if (p_area == '' || p_area.length < 5) {
            alert('시구군을 선택하세요.');
            return;
        }

        var name = "";
        console.log('[addPriceObj] p_apt:', p_apt, '| typeof p_apt:', typeof p_apt, '| p_aptName:', p_aptName, '| p_areaName:', p_areaName, '| p_m2:', p_m2, '| p_m2Name:', p_m2Name);
        if (p_apt && String(p_apt).trim() !== '') {
            var optionText = $('#area_apt_0 option[value="' + p_apt + '"]').text();
            console.log('[addPriceObj] optionText from select:', optionText);
            name = p_aptName || optionText || '';
        } else {
            name = p_areaName;
        }
        console.log('[addPriceObj] resolved name:', name);

        if (p_m2 != '') {
            name += "(" + p_m2Name + ")";
        }

        var obj = {
            "area": p_area,
            "building": p_building,
            "apt": p_apt,
            "m2": p_m2,
            "name": name,
            "id": generateUniqueId() // Generate unique ID for each object
        };

        // Check if the object is already in the list
        var objIndex = multiData.findIndex(item => item.area === obj.area && item.building === obj.building && String(item.apt) === String(obj.apt) && item.m2 === obj.m2);

        if (objIndex !== -1) {
            alert('이미 등록된 단지입니다.');
            return;
        }

        // Add the object if it does not exist
        multiData.push(obj);

        var tooltip = '';
        if (name.indexOf('평') > 0 && p_m2.length > 0) {
            tooltip = p_m2 + '㎡';
        }

        var index = multiData.length - 1; // Get the current index

        // Initialize the button HTML
        var buttonHtml = '';

        // Check if 'apt' has a value, and if so, create the button HTML
        if (p_apt && String(p_apt).trim() !== '') {
            var aptUrl = 'https://asil.kr/?' + String(p_apt);
            buttonHtml = ' <a href="' + aptUrl + '" target="_blank" style="display:inline-block;vertical-align:middle;"><span class="link">🔎</span></a>';
        }

        // Append the new HTML with the dynamic button
        $("#search_lst").append('<span class="pick" data-idx="' + index + '" data-id="' + obj.id + '" data-obj=\'' + JSON.stringify(obj) + '\'><font color="' + multiColor[index] + '">■</font> <span title="' + tooltip + '" style="vertical-align: middle;">' + name + '</span>' + buttonHtml + ' <a href="javascript:delPriceObj(\'' + obj.id + '\')"><span class="del">선택해제</span></a></span>');

        setDataMulti();

        // Apply colors to font elements
        applyColors();

        saveAndDisplayAreaValues();
    }

    // Function to delete price object
    window.delPriceObj = function(id) {
        console.log('[delPriceObj] 호출됨. id:', id);
        console.log('[delPriceObj] 삭제 전 총 pick 수:', $('#search_lst .pick').length, '/ multiData 수:', multiData.length);
        // DOM 요소 먼저 제거 (processActiveSpans가 올바른 DOM 상태를 읽도록)
        var $el = $('#search_lst .pick[data-id="' + id + '"]');
        console.log('[delPriceObj] data-id 매칭 pick 수:', $el.length);
        if (!$el.length) {
            // 원본 페이지 .pick (data-id 없음)은 숫자 인덱스로 매칭
            var numericId = parseInt(id);
            if (!isNaN(numericId)) {
                $el = $('#search_lst .pick:not([data-id])').eq(numericId);
                console.log('[delPriceObj] 숫자 인덱스 fallback 결과:', $el.length, '개');
            } else {
                console.log('[delPriceObj] id가 숫자가 아님, 삭제 대상 없음');
            }
        }
        $el.remove();
        console.log('[delPriceObj] 제거 후 남은 pick 수:', $('#search_lst .pick').length);

        // Update data-idx attributes of remaining items
        $('#search_lst .pick').each(function(i) {
            $(this).attr('data-idx', i);
            var dataId = $(this).attr('data-id');
            if (dataId !== undefined) {
                $(this).find('a:has(> .del)').attr('href', 'javascript:delPriceObj(\'' + dataId + '\')');
            }
        });

        // 조회 버튼과 동일하게 남은 pick에서 multiData 재구성 후 차트 갱신
        processActiveSpans();
    }

    // Function to deactivate all spans
    function deactivateAllSpans() {
        $('#search_lst .pick').each(function() {
            var $this = $(this);
            $this.css('opacity', '0.5');  // Dim the span to indicate it is inactive
        });

        // Clear multiData after deactivating all spans
        multiData = [];
        setDataMulti();
    }

    // Function to process active span elements
    function processActiveSpans() {
        var newMultiData = [];
        var allPicks = $('#search_lst .pick');
        console.log('[processActiveSpans] 시작. 총 pick 수:', allPicks.length);

        allPicks.each(function(i) {
            var $this = $(this);
            var opacity = $this.css('opacity');
            var dataId = $this.attr('data-id') || '(없음)';
            var hasDataObj = !!$this.attr('data-obj');
            console.log('[processActiveSpans] pick[' + i + '] opacity:', opacity, '| data-id:', dataId, '| data-obj:', hasDataObj);
            if (opacity == 1) {
                var dataObj = $this.attr('data-obj');
                if (dataObj) {
                    // data-obj 있는 항목 (addPriceObj로 추가된 항목)
                    var obj = JSON.parse(dataObj);
                    var exists = newMultiData.findIndex(item => item.area === obj.area && item.building === obj.building && item.apt === obj.apt && item.m2 === obj.m2);
                    console.log('[processActiveSpans] → data-obj 있음, name:', obj.name, '중복여부:', exists !== -1);
                    if (exists === -1) newMultiData.push(obj);
                } else {
                    var dId = $this.attr('data-id');
                    if (dId && window._initMultiDataMap && window._initMultiDataMap[dId]) {
                        // data-id 있고 맵에 저장된 항목
                        var savedObj = window._initMultiDataMap[dId];
                        var exists = newMultiData.findIndex(item => item.id === savedObj.id);
                        console.log('[processActiveSpans] → _initMultiDataMap 복원, name:', savedObj.name);
                        if (exists === -1) newMultiData.push(savedObj);
                    } else if (window._initMultiDataMap) {
                        // data-obj도 data-id도 없는 원본 pick: _initMultiDataMap에 저장된 initFromUrl 항목 전부 추가
                        console.log('[processActiveSpans] → data-id/obj 모두 없음, _initMultiDataMap 전체 추가');
                        Object.values(window._initMultiDataMap).forEach(function(savedObj) {
                            var exists = newMultiData.findIndex(item => item.id === savedObj.id);
                            if (exists === -1) newMultiData.push(savedObj);
                        });
                    } else {
                        console.log('[processActiveSpans] → data-id/obj 없고 _initMultiDataMap도 없음 → 무시');
                    }
                }
            }
        });

        console.log('[processActiveSpans] 결과 newMultiData 수:', newMultiData.length);
        multiData = newMultiData;
        applyColors();
        setDataMulti();
    }

    // Function to update chart data
    function setDataMulti() {
        if (document.getElementById("chart0") != null) {
            document.getElementById("chart0").showAdditionalPreloader();
        }

        p_deal = '';
        p_deal = $(':radio[name="chkp_deal"]:checked').val();

        var _price = $(':radio[name="radioPrice"]:checked').val(); //최고가,최저가,평균가
        var _day = false; //$(':radio[name="radioDay"]:checked').val(); //월단위,10일단위

        var param = "";
        for (var i = 0; i < multiData.length; i++) {
            param += "&area" + i + "=" + multiData[i].area + "&building" + i + "=" + multiData[i].building + "&apt" + i + "=" + multiData[i].apt + "&m2" + i + "=" + multiData[i].m2;
        }
        execJs("/app/data/data_price_multi_js.jsp?ch=0&t=" + new Date().getTime() + "&cnt=" + multiData.length + param + "&deal=" + p_deal + "&price=" + _price + "&day=" + _day + "&mode=count&sY=" + p_sY + "&sM=" + p_sM +"&eY=" + p_eY + "&eM=" + p_eM);
    }

    // 전국 단지 검색 함수
    function searchGlobalApt(keyword) {
        if (!keyword || keyword.trim().length < 2) {
            $('#global_apt_search_results').hide().empty();
            return;
        }
        fetch('https://asil.kr/json/getAptname_ver_3_4.jsp?os=pc&aptname=' + encodeURIComponent(keyword.trim()), {
            credentials: 'include'
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            // 배열 또는 {list: [...]} 형태 모두 처리
            var list = Array.isArray(data) ? data : (data.list || data.data || []);
            console.log('[globalSearch] 응답 수:', list.length, '첫번째 항목:', list[0]);
            var $results = $('#global_apt_search_results').empty();
            if (!list.length) {
                $results.html('<div style="padding:8px 10px;font-size:13px;color:#666;">검색 결과 없음</div>').show();
                return;
            }
            list.forEach(function(item) {
                var name    = item.name      || item.aptname   || item.apt_name  || '';
                var area    = item.area      || item.areacode   || item.area_code || '';
                var building= item.building  || 'apt';
                var apt     = String(item.seq || item.apt || item.aptcode || item.apt_code || '');
                // desc 예: '경기 안양시 만안구 안양동 / 16년11월 / 4250세대 / 아파트'
                var descParts = item.desc ? item.desc.split(' / ') : [];
                var region     = descParts[0] || (item.sigungu || item.gu || item.areaname || '');
                var year       = descParts[1] || '';
                var households = descParts[2] || '';
                if (!name || !apt) return; // 필드 파악 불가 항목은 스킵
                var subLabel = [year, households].filter(Boolean).join(' · ');
                var $row = $('<div>')
                    .css({ padding:'6px 10px', cursor:'pointer', borderBottom:'1px solid #eee' })
                    .data('apt-info', { area: area, building: building, apt: apt, name: name, region: region });
                $('<div>').text(name + (region ? ' (' + region + ')' : '')).css({ fontSize:'13px' }).appendTo($row);
                if (subLabel) $('<div>').text(subLabel).css({ fontSize:'11px', color:'#888', marginTop:'1px' }).appendTo($row);
                $row.on('mouseenter', function() { $(this).css('background','#f0f4ff'); })
                    .on('mouseleave', function() { $(this).css('background',''); })
                    .on('click', function() {
                        addGlobalAptToList($(this).data('apt-info'));
                        $('#global_apt_search_input').val('');
                        $('#global_apt_search_results').hide().empty();
                    });
                $results.append($row);
            });
            $results.show();
        })
        .catch(function(err) {
            console.error('[globalSearch] 오류:', err);
            $('#global_apt_search_results').html('<div style="padding:8px 10px;font-size:13px;color:#c00;">검색 오류</div>').show();
        });
    }

    function addGlobalAptToList(info) {
        var building = info.building || 'apt';
        var apt      = String(info.apt);
        var name     = info.name;

        // area_apt_0에 단지 세팅 → area_m2_0 평형 목록 로딩
        function doSetApt() {
            var aptSel = document.getElementById('area_apt_0');
            if (!aptSel.querySelector('option[value="' + apt + '"]')) {
                var o = document.createElement('option');
                o.value = apt; o.textContent = name;
                aptSel.appendChild(o);
            }
            aptSel.value = apt;
            aptSel.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        }

        // investor.jsp?apt=... 응답 HTML에서 area_si_0/area_gu_0 selected 값 파싱
        fetch('https://asil.kr/app/investor.jsp?os=pc&apt=' + apt + '&building=' + building, {
            credentials: 'include'
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var siSel = doc.getElementById('area_si_0');
            var guSel = doc.getElementById('area_gu_0');
            var siVal = siSel ? siSel.value : '';
            var guVal = guSel ? guSel.value : '';
            console.log('[addGlobalAptToList] 파싱 siVal:', siVal, 'guVal:', guVal);

            if (!siVal) { doSetApt(); return; }

            // area_si_0 선택
            $('#area_si_0').val(siVal);

            if (!guVal) {
                // gu 코드를 못 찾으면 si change만 하고 apt 세팅
                $('#area_si_0')[0].dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                setTimeout(doSetApt, 1000);
                return;
            }

            // area_gu_0 옵션이 JSONP로 로드될 때까지 대기
            var guEl = document.getElementById('area_gu_0');
            var guDone = false; var guTimer = null;
            var guObs = new MutationObserver(function() {
                clearTimeout(guTimer);
                guTimer = setTimeout(function() {
                    if (guDone) return; guDone = true;
                    guObs.disconnect();

                    var $opt = $('#area_gu_0 option[value="' + guVal + '"]');
                    if (!$opt.length) { doSetApt(); return; }
                    $('#area_gu_0').val(guVal);

                    // area_apt_0 옵션이 JSONP로 로드될 때까지 대기
                    var aptEl = document.getElementById('area_apt_0');
                    var aptDone = false; var aptTimer = null;
                    var aptObs = new MutationObserver(function() {
                        clearTimeout(aptTimer);
                        aptTimer = setTimeout(function() {
                            if (aptDone) return; aptDone = true;
                            aptObs.disconnect();
                            doSetApt();
                        }, 300);
                    });
                    aptObs.observe(aptEl, { childList: true });
                    setTimeout(function() { if (!aptDone) { aptDone = true; aptObs.disconnect(); doSetApt(); } }, 4000);

                    $('#area_gu_0')[0].dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                }, 300);
            });
            guObs.observe(guEl, { childList: true });
            setTimeout(function() { if (!guDone) { guDone = true; guObs.disconnect(); doSetApt(); } }, 4000);

            // si change → setAreaSi0() → area_gu_0 JSONP 로딩
            $('#area_si_0')[0].dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        })
        .catch(function(err) {
            console.error('[addGlobalAptToList] fetch 오류:', err);
            doSetApt();
        });
    }

    // Initialize chart and slider on document ready
    $(document).ready(function() {

        // area_apt_0에 options 중복 방지: 옵션이 변경될 때마다 debounce 후 value 기준 dedup
        (function() {
            var aptSel = document.getElementById('area_apt_0');
            if (!aptSel) return;
            var dedupTimer = null;
            var dedupObs = new MutationObserver(function() {
                clearTimeout(dedupTimer);
                dedupTimer = setTimeout(function() {
                    dedupObs.disconnect(); // 제거 작업이 observer를 재트리거하지 않도록 일시 해제
                    var seen = {};
                    var toRemove = [];
                    for (var i = 0; i < aptSel.options.length; i++) {
                        var v = aptSel.options[i].value;
                        if (seen[v] !== undefined) {
                            toRemove.push(i);
                        } else {
                            seen[v] = i;
                        }
                    }
                    for (var j = toRemove.length - 1; j >= 0; j--) {
                        aptSel.remove(toRemove[j]);
                    }
                    if (toRemove.length > 0) console.log('[dedup] area_apt_0 중복 option', toRemove.length, '개 제거. 현재:', aptSel.options.length);
                    dedupObs.observe(aptSel, { childList: true }); // 다시 감지 시작
                }, 100); // 100ms debounce: 비동기로 나눠 추가되는 옵션도 모두 반영 후 실행
            });
            dedupObs.observe(aptSel, { childList: true });
        })();

        // 강남구가 선택되었는지 확인하고 강제로 구 리스트 새로고침
        const area_si = $('#area_si_0').val();  // 'area_si_0'의 값 가져오기
        const area_gu = $('#area_gu_0').val();  // 'area_gu_0'의 값 가져오기

        if (area_si && area_gu) {
            // 강제로 구의 단지 리스트를 불러오도록 'change' 이벤트 트리거
            //$('#area_si_0').trigger('change');
            $('#area_gu_0').trigger('change');
        }

        chartVars0 = "rMateOnLoadCallFunction=chartReadyHandler0";
        rMateChartH5.create("chart0", "chartHolder0", chartVars0, "100%", "100%");

        var slider = document.getElementById('slider_year');
        if (!slider.noUiSlider) {
            noUiSlider.create(slider, {
                start:[timestamp(2006, 0), timestamp(2024, 6)],
                step: 24 * 3600000, connect: true, range:{'min': timestamp(2006, 0), 'max': timestamp(2024, 6)}
            });
            slider.noUiSlider.on('update', function(values, handle) {
                var date = new Date(+values[handle]);
                if (handle === 0) {
                    c_sY = date.getFullYear();
                    c_sM = date.getMonth()+1;
                    document.querySelector("#date_start").innerHTML = (c_sY+'').substring(2,4)+'년 '+c_sM+'월';
                } else {
                    c_eY = date.getFullYear();
                    c_eM = date.getMonth()+1;
                    document.querySelector("#date_end").innerHTML = (c_eY+'').substring(2,4)+'년 '+c_eM+'월';
                }
            });
            slider.noUiSlider.on('change', function(values) {
                p_sY = c_sY;
                p_sM = c_sM;
                p_eY = c_eY;
                p_eM = c_eM;
                setDataMulti();
            });
        }

        $('#p_min_m2').keyup(function () {
            if(p_apt && typeof p_apt === 'string' && p_apt.trim() !== '') {
                $('#p_min_m2').val('');
                $('#p_max_m2').val('');
            } else {
                p_setSize();
            }
        });

        $('#p_max_m2').keyup(function () {
            if(p_apt && typeof p_apt === 'string' && p_apt.trim() !== '') {
                $('#p_min_m2').val('');
                $('#p_max_m2').val('');
            } else {
                p_setSize();
            }
        });

        // Add the 모두 선택 해제 button above the 조회 button
        $('a.del[href="javascript:removeAllPriceObj()"]').before('<a class="del" id="deselect_all_btn" href="javascript:void(0)" style="width:100%; margin-left:0; color:#fff; background:#999;">모두 선택 해제</a>');

        // Add the 조회 button before the 전체삭제 button
        $('a.del[href="javascript:removeAllPriceObj()"]').before('<a class="del" id="search_btn" href="javascript:void(0)" style="width:100%; margin-left:0; color:#fff; background:#999;">조회</a>');

        // Attach event handler for 모두 선택 해제 button
        $('#deselect_all_btn').click(function() {
            deactivateAllSpans();
        });

        // Attach event handler for 조회 button
        $('#search_btn').click(function() {
            processActiveSpans();
        });

        // Attach event handler for 저장된 지역 보기
        var toggleButton = $('<button id="toggle_saved_area_button" class="search-btn" style="width: calc(100% - 32px); color:#fff; background:#1BB70E; margin-bottom: 3px;margin-left: 16px; font-size:13px;font-weight:700">최근 검색 지역 보기</button>');
        var savedAreaContainer = $('<div id="saved_area_container" style="display: none; border: 0px solid #ccc; padding: 10px; margin-bottom: 10px;"></div>');

        // 전국 단지 검색 UI
        var $globalSearchWrap = $(
            '<div id="global_apt_search_wrap" style="padding:6px 16px 4px;">' +
            '<input type="text" id="global_apt_search_input" autocomplete="off" placeholder="단지명 전국 검색..." ' +
            'style="width:100%;box-sizing:border-box;padding:6px 8px;font-size:13px;border:1px solid #aaa;border-radius:4px 4px 0 0;outline:none;">' +
            '<div id="global_apt_search_results" style="display:none;border:1px solid #aaa;border-top:none;max-height:400px;overflow-y:scroll;scrollbar-width:auto;background:#fff;border-radius:0 0 4px 4px;position:relative;z-index:9999;"></div>' +
            '</div>'
        );
        // 스크롤바 강제 표시 (사이트 CSS에 의해 숨겨지는 경우 대비)
        $('<style>#global_apt_search_results::-webkit-scrollbar{width:8px;display:block}#global_apt_search_results::-webkit-scrollbar-thumb{background:#aaa;border-radius:4px}#global_apt_search_results::-webkit-scrollbar-track{background:#f0f0f0}</style>').appendTo('head');

        // Append the button and container to the DOM
        var selWrap = $('.sel_wrap');
        if (selWrap.length) {
            selWrap.before($globalSearchWrap);
            selWrap.before(toggleButton);
            selWrap.before(savedAreaContainer);

            // Attach click event to toggle button
            toggleButton.click(function() {
                savedAreaContainer.toggle();
                if (savedAreaContainer.is(':visible')) {
                    $(this).text('최근 검색 지역 닫기');
                } else {
                    $(this).text('최근 검색 지역 보기');
                }
            });

            // Render the saved areas
            renderSavedAreas();

            // 전국 단지 검색 이벤트
            var globalSearchTimer;
            $('#global_apt_search_input').on('input', function() {
                var kw = $(this).val();
                clearTimeout(globalSearchTimer);
                if (!kw || kw.trim().length < 2) {
                    $('#global_apt_search_results').hide().empty();
                    return;
                }
                globalSearchTimer = setTimeout(function() { searchGlobalApt(kw); }, 400);
            });
            // 검색 결과 외부 클릭 시 닫기 (iframe 내부 클릭)
            $(document).on('mousedown.globalSearch', function(e) {
                if (!$(e.target).closest('#global_apt_search_wrap').length) {
                    $('#global_apt_search_results').hide();
                }
            });
            // iframe 외부(지도 등) 클릭 시 blur로 닫기
            $('#global_apt_search_input').on('blur', function() {
                setTimeout(function() {
                    $('#global_apt_search_results').hide();
                }, 200);
            });
        } else {
            console.error("#sel_wrap not found");
        }

        // Apply colors and attach click handlers on document ready
        applyColors();

        // #search_lst에 사이트 자체 JS가 .pick을 동적 추가하는 경우 감지 (지도 라벨 클릭 등)
        (function observeSearchLst() {
            var searchLstEl = document.getElementById('search_lst');
            if (!searchLstEl) return;
            var existingPicks = searchLstEl.querySelectorAll('.pick');
            console.log('[observeSearchLst] 설정 시점 기존 pick 수:', existingPicks.length);
            existingPicks.forEach(function(p, i) {
                console.log('[observeSearchLst] 기존 pick[' + i + '] data-id:', p.getAttribute('data-id') || '(없음)', '| data-obj:', !!p.getAttribute('data-obj'));
            });

            var obs = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType !== 1) return;
                        var $pick = $(node);
                        // data-id 없는 새 .pick만 처리
                        if (!$pick.hasClass('pick') || $pick.attr('data-id')) return;

                        // 사이트의 전역 변수에서 현재 단지 정보 읽기
                        var curArea = (typeof p_area !== 'undefined') ? p_area : '';
                        var curBuilding = (typeof p_building !== 'undefined') ? p_building : 'apt';
                        var curApt = (typeof p_apt !== 'undefined') ? String(p_apt) : '';
                        var curM2 = (typeof p_m2 !== 'undefined') ? p_m2 : '';
                        var curName = $pick.find('span').first().text() || ((typeof p_aptName !== 'undefined') ? p_aptName : '');

                        var objId = generateUniqueId();
                        var obj = {
                            "area": curArea,
                            "building": curBuilding,
                            "apt": curApt,
                            "m2": curM2,
                            "name": curName,
                            "id": objId
                        };

                        // data-id, data-obj 부여
                        $pick.attr('data-id', objId).attr('data-obj', JSON.stringify(obj));
                        $pick.find('a:has(> .del)').attr('href', 'javascript:delPriceObj(\'' + objId + '\')');

                        // 사이트 JS가 추가한 pick에는 바로가기 버튼이 없으므로 직접 삽입 (이름 span 바로 뒤에 추가)
                        if (curApt && !$pick.find('.link').length) {
                            var aptUrl = 'https://asil.kr/?' + curApt;
                            var $nameSpan = $pick.find('span').first();
                            $nameSpan.css('vertical-align', 'middle'); // addPriceObj와 동일하게 정렬
                            $nameSpan.after(' <a href="' + aptUrl + '" target="_blank" style="display:inline-block;vertical-align:middle;"><span class="link">🔎</span></a>');
                        }

                        // multiData에 중복 체크 후 추가
                        var dup = multiData.findIndex(function(item) {
                            return item.area === obj.area && item.building === obj.building && String(item.apt) === String(obj.apt) && item.m2 === obj.m2;
                        });
                        if (dup === -1) {
                            multiData.push(obj);
                            console.log('[observeSearchLst] multiData에 추가:', obj);
                        } else {
                            // 이미 multiData에 있는 항목이면 data-id/href를 기존 id로 맞춰줌 (delPriceObj가 찾을 수 있도록)
                            var existingId = multiData[dup].id;
                            if (!existingId) {
                                // 사이트 자체 JS가 push한 항목은 id 필드가 없음 → 새 id를 부여
                                multiData[dup].id = objId;
                                existingId = objId;
                                console.log('[observeSearchLst] 기존 항목에 id 없음 → 새 id 부여:', objId);
                            } else {
                                console.log('[observeSearchLst] 중복 발견, 기존 id로 교체:', objId, '→', existingId);
                            }
                            $pick.attr('data-id', existingId).attr('data-obj', JSON.stringify(multiData[dup]));
                            $pick.find('a:has(> .del)').attr('href', 'javascript:delPriceObj(\'' + existingId + '\')');
                        }

                        applyColors();
                        setDataMulti();
                    });
                });
            });

            obs.observe(searchLstEl, { childList: true });
        })();

        // URL 파라미터로 초기 multiData 설정 (원본 사이트에서 넘어온 경우)
        (function initFromUrl() {
            var urlParams = new URLSearchParams(window.location.search);
            var initApt = urlParams.get('apt');
            var initBuilding = urlParams.get('building') || 'apt';
            console.log('[initFromUrl] apt:', initApt, 'building:', initBuilding);
            if (!initApt) { console.log('[initFromUrl] apt 파라미터 없음 → 종료'); return; }

            var initArea = $('#area_gu_0').val();
            console.log('[initFromUrl] area_gu_0 val:', initArea);
            if (!initArea || initArea.length < 5) { console.log('[initFromUrl] area값 부족 → 종료'); return; }

            var aptSelectEl = document.getElementById('area_apt_0');
            console.log('[initFromUrl] area_apt_0 options 수:', aptSelectEl.options.length);

            function tryInit() {
                var optEl = aptSelectEl.querySelector('option[value="' + initApt + '"]');
                console.log('[initFromUrl] tryInit - option 찾음:', optEl ? optEl.textContent : '없음');
                if (!optEl) return false;

                var initAptName = optEl.textContent;
                // 셀렉트 박스 표시값을 해당 단지로 설정하고 area_m2_0 갱신 트리거
                aptSelectEl.value = initApt;
                aptSelectEl.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                var objId = generateUniqueId();
                var obj = {
                    "area": initArea,
                    "building": initBuilding,
                    "apt": initApt,
                    "m2": "",
                    "name": initAptName,
                    "id": objId
                };

                if (multiData.findIndex(function(item) {
                    return String(item.apt) === String(obj.apt) && item.area === obj.area && item.building === obj.building;
                }) !== -1) { console.log('[initFromUrl] 이미 multiData에 존재'); return true; }

                multiData.push(obj);
                console.log('[initFromUrl] multiData에 추가됨:', obj);

                // processActiveSpans에서 복원할 수 있도록 id→obj 맵 저장
                window._initMultiDataMap = window._initMultiDataMap || {};
                window._initMultiDataMap[objId] = obj;

                // 원본 페이지의 pick 항목에 data-id, data-obj 부여
                var $origPick = $('#search_lst .pick:not([data-id])').first();
                console.log('[initFromUrl] 원본 pick 요소 찾음:', $origPick.length > 0);
                if ($origPick.length) {
                    $origPick.attr('data-id', objId).attr('data-obj', JSON.stringify(obj));
                    $origPick.find('a:has(> .del)').attr('href', 'javascript:delPriceObj(\'' + objId + '\')');
                }

                setDataMulti();
                applyColors();
                console.log('[initFromUrl] 초기화 완료');
                return true;
            }

            if (!tryInit()) {
                console.log('[initFromUrl] option 아직 없음 → MutationObserver 대기 중');
                var obs = new MutationObserver(function(mutations, observer) {
                    if (tryInit()) { observer.disconnect(); console.log('[initFromUrl] MutationObserver 성공'); }
                });
                obs.observe(aptSelectEl, { childList: true });
            }
        })();

        // Attach click event to .pick elements
        $(document).on('click', '#search_lst .pick span', function() {
            var parentSpan = $(this).parent();
            var dataObj = parentSpan.attr('data-obj');

            // Ensure data-obj is valid JSON before parsing
            if (dataObj) {
                var obj = JSON.parse(dataObj);

                // Check if the object is already in the multiData list
                var objIndex = multiData.findIndex(item => item.area === obj.area && item.building === obj.building && item.apt === obj.apt && item.m2 === obj.m2);

                if (objIndex !== -1) {
                    // Remove item from multiData
                    multiData.splice(objIndex, 1);
                    parentSpan.css('opacity', '0.5');  // Dim the span to indicate it is inactive
                } else {
                    // Add item to multiData
                    if (multiData.length >= 10) {
                        alert('최대 10개까지 조회할 수 있습니다.');
                        return;  // Stop further execution
                    }
                    multiData.push(obj);
                    parentSpan.css('opacity', '1');  // Restore the span to full opacity
                }

                applyColors();
            }
        });
    });
 // Initial sizes and colors
    let initialPanelWidth = 390;
    let minPanelWidth = 390;
    let panelStep = 100;
    let currentPanelWidth = initialPanelWidth;
    let originalMapWidth = window.parent.jQuery('#contents > div.map_wrap').width(); // Store initial map width
    let minimumMapWidth = 100; // Set minimum map width

    // Calculate the maximum allowed panel size based on the initial map size
    let maxPanelWidth = originalMapWidth + initialPanelWidth - minimumMapWidth;

    // Function to update panel size
    function resizePanel(newWidth) {

        // 매번 현재 지도 너비를 기준으로 maxPanelWidth 재계산
        let currentMapWidth = window.parent.jQuery('#contents > div.map_wrap').width() || 0;
        maxPanelWidth = currentMapWidth + currentPanelWidth - minimumMapWidth;

        currentPanelWidth = Math.max(minPanelWidth, Math.min(newWidth, maxPanelWidth)); // Ensure the width stays within the min and max bounds

        // Update the width of the .detail_wrap.open element
        window.parent.jQuery('#sub2_div').css('width', currentPanelWidth); // Updated to target the specific element

        // Calculate new map panel width based on the initial map width
        let mapPanel = window.parent.jQuery('#contents > div.map_wrap');
        let newMapWidth = `calc(100% - ${currentPanelWidth + 390}px)`; // Dynamically set the width and reduce further by 390px


        mapPanel.css('width', newMapWidth);
        //console.log(`Map width set to: ${newMapWidth}`);

        // Adjust the width of the span elements
        document.querySelectorAll("#search_lst .pick").forEach(item => {
            item.style.width = "100%";
            item.style.display = "block";
            item.style.boxSizing = "border-box";
            item.style.clear = "both"; // Ensures each item is displayed on a new line
        });
    }


    // Event handler for the left button to decrease the panel size
    function decreasePanelWidth() {
        resizePanel(currentPanelWidth - panelStep);
    }

    // Event handler for the right button to increase the panel size
    function increasePanelWidth() {
        resizePanel(currentPanelWidth + panelStep);
    }

    // Add left and right buttons next to the subtitle
// Add left and right buttons below the #slider_year_wrap
// Add left and right buttons below the #slider_year_wrap
let sliderYearWrap = document.querySelector('.slider_year_wrap');
if (sliderYearWrap) {
    // Check if the buttons are already added and remove them if they exist
    let existingWrapper = document.querySelector('#sizeControlWrapper');
    if (existingWrapper) {
        existingWrapper.remove();
    }

    // Create new button wrapper
    let buttonWrapper = document.createElement('div');
    buttonWrapper.id = 'sizeControlWrapper';
    buttonWrapper.style.display = 'inline-flex';
    buttonWrapper.style.alignItems = 'center'; // Align items vertically centered
    buttonWrapper.style.marginTop = '10px'; // Add space above the buttons

    // Shared button styles
    const buttonStyle = {
        padding: '5px 10px',
        margin: '0 5px',
        fontSize: '13px',
        fontFamily: '"Arial", sans-serif', // Using Arial, but you can change it to another font like 'Roboto' or 'Open Sans'
        backgroundColor: '#007BFF', // Light blue background for the buttons
        color: 'white', // White text color
        border: '1px solid #007BFF',
        borderRadius: '5px', // Rounded corners
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
    };

    let decreaseButton = document.createElement('button');
    decreaseButton.textContent = '⬅️ Size';
    Object.assign(decreaseButton.style, buttonStyle);
    decreaseButton.onmouseover = () => decreaseButton.style.backgroundColor = '#0056b3'; // Darker blue on hover
    decreaseButton.onmouseout = () => decreaseButton.style.backgroundColor = '#007BFF';
    decreaseButton.onclick = decreasePanelWidth;

    let increaseButton = document.createElement('button');
    increaseButton.textContent = 'Size ➡️';
    Object.assign(increaseButton.style, buttonStyle);
    increaseButton.onmouseover = () => increaseButton.style.backgroundColor = '#0056b3';
    increaseButton.onmouseout = () => increaseButton.style.backgroundColor = '#007BFF';
    increaseButton.onclick = increasePanelWidth;

    // Create the new button that opens the URL
    let openUrlButton = document.createElement('button');
    openUrlButton.textContent = '크게 보기';
    Object.assign(openUrlButton.style, buttonStyle);
    openUrlButton.onmouseover = () => openUrlButton.style.backgroundColor = '#0056b3';
    openUrlButton.onmouseout = () => openUrlButton.style.backgroundColor = '#007BFF';
    openUrlButton.onclick = function() {
        window.open('https://asil.kr/app/investor.jsp?os=pc&area=11680', '_blank');
    };

    // Append the buttons to the wrapper
    buttonWrapper.appendChild(decreaseButton);
    buttonWrapper.appendChild(increaseButton);
    buttonWrapper.appendChild(openUrlButton);

    // Append the button wrapper below the #slider_year_wrap element
    sliderYearWrap.appendChild(buttonWrapper);
} else {
    console.error('#slider_year_wrap not found.');
}



   function handleDisplayChange() {
    const sub2Div = window.parent.jQuery('#sub2_div');
    const mapPanel = window.parent.jQuery('#contents > div.map_wrap');
    let previousDisplayStyle = sub2Div.css('display'); // Store the initial display state

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.attributeName === 'style') {
                const currentDisplayStyle = sub2Div.css('display');
                // Check if the previous state was not 'block' and the new state is 'block'
                if (previousDisplayStyle !== 'block' && currentDisplayStyle === 'block') {
                    // sub2_div가 나타나면 패널 너비를 currentPanelWidth로 고정하고 지도 크기 조정
                    sub2Div.css('width', currentPanelWidth + 'px');
                    mapPanel.css('width', `calc(100% - ${currentPanelWidth + 390}px)`);
                    //console.log('Map width set to: calc(100% - 780px) because sub2_div is now visible');
                } else if (currentDisplayStyle === 'none') {
                    // sub2_div가 숨겨졌을 때, 지도의 크기를 원래대로 되돌림
                    mapPanel.css('width', '');
                    //console.log('Map width set to: calc(100% - 390px) because sub2_div is now hidden');
                }
                // Update the previousDisplayStyle to the current state
                previousDisplayStyle = currentDisplayStyle;
            }
        });
    });

    observer.observe(sub2Div[0], { attributes: true, attributeFilter: ['style'] });
}

// Call the function to start monitoring when the document is ready
$(document).ready(function() {
    handleDisplayChange();
});



    // Adjust the width of the span elements when the document is ready
    $(document).ready(function() {
        document.querySelectorAll("#search_lst .pick").forEach(item => {
            item.style.width = "100%";
            item.style.display = "block";
            item.style.boxSizing = "border-box";
            item.style.clear = "both"; // 추가: 항목이 강제로 한 줄에 하나씩만 나타나도록 보장
        });
      handleDisplayChange();
    });
})();
