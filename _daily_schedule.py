#!/usr/bin/env python3
"""
매일 아침 구글 시트에서 오늘의 일정을 읽어 텔레그램으로 전송합니다.
Windows 작업 스케줄러에 등록하여 자동 실행합니다.
"""

import requests
import csv
import io
import sys
import traceback
from datetime import date, datetime
from pathlib import Path

LOG_FILE = Path(__file__).parent / "_daily_schedule.log"


def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")

# ===== 설정 =====
BOT_TOKEN = "1985389773:AAElNl1NEqPY1OuehuIY0UUiX_zKdYebDLE"
CHAT_ID = 1991783780
SHEET_ID = "1YVPFjjx8-4osY-6H90askbN9dCav-25ee6cUvm3O2NE"
SHEET_GID = "127890275"

CATEGORIES = ["일정", "강의", "과제", "독서", "시세", "임보", "임장", "투자", "루틴", "개인"]

WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]


def fetch_csv():
    # gviz URL은 일부 셀 누락 버그가 있어 export URL 사용
    url = (
        f"https://docs.google.com/spreadsheets/d/{SHEET_ID}"
        f"/export?format=csv&gid={SHEET_GID}"
    )
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    text = r.content.decode("utf-8-sig")
    if "<!DOCTYPE html" in text or "<html" in text:
        raise RuntimeError("시트가 비공개이거나 로그인 페이지가 반환되었습니다.")
    return list(csv.reader(io.StringIO(text)))


def parse_start_date(rows):
    """행에서 '첫 일요일 날짜' 셀 파싱 → date 반환 (예: '2026. 4. 5')"""
    for row in rows[:3]:
        for cell in row:
            cell = cell.strip().replace(" ", "")
            if not cell:
                continue
            parts = [p for p in cell.split(".") if p]
            if len(parts) == 3:
                try:
                    return date(int(parts[0]), int(parts[1]), int(parts[2]))
                except ValueError:
                    pass
    return None


ROWS_PER_WEEK = 11  # 날짜 행 1 + 카테고리 행 10


def find_first_date_row(rows, start_day):
    """첫 번째 주차 날짜 행 인덱스 반환"""
    for i, row in enumerate(rows):
        numeric_cells = [c.strip() for c in row if c.strip().isdigit()]
        if str(start_day) in numeric_cells and len(numeric_cells) >= 5:
            return i
    return None


def get_today_schedule(rows):
    today = date.today()
    start_date = parse_start_date(rows)
    if not start_date:
        return None, "시트에서 시작일을 찾을 수 없습니다."

    first_date_row_idx = find_first_date_row(rows, start_date.day)
    if first_date_row_idx is None:
        return None, "날짜 행을 찾을 수 없습니다."

    offset_days = (today - start_date).days
    if offset_days < 0:
        return None, "오늘 날짜가 시트 시작일 이전입니다."

    # 오늘이 몇 번째 주차인지 → 해당 주차의 날짜 행 위치 계산
    week_num = offset_days // 7
    date_row_idx = first_date_row_idx + week_num * ROWS_PER_WEEK

    if date_row_idx >= len(rows):
        return None, "오늘 날짜가 시트 범위를 벗어났습니다. 새 달 시트로 업데이트해주세요."

    date_row = rows[date_row_idx]

    # 해당 주차 행에서 오늘 날짜(일) 열 찾기 (첫 번째 연속 숫자 그룹만 탐색)
    today_col = None
    in_date_range = False
    for i, cell in enumerate(date_row):
        val = cell.strip()
        if val.isdigit():
            in_date_range = True
            if val == str(today.day):
                today_col = i
                break
        elif in_date_range:
            break  # 첫 번째 연속 숫자 그룹 끝

    if today_col is None:
        return None, f"날짜 {today.day}일을 해당 주 행에서 찾을 수 없습니다."

    # 카테고리 행: 날짜 행 바로 다음 6개 행
    schedule = {}
    for cat, row in zip(CATEGORIES, rows[date_row_idx + 1 : date_row_idx + ROWS_PER_WEEK]):
        if today_col < len(row):
            val = row[today_col].strip()
            if val:
                schedule[cat] = val

    return schedule, None


def send_telegram(text):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    r = requests.post(
        url,
        json={"chat_id": CHAT_ID, "text": text, "parse_mode": "HTML"},
        timeout=10,
    )
    r.raise_for_status()


def main():
    log(f"=== 시작 (Python {sys.version}) ===")
    log(f"작업 디렉토리: {Path.cwd()}")

    today = date.today()
    weekday = WEEKDAYS[today.weekday()]
    date_str = f"{today.year}년 {today.month}월 {today.day}일 ({weekday})"

    try:
        log("구글 시트 fetch 시작")
        rows = fetch_csv()
        log(f"fetch 완료 - 행 수: {len(rows)}")

        schedule, error = get_today_schedule(rows)

        if error:
            msg = f"⚠️ {error}"
            log(f"일정 파싱 오류: {error}")
        elif not schedule:
            msg = f"📅 <b>{date_str}</b>\n\n오늘은 등록된 일정이 없습니다."
            log("오늘 일정 없음")
        else:
            lines = [f"📅 <b>{date_str}</b>\n"]
            for cat in CATEGORIES:
                if cat in schedule:
                    lines.append(f"▪️ <b>{cat}</b>: {schedule[cat]}")
            msg = "\n".join(lines)
            log(f"일정 파싱 완료: {schedule}")

        log("텔레그램 전송 시작")
        send_telegram(msg)
        log("텔레그램 전송 완료")

    except Exception as e:
        msg = f"⚠️ 일정 조회 중 오류 발생: {e}"
        log(f"예외 발생: {e}")
        log(traceback.format_exc())
        try:
            send_telegram(msg)
        except Exception as e2:
            log(f"텔레그램 전송도 실패: {e2}")

    log("=== 종료 ===")


if __name__ == "__main__":
    main()
