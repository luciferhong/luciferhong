// 구글 시트 캘린더 → 구글 캘린더 동기화
// 사용법: 시트 상단 메뉴 [홍부 캘린더] → [구글 캘린더 동기화]

const CATEGORIES = ["일정", "강의", "과제", "독서", "시세", "임보", "임장", "투자", "루틴", "개인"];
const ROWS_PER_WEEK = 11; // 날짜 행 1 + 카테고리 행 10

// 시트에서 카테고리 구분표 읽기 (카테고리열 옆 구분열: "일정" → event, "할일" → task)
function readCategoryTypeFromSheet(data) {
  const typeMap = {};
  let catCol = -1, headerRow = -1;

  for (let i = 0; i < data.length && headerRow === -1; i++) {
    for (let j = 0; j < data[i].length; j++) {
      if (String(data[i][j]).trim() === '카테고리') {
        headerRow = i;
        catCol = j;
        break;
      }
    }
  }
  if (headerRow === -1) return null;

  const typeCol = catCol + 1;
  for (let i = headerRow + 1; i < data.length; i++) {
    const cat  = String(data[i][catCol]).trim();
    const type = String(data[i][typeCol]).trim();
    if (cat && type) {
      typeMap[cat] = type === '일정' ? 'event' : 'task';
    }
  }
  return typeMap;
}

// getDisplayValues()는 항상 문자열 반환 — 셀 포맷 무관하게 화면 표시값 그대로 읽음
function isDateNum(val) {
  const t = String(val).trim();
  return /^\d+$/.test(t) && +t >= 1 && +t <= 31;
}

function toInt(val) {
  return parseInt(String(val).trim(), 10);
}

// 날짜 키(yyyy-MM-dd)에 1일 더한 키 반환
function addOneDay(dateKey) {
  const [y, mo, d] = dateKey.split('-').map(Number);
  const next = new Date(y, mo - 1, d + 1);
  return Utilities.formatDate(next, 'Asia/Seoul', 'yyyy-MM-dd');
}

// Google Tasks 할일 목록 이름 → ID 매핑
function getTaskListIdMap() {
  const items = Tasks.Tasklists.list({ maxResults: 100 }).items || [];
  const map = {};
  items.forEach(tl => { map[tl.title] = tl.id; });
  return map;
}

// 시트 열릴 때 커스텀 메뉴 추가
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('홍부 캘린더')
    .addItem('구글 캘린더 동기화', 'syncSheetToCalendar')
    .addToUi();
}

function syncSheetToCalendar() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('캘린더');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('"캘린더" 시트를 찾을 수 없습니다.');
    return;
  }
  // getDisplayValues(): 화면에 보이는 텍스트 그대로 읽음 (숫자/날짜/수식 모두 문자열로)
  const data = sheet.getDataRange().getDisplayValues();

  // 카테고리 구분표 읽기 (시트 내 "카테고리" 헤더 기준)
  const categoryType = readCategoryTypeFromSheet(data);
  if (!categoryType) {
    SpreadsheetApp.getUi().alert('⚠ 시트에서 "카테고리" 구분표를 찾을 수 없습니다.\n카테고리/구분 표가 있는지 확인해주세요.');
    return;
  }

  // ── 1. 시작일 파싱 ──────────────────────────────────────
  let startDate = null;
  for (let i = 0; i < 3 && !startDate; i++) {
    for (let j = 0; j < data[i].length && !startDate; j++) {
      const cell = String(data[i][j]);
      const m = cell.replace(/\s/g, '').match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
      if (m) startDate = new Date(+m[1], +m[2] - 1, +m[3]);
    }
  }
  if (!startDate) {
    SpreadsheetApp.getUi().alert('시작일을 찾을 수 없습니다.');
    return;
  }

  // ── 2. 첫 번째 날짜 행 찾기 ──────────────────────────────
  const startDay = startDate.getDate();
  let firstDateRowIdx = -1;
  for (let i = 0; i < data.length; i++) {
    const nums = data[i].filter(isDateNum).map(toInt);
    if (nums.includes(startDay) && nums.length >= 5) {
      firstDateRowIdx = i;
      break;
    }
  }
  if (firstDateRowIdx === -1) {
    let dbg = `시작일: ${startDate ? startDate.toLocaleDateString() : 'null'} (startDay=${startDay})\n`;
    dbg += `총 행 수: ${data.length}\n\n`;
    for (let i = 0; i < Math.min(8, data.length); i++) {
      const nums = data[i].filter(isDateNum).map(toInt);
      const preview = data[i].filter(v => v !== '').slice(0, 4).join(' | ');
      dbg += `행${i+1}: 숫자셀=[${nums}] 내용: ${preview}\n`;
    }
    SpreadsheetApp.getUi().alert(`날짜 행을 찾을 수 없습니다.\n\n${dbg}`);
    return;
  }

  // ── 3. 전체 월 일정 파싱 ─────────────────────────────────
  // schedule[dateStr][category] = content
  const schedule = {};
  const allDates = new Set(); // 시트에 등장한 모든 날짜 (내용 없어도 포함)
  let week = 0;

  while (true) {
    const dateRowIdx = firstDateRowIdx + week * ROWS_PER_WEEK;
    if (dateRowIdx >= data.length) break;

    const dateRow = data[dateRowIdx];

    // 첫 번째 연속 숫자 그룹만 컬럼으로 사용 (우측 트래킹 영역 제외)
    const colToDate = {};
    let inDateRange = false;
    const weekStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + week * 7);

    for (let col = 0; col < dateRow.length; col++) {
      const val = dateRow[col];
      if (isDateNum(val)) {
        inDateRange = true;
        const day = toInt(val);
        for (let d = 0; d < 7; d++) {
          const candidate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + d);
          if (candidate.getDate() === day) {
            colToDate[col] = candidate;
            break;
          }
        }
      } else if (inDateRange) {
        break; // 연속 숫자 그룹 끝
      }
    }

    if (Object.keys(colToDate).length === 0) break;

    // 이 주차에 등장한 날짜를 모두 수집 (월 필터 없음 — lastScheduleDate로 컷오프)
    for (const dateObj of Object.values(colToDate)) {
      allDates.add(Utilities.formatDate(dateObj, 'Asia/Seoul', 'yyyy-MM-dd'));
    }

    // 카테고리 행 파싱
    for (let catIdx = 0; catIdx < CATEGORIES.length; catIdx++) {
      const catRowIdx = dateRowIdx + 1 + catIdx;
      if (catRowIdx >= data.length) break;
      const catRow = data[catRowIdx];

      for (const [colStr, dateObj] of Object.entries(colToDate)) {
        const col = parseInt(colStr);
        if (col < catRow.length) {
          const val = catRow[col];
          const str = (val === null || val === undefined || val === '') ? '' : String(val).trim();
          if (str) {
            const dateKey = Utilities.formatDate(dateObj, 'Asia/Seoul', 'yyyy-MM-dd');
            if (!schedule[dateKey]) schedule[dateKey] = {};
            // 줄바꿈으로 여러 내용이 있는 경우 배열로 분리
            const lines = str.split('\n').map(l => l.trim()).filter(l => l);
            schedule[dateKey][CATEGORIES[catIdx]] = lines;
          }
        }
      }
    }

    week++;
  }

  // ── 4. 구글 캘린더 + Tasks 동기화 ───────────────────────
  let added = 0, deleted = 0;
  const notFound = new Set();

  // Tasks API: 할일 목록 ID 매핑 준비
  const taskListIdMap = getTaskListIdMap();

  // 마지막 일정이 있는 날짜 이후는 작업하지 않음
  const scheduleDates = Object.keys(schedule).sort();
  const lastScheduleDate = scheduleDates.length > 0 ? scheduleDates[scheduleDates.length - 1] : null;
  const activeDates = lastScheduleDate
    ? [...allDates].filter(d => d <= lastScheduleDate).sort()
    : [];

  // "할일" 목록 ID
  const taskListId = taskListIdMap['할일'];
  if (!taskListId) {
    SpreadsheetApp.getUi().alert('⚠ "할일" 이름의 Google Tasks 목록을 찾을 수 없습니다.\n→ tasks.google.com에서 "할일" 목록을 만들어주세요.');
    return;
  }

  // 시트에 등장한 날짜 중 마지막 일정 날짜까지만 → 전체 카테고리 삭제
  for (const dateKey of activeDates) {
    const [y, mo, d] = dateKey.split('-').map(Number);
    const dayStart = new Date(y, mo - 1, d, 0, 0, 0);
    const dayEnd   = new Date(y, mo - 1, d, 23, 59, 59);
    const nextDateKey = addOneDay(dateKey);

    // 캘린더 이벤트 삭제 (모든 카테고리 — 타입 변경 전 잔여 이벤트도 정리)
    for (const category of CATEGORIES) {
      const cals = CalendarApp.getCalendarsByName(category);
      if (cals.length > 0) {
        cals[0].getEvents(dayStart, dayEnd).forEach(e => { e.deleteEvent(); deleted++; });
      }
    }

    // "할일" 목록에서 해당 날짜 할일 삭제 (날짜당 1회)
    const tasks = Tasks.Tasks.list(taskListId, {
      dueMin: `${dateKey}T00:00:00.000Z`,
      dueMax: `${nextDateKey}T00:00:00.000Z`,
      showCompleted: true,
      showHidden: true,
    }).items || [];
    tasks.forEach(t => { Tasks.Tasks.remove(taskListId, t.id); deleted++; });
  }

  // 새 이벤트/할일 등록 (내용 있는 날짜만)
  // 이벤트를 먼저 등록해야 캘린더 상단에 표시됨 (생성 순서 기준 정렬)
  for (const dateKey of Object.keys(schedule).sort()) {
    const cats = schedule[dateKey];
    const [y, mo, d] = dateKey.split('-').map(Number);
    const dateObj = new Date(y, mo - 1, d);

    // 1차: event 타입 먼저 등록
    for (const [category, lines] of Object.entries(cats)) {
      if (categoryType[category] !== 'event') continue;
      const cals = CalendarApp.getCalendarsByName(category);
      if (cals.length === 0) { notFound.add(category); continue; }
      lines.forEach(content => { cals[0].createAllDayEvent(`[${category}] ${content}`, dateObj); added++; });
    }

    // 2차: task 타입 나중에 등록
    for (const [category, lines] of Object.entries(cats)) {
      if (categoryType[category] !== 'task') continue;
      lines.forEach(content => {
        Tasks.Tasks.insert({ title: `[${category}] ${content}`, due: `${dateKey}T00:00:00.000Z` }, taskListId);
        added++;
      });
    }
  }

  // ── 5. 결과 알림 ────────────────────────────────────────
  let msg = `✅ 완료\n삭제: ${deleted}개 / 추가: ${added}개`;
  if (notFound.size > 0) {
    msg += `\n\n⚠ 찾을 수 없는 캘린더/할일목록:\n${[...notFound].join(', ')}\n→ 해당 이름의 캘린더 또는 할일 목록을 만들어주세요.`;
  }
  SpreadsheetApp.getUi().alert(msg);
}
