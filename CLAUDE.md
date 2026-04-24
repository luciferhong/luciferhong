# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Korean real estate analysis toolkit ("홍부가 기가막혀" / LuciferHong):
- **`luciferhong/`** — Main web project (Git repo). All apps are single-file HTML with embedded CSS/JS.
- **`luciferhong-reader-app/`** — Capacitor 7 hybrid app for native Android/iOS TTS.
- **`code_ori/`** — Raw geospatial/real estate data. Not version-controlled.

## luciferhong/ — Main Web Project

**No build step** — single HTML files, open directly in browser or static server.

**Key HTML files:**
- `hongbutest.html` — Primary map viewer (dev). Naver Maps + apartment prices, school zones, population, photo memos (IndexedDB), GeoJSON overlays, marker clustering.
- `hongbu.html` — Production (GitHub Pages). **절대 수정 금지.**
- `siseVer2.html` — Transaction price chart viewer.
- `sise.html` — 가격감 잡기. `supply.html` — 공급/수요 분석.
- `population.html` / `populationtest.html` — Population demographic visualization.
- `sise_chart_race.html` — Bar chart race (빌드 결과물, `_build_chart.py`로 생성).
- `sise_history.html` — 시세 이력 뷰어 (`sise_server.py` 로컬 서버 필요, 포트 7123).
- `migration.html` — 전출입 현황 뷰어 (GitHub Pages).
- `reader.html` — Browser TTS (Web Speech API).
- `memoBackup.html` / `memoClipboard.html` / `memoPage.html` / `memoPageDownload.html` — Memo tools.
- `memoMap.html` — 포토메모 지도. `memoMapExport.html` — 포토메모 지도 내보내기.
- `hongbumemoDelete.html` — Photo memo deletion.
- `danji.html` / `danji2.html` / `kakao.html` — 단지 임장 기록 (Kakao Maps).
- `aptCnt.html` — 임장지 단지 수 조회. `hide.html` — 임보 결론 파트 가리기.
- `metroHong.html` — 지하철 노선 지도. `distance_gangnam.html` — 강남 거리 지도.
- `gpx.html` — GPX route viewer. `mosaic.html` — Image mosaic. `pdftojpg.html` — PDF→JPG.
- `bookmark.html` / `mybookmark.html` / `wbookmark.html` — Bookmark tools.
- `superclicking.html` — 광클. `sellporter-launcher.html` — Sellporter launcher.
- `public.html` / `public2.html` / `public3.html` / `privacy.html` — Public pages.

**External dependencies:** Naver Maps API (`ncpKeyId` 필요), `MarkerClustering.js` (local), JSZip (CDN).

**Data files:**
- GeoJSON: `emd_wgs84_utf8_part01~04.geojson`, `adm_part_001~002.geojson`, `sig_wgs84_utf8_part01~02.geojson`, `sig_from_emd_wgs84_utf8_2025-11-01_sggfields_part01~02.geojson`
- JSON: `age_population_emd/adm.json`, `emd/adm_population_stats.json`, `schools_with_zones.json`, `eliSchools.json` / `eliSchools_1~4.json`, `middleSchools.json`, `aptDetail1~2.json`, `apt.json`, `aptCntApartments.json`, `facility.json`, `starbucks.json`, `data-metro-line-1.0.0.json`, `migration_data.json`
- PNG icons: `depart`, `gam`, `hospital`, `icon`, `mart`, `memo`, `metro`, `midSchool`, `minidoor`, `oneclick2`, `route`, `school`, `starbucks`, `starbucksReserve`, `eliSchool`

**Photo Memo:** IndexedDB (`hongbuPhotoMemo` store). Functions: `__photoMemo*`, `__openPhotoModal`.

**Versioning:** 백업 파일은 날짜 suffix 사용 (`hongbutest_20260323.html`). 작업 파일은 suffix 없음.

**Linting:** `npx eslint _temp_analysis.js` (`_temp_analysis.js` 전용 설정).

**Scripts:**
- Browser console (crawling): `sisedown.js`, `maemool.js`, `nabu.js`, `compare.js`, `asilcompare.js`, `findmember.js`
- UserScript/콘솔: `네부단지추출.js`, `인구이동_download.js`, `토지거래허가_다운로드.js` / `.user.js`
- PM2: `ecosystem.config.js` (`sise_server.py` 실행)
- Python: `hongbuAptDetail.py`, `convert_age_xlsx_to_json.py`, `convert_adm_age_xlsx_to_json.py`, `check_sgg.py`, `_build_chart.py`, `_build_migration.py`, `_check_db.py` (DB 상태 확인), `_daily_schedule.py` (구글 시트→텔레그램), `_sheet_to_gcal.py` (구글 시트→구글 캘린더, `credentials.json` 필요), `population_migration_downloader.py` (행안부 인구이동 다운로드), `sise_server.py` (시세 이력 SQLite 서버, 포트 7123)

## luciferhong-reader-app/ — Capacitor Mobile App

Edit `www/index.html` only. Run `npm run sync` after edits.
```bash
npm run sync    # cap sync
npm run android # run on device/emulator
npx cap open android / ios
```
Uses `@capacitor-community/text-to-speech` (v6). iOS: `UIBackgroundModes: audio` in `Info.plist`.

## User Preferences

- **hongbu.html은 절대 수정하지 말 것.** 코드 작업은 항상 `hongbutest.html`.
- **메모리 저장 요청 시 항상 CLAUDE.md에 저장한다.** (로컬 메모리는 다른 PC에서 미적용)
- **모든 설명과 과정은 한글로 작성한다.**
- **구글 시트 읽기:** WebFetch로 `https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv` 사용.

## IndexedDB 스키마 규칙 (`hongbu` / `hongbuMemo` DB)

### 버전 변경 전 사전 체크 (BLOCKING)

`HONGBU_DB_VERSION`·`HONGBU_MEMO_DB_VERSION` 등 IndexedDB 버전 상수를 수정하기 **전에 반드시** 아래 절차를 밟는다. 한 파일만 올리면 나머지 파일에서 `VersionError`로 DB가 아예 안 열려 지도 공백 같은 무응답 버그가 된다.

1. **영향 파일 목록 확정** — 같은 DB를 쓰는 모든 HTML을 찾는다.
   - `hongbu` DB: `grep -n "HONGBU_DB_VERSION\s*=" *.html`
   - `hongbuMemo` DB: `grep -n "HONGBU_MEMO_DB_VERSION\s*=\|DB_VERSION\s*=" *.html` → `DB_NAME='hongbuMemo'`인 파일만 선별
2. **백업 제외** — `*_YYYYMMDD.html`·`*_restored.html`은 제외 대상. 활성 운영 파일만 대상.
3. **수정 금지 파일 확인** — `hongbu.html`처럼 Claude가 직접 수정할 수 없는 파일은 사용자 동의/수동 배포 전략을 먼저 합의한 뒤 착수.
4. **onupgradeneeded 멱등성 확인** — 대상 파일들의 `onupgradeneeded`가 `if (!db.objectStoreNames.contains(...))`로 스토어를 **멱등 생성**하는지 점검. 아니면 먼저 멱등화.
5. **동시 커밋** — 결정된 활성 파일 전부를 **같은 값**으로 한 번에 올린다.

### `hongbu` DB 공통 규칙

- 스키마 변경(새 스토어 추가, 기존 스토어 구조 변경)은 **반드시 `HONGBU_DB_VERSION`을 +1**.
- 상수는 `hongbu.html`·`hongbuCloud.html`·`hongbutest.html` 세 파일에 중복 정의. 세 파일 동시 갱신.
- `initIndexedDB()`의 `onupgradeneeded`에서 `if (!db.objectStoreNames.contains(...))`로 멱등 생성.
- `setHongbuSetting`처럼 DB를 여는 함수는 자체 `indexedDB.open`을 두지 말고 **`initIndexedDB()`를 `await` 해서 재사용**한다. (`onupgradeneeded`가 한 곳에만 있어야 누락/중복 방지)
- `initIndexedDB()`에는 `onblocked` 핸들러와 타임아웃을 둔다. 다른 탭이 이전 버전 연결을 잡고 있으면 `onsuccess`/`onerror`가 발화되지 않아 Promise가 영원히 pending 돼 UI가 멈추기 때문.
- **자가 복구용 `currentVersion+1` 자동 bump는 금지**. 사용자 DB 버전이 배포 상수보다 높아지면 이후 `indexedDB.open(name, lowerVersion)`이 영구적으로 `VersionError`.

### `hongbuMemo` DB 주의사항

- 상수 이름이 파일 계열별로 **다르다**. 한 이름만 grep하면 누락된다.
  - `HONGBU_MEMO_DB_VERSION` — `hongbu.html`·`hongbutest.html`·`hongbuCloud.html` 계열.
  - `DB_VERSION` (+ `DB_NAME = 'hongbuMemo'`) — `memoBackup.html`·`memoMapExport.html`·`memoClipboard.html`·`memoPage.html`·`memoPageDownload.html` 계열.
  - 버전 상수 없이 `DB_NAME`만 쓰는 파일도 있음(예: `hongbumemoDelete.html`).
- 현재(2026-04-19 기준) v4/v5 드리프트 존재: `memoClipboard.html`·`memoPage.html`·`memoPageDownload.html`가 v4, 나머지 활성 파일은 v5. 별도 티켓에서 정렬 예정.
- `initMemoIndexedDB()`(`hongbutest.html:6683-6694`)는 스토어 누락 감지 시 DB 삭제→재생성하는 자가 복구 로직이 이미 있어 현재는 치명적 버그 없음. 단, **사용자 데이터 삭제 리스크**가 있으므로 신규 개선은 `hongbu` DB와 동일한 무삭제 방식으로 통일한다.

## 핸드오버 (Claude Code → Copilot 인계)

토큰 한도 도달 시 또는 사용자가 "핸드오버" 요청 시:
1. `HANDOVER.md`를 프로젝트 루트에 생성/업데이트한다.
2. 포함 내용: 현재 작업 중인 파일 및 변경 내용, 완료된 것, 남은 것, 코파일럿 인계 컨텍스트(제약사항 포함).
3. 코파일럿에서 `#file:HANDOVER.md`로 로드하여 이어받는다.
4. `HANDOVER.md`는 Git 추적 대상이므로 민감 정보(토큰, 비밀번호) 포함 금지.

## migration — 전출입 현황 뷰어

**빌드:** `python _build_migration.py` → `migration_data.json`, `emd/{sgg5}.json`, `emd_out/{sgg5}.json`

**원본 CSV (로컬):** `2015~2019_세대관련연간자료_*.csv`, `2020~2025_인구관련연간자료_*.csv`, `행정동코드.txt`

**데이터 구조:**
- CSV: row[0~2]=전입 시도/시군구/읍면동(5자리), row[6~8]=전출 시도/시군구/읍면동
- 10자리 코드 = 시도(2)+시군구(3)+읍면동(5)
- `migration_data.json`: `{"hierarchy":{...}, "years":{"2015":{"sido":{...},"sgg":{...}},...}}`
- `emd/{sgg5}.json`: `{in_emd10: {out_emd10: count}}` / `emd_out/{sgg5}.json`: 반대 방향

**기능:** 기간 선택 → 시도/시군구/읍면동 계단식 드롭다운 → 전입/전출 탭. GitHub Pages 24MB 제한으로 emd 파일 분리.

## sise_history — 시세 이력 뷰어

**파일:** `sise_history.html` + `sise_server.py` (SQLite, 포트 7123) + `ecosystem.config.js` (PM2)

**실행:** `python sise_server.py` 또는 `pm2 start ecosystem.config.js`

**DB:** `sise_history.db` (로컬 전용, Git 제외). 테이블: `전체`, `앞마당` — run_date별 시세 이력.

## sise_chart_race — 아파트 시세 Bar Chart Race

**빌드:** `_build_chart.py` 수정 후 `python _build_chart.py` → `sise_chart_race.html` 재생성 (직접 수정 금지).

**원본:** `시세트래킹 (3).xlsx` — 3행: 지역, 8행: 단지명, 36행~: 날짜별 시세 (8행 간격).

**기능:** 지역/면적/단지 필터, X축 시작 시점 고정(stableOrder), forward-fill, RAF smoothstep 애니메이션, 1x~10x 배속.

## shorts — YouTube 다운로드 웹앱

**파일:** `shorts.html` + `shorts_server.py` (포트 7124, `127.0.0.1` 바인딩) + `ecosystem.config.js` PM2 `shorts` 앱

**공개 URL:** `https://shorts.luciferhong.com/shorts.html` (Cloudflare Tunnel `hongbu-shorts` 경유 HTTPS). 토큰 `luciferhong2026` 쿼리 파라미터.

**의존성:** `yt-dlp`(pip), `ffmpeg`(winget `Gyan.FFmpeg`), `cloudflared`(Windows 서비스)

**외부 노출:** Cloudflare Tunnel. 집 PC의 cloudflared가 아웃바운드로 엣지에 연결 → `shorts.luciferhong.com`으로 공개. 공인 IP·포트포워딩·DDNS 불필요. config: `C:\Users\hoses\.cloudflared\config.yml`.

**엔드포인트:** `/health`, `/`·`/shorts.html`(HTML 직접 서빙), `/info`, `/start`, `/progress`(SSE), `/file`, `/cancel`

**기능:** URL 입력 → yt-dlp로 `bestvideo+bestaudio` MP4 머지 다운로드. SSE로 실시간 진행률·속도·ETA. 라이브는 `live_from_start: True`로 처음부터, 중단 버튼으로 부분 파일(`.ts`) 저장.

**서버 로그:** `pm2 logs shorts --lines 50 --nostream` 또는 `C:\Users\hoses\.pm2\logs\shorts-*.log`

## hongbutest.html — 주요 아키텍처 패턴

**시군구 필터 마커:** 시군구 미선택 시 `__xxxMarkerCache(Map)` 뷰포트 lazy, 선택 시 `__xxxMarkerPool(Array)` 풀 재빌드(`rebuildXxxPool()`). 변경 시 `applyRegionFilterUpdate()` → `Promise.all([rebuildSchoolPool, ...])`.

**경계 오버레이:** `selectedSigunguSet` 있으면 해당 시군구만 표시, 선택 경계 핑크(`#FF69B4`) 강조.

**레이블:** polylabel 알고리즘으로 폴리곤 내 최적 위치, `best.d`(내접원 반지름)로 폰트 크기 상한 계산.

**idle 핸들러:** 중앙 리스너 1개 (`__mapIdleListenerReady` 플래그). `updateMarkers()` + 초/중/환경/스벅 즉시 갱신.
