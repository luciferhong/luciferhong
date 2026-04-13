# HANDOVER.md

> 클로드 코드 → 코파일럿 인계 파일. 토큰 한도 도달 시 업데이트.
> 코파일럿에서: `#file:HANDOVER.md` 로 컨텍스트 로드 후 작업 이어받기.

---

## 마지막 업데이트: 2026-04-13

---

## 현재 작업 중인 파일 및 변경 내용

### `sisedown.js` (Violentmonkey UserScript)
네이버 부동산 시세 다운로드 스크립트. 앞마당 다운로드 자동화 구현 완료.

**변경 사항:**
- `@run-at document-start` 추가 (헤더) — 네이버 SPA가 URL을 덮어쓰기 전에 실행
- 스크립트 최상단: `?auto=madang` 파라미터를 sessionStorage에 저장
  ```javascript
  if (new URLSearchParams(location.search).get('auto') === 'madang') {
      sessionStorage.setItem('autoMadang', '1');
  }
  ```
- 버튼 생성 코드 (~line 5363): sessionStorage 플래그 감지 시 `showPricePopup()` 자동 호출
- `showPricePopup()` 내부 마지막 부분 (~line 7843): 플래그 확인 후 3초 뒤 `runRegionDownload(targetSigunguCodes, null)` 호출
- `runRegionDownload()` 내 `targetBtn` null 안전 처리 (`if (targetBtn)` 조건 추가)
- DB 저장 fetch URL에 `?token=luciferhong2026` 토큰 추가 (~line 7870)

**주의:** 로컬 파일 수정 후 Violentmonkey에 수동으로 스크립트를 업데이트해야 함.

### `hongbutest.html`
메인 지도 뷰어 (개발 버전). `hongbu.html`은 절대 수정 금지.

**변경 사항:**
- `navigator.storage.persist()` 호출 추가 (DOMContentLoaded, `initIndexedDB()` 전)
- `initMemoIndexedDB()` onerror: `QuotaExceededError` 시 사용자에게 토스트 메시지 표시
- `togglePhotoMemo` 체크박스: `checked` 기본값 추가 (첫 로드 시 체크됨)
- `window.__photoMemoVisible` 기본값 `true`로 변경
- `showStorageWarning(pct)` 함수 추가: 80% 이상 시 배너 표시, 92% 이상 시 위험 배너, localStorage로 하루 1회 중복 방지, "📦 지금 백업하기" 링크 포함
- `reportStorage()`: 80% 이상 시 `showStorageWarning()` 호출

### `run_madang.bat` (신규 생성)
```bat
@echo off
start "" "C:\Program Files\Naver\Naver Whale\Application\whale.exe" ^
  "https://new.land.naver.com/complexes?ms=37.5472929,126.9486053,16&a=APT:ABYG:JGC:PRE&b=A1:B1&e=RETAIL&l=190&q=TWOROOM&u=TOPFLOOR&ad=true&auto=madang" ^
  --new-window
```

---

## 완료된 것

- [x] IndexedDB 저장공간 부족 오류 처리 (`hongbutest.html`)
- [x] `navigator.storage.persist()` 추가
- [x] 저장공간 80%/92% 경고 배너 구현
- [x] 포토메모 체크박스 기본값 `true`
- [x] DB 서버 401 Unauthorized 오류 수정 (토큰 추가)
- [x] `run_madang.bat` 생성 (Whale 브라우저로 앞마당 URL 실행)
- [x] `sisedown.js` 자동 실행 아키텍처 구현:
  - `@run-at document-start` + sessionStorage 방식
  - `runRegionDownload` 스코프 문제 해결 (showPricePopup 내부에서 호출)

---

## 남은 것 / 미검증

- [ ] Violentmonkey에 수정된 `sisedown.js` 수동 업데이트 필요
- [ ] 실제 Whale 브라우저에서 자동 실행 테스트 (콘솔에 `[자동실행]` 로그 확인)
- [ ] Windows 작업 스케줄러 등록 (PowerShell):
  ```powershell
  $action = New-ScheduledTaskAction -Execute "d:\OneDrive\code\luciferhong\run_madang.bat"
  $trigger = New-ScheduledTaskTrigger -Daily -At "08:00AM"
  Register-ScheduledTask -TaskName "앞마당다운로드" -Action $action -Trigger $trigger -RunLevel Highest
  ```

---

## 코파일럿 인계 컨텍스트

**프로젝트:** 한국 부동산 분석 툴킷 "홍부가 기가막혀" (LuciferHong)
- 모든 앱은 빌드 없이 단일 HTML 파일 (CSS/JS 인라인)
- `hongbutest.html` = 개발 버전, `hongbu.html` = GitHub Pages 서비스 (수정 금지)
- `sisedown.js` = Violentmonkey UserScript (네이버 부동산 브라우저 내에서 실행)

**핵심 제약:**
- 네이버 SPA가 `history.replaceState()`로 URL 파라미터를 덮어씀 → `@run-at document-start` + sessionStorage로 우회
- `runRegionDownload()` 함수는 `showPricePopup()` 스코프 내에 정의됨 → 외부에서 직접 호출 불가
- CORS 제약으로 모든 네이버 API 호출은 브라우저 내에서만 가능

**로컬 서버:**
- `sise_server.py` (포트 7123, PM2 관리) — 시세 이력 SQLite 저장
- 인증 토큰: `?token=luciferhong2026`
