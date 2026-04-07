#!/usr/bin/env python3
"""
구글 시트 캘린더 → 구글 캘린더 일정 동기화

사전 준비:
  1. Google Cloud Console > OAuth 2.0 클라이언트 ID (데스크톱 앱) 생성
  2. credentials.json 다운로드 → 이 파일과 같은 폴더에 저장
  3. pip install google-api-python-client google-auth-oauthlib requests
"""

import csv
import io
import os
from datetime import date, timedelta
from pathlib import Path

import requests
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# ===== 설정 =====
SHEET_ID = "1YVPFjjx8-4osY-6H90askbN9dCav-25ee6cUvm3O2NE"
SHEET_GID = "127890275"  # 캘린더 시트 gid

# 시트 카테고리 행 순서 (날짜 행 다음 7개 행)
CATEGORIES = ["일정", "강의", "과제", "독서", "시세", "임보", "임장"]
ROWS_PER_WEEK = 8  # 날짜 행 1 + 카테고리 행 7

# 시트 카테고리명 → 구글 캘린더명 매핑
CATEGORY_TO_GCAL = {
    "일정": "일정",
    "강의": "강의",
    "과제": "과제",
    "독서": "독서",
    "시세": "시세",
    "임보": "임보",
    "임장": "임장",
}

SCOPES = ["https://www.googleapis.com/auth/calendar"]
BASE_DIR = Path(__file__).parent
CREDENTIALS_FILE = BASE_DIR / "credentials.json"
TOKEN_FILE = BASE_DIR / "token.json"


# ===== 구글 시트 파싱 =====

def fetch_csv():
    # gviz URL은 일부 셀을 누락하는 버그가 있어 export URL 사용
    url = (
        f"https://docs.google.com/spreadsheets/d/{SHEET_ID}"
        f"/export?format=csv&gid={SHEET_GID}"
    )
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    text = r.content.decode("utf-8-sig")  # BOM 포함 UTF-8도 처리
    if "<!DOCTYPE html" in text or "<html" in text:
        raise RuntimeError("시트가 비공개이거나 로그인 페이지가 반환되었습니다.")
    return list(csv.reader(io.StringIO(text)))


def parse_start_date(rows):
    """시트 상단 3행에서 시작 연월일 파싱 (예: '2026. 4. 5' → date(2026,4,5))"""
    for row in rows[:3]:
        for cell in row:
            cell = cell.strip().replace(" ", "")
            if not cell:
                continue
            parts = [p for p in cell.split(".") if p.isdigit()]
            if len(parts) == 3:
                try:
                    return date(int(parts[0]), int(parts[1]), int(parts[2]))
                except ValueError:
                    pass
    return None


def find_first_date_row(rows, start_day):
    """시작일(일)이 포함된 첫 번째 날짜 행의 인덱스 반환"""
    for i, row in enumerate(rows):
        numeric_cells = [c.strip() for c in row if c.strip().isdigit()]
        if str(start_day) in numeric_cells and len(numeric_cells) >= 5:
            return i
    return None


def parse_all_schedule(rows):
    """
    전체 월 일정 파싱.
    반환: {date_obj: {category: content_str}} (빈 셀 제외)
    """
    start_date = parse_start_date(rows)
    if not start_date:
        raise RuntimeError("시트에서 시작일을 찾을 수 없습니다.")

    first_date_row_idx = find_first_date_row(rows, start_date.day)
    if first_date_row_idx is None:
        raise RuntimeError("날짜 행을 찾을 수 없습니다.")

    schedule = {}
    week = 0

    while True:
        date_row_idx = first_date_row_idx + week * ROWS_PER_WEEK
        if date_row_idx >= len(rows):
            break

        date_row = rows[date_row_idx]

        # 날짜 행에서 첫 번째 연속 숫자 그룹만 사용
        # (시트 우측 트래킹 영역의 숫자들이 섞이는 것 방지)
        col_to_date = {}
        in_date_range = False
        week_start = start_date + timedelta(weeks=week)
        for col, cell in enumerate(date_row):
            val = cell.strip()
            if val.isdigit():
                in_date_range = True
                day = int(val)
                for d in range(7):
                    candidate = week_start + timedelta(days=d)
                    if candidate.day == day:
                        col_to_date[col] = candidate
                        break
            elif in_date_range:
                break  # 첫 번째 연속 숫자 그룹 끝, 이후 열은 무시

        if not col_to_date:
            break  # 더 이상 날짜 행 없음

        # 카테고리 행 파싱
        for cat_idx, category in enumerate(CATEGORIES):
            cat_row_idx = date_row_idx + 1 + cat_idx
            if cat_row_idx >= len(rows):
                break
            cat_row = rows[cat_row_idx]

            for col, date_obj in col_to_date.items():
                if col < len(cat_row):
                    val = cat_row[col].strip()
                    if val:
                        if date_obj not in schedule:
                            schedule[date_obj] = {}
                        schedule[date_obj][category] = val

        week += 1

    return schedule


# ===== 구글 캘린더 API =====

def get_calendar_service():
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_FILE.exists():
                raise FileNotFoundError(
                    f"credentials.json 파일이 없습니다: {CREDENTIALS_FILE}\n"
                    "Google Cloud Console에서 OAuth 2.0 클라이언트 ID를 생성하고 다운로드하세요."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return build("calendar", "v3", credentials=creds)


def get_calendar_id_map(service):
    """구글 캘린더 목록 조회 → {캘린더명: 캘린더ID} dict"""
    result = service.calendarList().list().execute()
    id_map = {}
    for cal in result.get("items", []):
        name = cal.get("summary", "")
        id_map[name] = cal["id"]
    return id_map


def delete_events_on_date(service, calendar_id, date_obj):
    """특정 날짜의 기존 이벤트 전부 삭제. 삭제 건수 반환"""
    day_str = date_obj.strftime("%Y-%m-%d")
    next_day = (date_obj + timedelta(days=1)).strftime("%Y-%m-%d")
    # KST(+09:00) 기준으로 조회해야 종일 이벤트를 정확히 찾을 수 있음
    result = service.events().list(
        calendarId=calendar_id,
        timeMin=f"{day_str}T00:00:00+09:00",
        timeMax=f"{next_day}T00:00:00+09:00",
        singleEvents=True,
    ).execute()
    count = 0
    for event in result.get("items", []):
        service.events().delete(calendarId=calendar_id, eventId=event["id"]).execute()
        count += 1
    return count


def create_all_day_event(service, calendar_id, date_obj, summary):
    """종일 이벤트 생성"""
    day_str = date_obj.strftime("%Y-%m-%d")
    event = {
        "summary": summary,
        "start": {"date": day_str},
        "end": {"date": day_str},
    }
    service.events().insert(calendarId=calendar_id, body=event).execute()


# ===== 메인 =====

def main():
    print("=== 구글 시트 → 구글 캘린더 동기화 시작 ===\n")

    # 시트 파싱
    print("구글 시트 fetch 중...")
    rows = fetch_csv()
    print(f"fetch 완료 ({len(rows)}행)")

    schedule = parse_all_schedule(rows)
    total_items = sum(len(cats) for cats in schedule.values())
    print(f"파싱 완료: {len(schedule)}일, 총 {total_items}개 일정\n")

    if not schedule:
        print("등록할 일정이 없습니다.")
        return

    # 구글 캘린더 인증
    print("구글 캘린더 인증 중...")
    service = get_calendar_service()
    cal_id_map = get_calendar_id_map(service)
    print(f"캘린더 {len(cal_id_map)}개 확인\n")

    # 동기화: (날짜, 캘린더) 단위로 기존 이벤트 삭제 후 새로 등록
    added = 0
    deleted = 0
    not_found = set()

    for date_obj in sorted(schedule.keys()):
        # 이 날짜에 등록할 카테고리별로 묶기
        by_cal = {}  # cal_id → [(category, content), ...]
        for category, content in schedule[date_obj].items():
            gcal_name = CATEGORY_TO_GCAL.get(category)
            if not gcal_name:
                continue
            cal_id = cal_id_map.get(gcal_name)
            if not cal_id:
                not_found.add(gcal_name)
                continue
            by_cal.setdefault(cal_id, []).append((category, content))

        for cal_id, items in by_cal.items():
            # 해당 날짜 기존 이벤트 전부 삭제
            n = delete_events_on_date(service, cal_id, date_obj)
            if n:
                print(f"  삭제: {date_obj} [{items[0][0]} 캘린더] 기존 {n}개")
                deleted += n

            # 새 이벤트 등록
            for category, content in items:
                create_all_day_event(service, cal_id, date_obj, content)
                print(f"  추가: {date_obj} [{category}] {content}")
                added += 1

    print(f"\n=== 완료 ===")
    print(f"삭제: {deleted}개 / 추가: {added}개")
    if not_found:
        print(f"⚠ 구글 캘린더에서 찾을 수 없는 캘린더: {', '.join(sorted(not_found))}")
        print("  → 구글 캘린더에서 해당 이름의 캘린더를 만들어주세요.")


if __name__ == "__main__":
    main()
