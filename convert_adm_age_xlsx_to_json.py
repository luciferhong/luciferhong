"""행정동연령별인구.xlsx → age_population_adm.json 변환기

Excel 구조:
  col 0: 행정기관코드 (10자리 행정동 코드)
  col 1: 행정기관     (지역 이름)
  col 2: 총 인구수
  col 3: 연령구간인구수
  col 4: 0~9세
  col 5: 10~19세
  col 6: 20~29세
  col 7: 30~39세
  col 8: 40~49세
  col 9: 50~59세
  col 10: 60~69세
  col 11: 70~79세
  col 12: 80~89세
  col 13: 90~99세
  col 14: 100세 이상

출력 JSON 구조 (age_population_emd.json 과 동일):
  { "source": ..., "ageBands": [...], "rows": [{ label, code, values[6], total }] }

연령대:
  [0~9, 10~19, 20~29, 30~49(30+40합산), 50~59, 60+(60~69+70~79+80~89+90~99+100이상)]
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import openpyxl


def to_number(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value or "").replace(",", "").replace("%", "").strip()
    try:
        return float(text)
    except Exception:
        return 0.0


def main() -> None:
    base = Path(__file__).resolve().parent

    src = base / "행정동연령별인구.xlsx"
    if not src.exists():
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {src}")

    wb = openpyxl.load_workbook(src, data_only=True, read_only=True)
    ws = wb.active

    rows_raw = list(ws.iter_rows(values_only=True))
    if not rows_raw:
        raise ValueError("엑셀이 비어 있습니다.")

    headers = [str(v or "").strip() for v in rows_raw[0]]
    print("헤더:", headers)

    # 열 인덱스 확인
    # 행정기관코드: col 0, 행정기관(이름): col 1
    # 0~9세:col4, 10~19:col5, 20~29:col6, 30~39:col7, 40~49:col8
    # 50~59:col9, 60~69:col10, 70~79:col11, 80~89:col12, 90~99:col13, 100이상:col14
    CODE_COL = 0
    NAME_COL = 1
    # 연령대 컬럼 인덱스 동적 탐색
    def find_col(keyword: str) -> int:
        for i, h in enumerate(headers):
            normalized = h.replace(" ", "").replace("~", "-")
            if keyword in normalized:
                return i
        return -1

    col_0_9   = find_col("0-9")
    col_10_19 = find_col("10-19")
    col_20_29 = find_col("20-29")
    col_30_39 = find_col("30-39")
    col_40_49 = find_col("40-49")
    col_50_59 = find_col("50-59")
    col_60_69 = find_col("60-69")
    col_70_79 = find_col("70-79")
    col_80_89 = find_col("80-89")
    col_90_99 = find_col("90-99")
    col_100   = find_col("100세이상") if find_col("100세이상") >= 0 else find_col("100이상")

    print(f"컬럼 탐색: 0-9={col_0_9}, 10-19={col_10_19}, 20-29={col_20_29}, "
          f"30-39={col_30_39}, 40-49={col_40_49}, 50-59={col_50_59}, "
          f"60-69={col_60_69}, 70-79={col_70_79}, 80-89={col_80_89}, "
          f"90-99={col_90_99}, 100+={col_100}")

    def safe_val(row: tuple, idx: int) -> float:
        if idx < 0 or idx >= len(row):
            return 0.0
        return to_number(row[idx])

    out_rows: list[dict[str, Any]] = []
    skipped_aggregate = 0

    for raw_row in rows_raw[1:]:
        if not raw_row or len(raw_row) < 2:
            continue

        raw_code = str(raw_row[CODE_COL] or "").strip()
        raw_name = str(raw_row[NAME_COL] or "").strip()

        if not raw_code or not raw_name:
            continue

        # 코드에서 숫자만 추출
        code_digits = "".join(ch for ch in raw_code if ch.isdigit())
        if len(code_digits) < 5:
            continue

        # 시도(말미 8자리 = 00000000) / 시군구(말미 5자리 = 00000) 레코드는 제외
        # 행정동은 말미 2자리만 00이고 3~5번째 자리는 비어있지 않음
        if len(code_digits) >= 10 and code_digits[-5:] == "00000":
            skipped_aggregate += 1
            continue

        # 라벨: "서울특별시 종로구 청운효자동" → "청운효자동" (마지막 공백 이후)
        parts = raw_name.split()
        short_name = parts[-1] if parts else raw_name

        v0  = safe_val(raw_row, col_0_9)
        v10 = safe_val(raw_row, col_10_19)
        v20 = safe_val(raw_row, col_20_29)
        v30 = safe_val(raw_row, col_30_39) + safe_val(raw_row, col_40_49)
        v50 = safe_val(raw_row, col_50_59)
        v60 = (safe_val(raw_row, col_60_69) + safe_val(raw_row, col_70_79)
               + safe_val(raw_row, col_80_89) + safe_val(raw_row, col_90_99)
               + safe_val(raw_row, col_100))

        total = v0 + v10 + v20 + v30 + v50 + v60
        if total <= 0:
            continue

        out_rows.append({
            "label": short_name,
            "fullName": raw_name,
            "code": code_digits,
            "values": [int(v0), int(v10), int(v20), int(v30), int(v50), int(v60)],
            "total": int(total),
        })

    payload = {
        "source": src.name,
        "ageBands": ["0~9", "10~19", "20~29", "30~49", "50~59", "60+"],
        "rows": out_rows,
    }

    dst = base / "age_population_adm.json"
    dst.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(f"\n완료: {dst}")
    print(f"  행정동 행 수: {len(out_rows)}")
    print(f"  시도/시군구 집계 제외: {skipped_aggregate}")

    # 검증 샘플 출력
    print("\n샘플 (앞 5개):")
    for r in out_rows[:5]:
        print(f"  {r['code']} / {r['label']} → total={r['total']}, values={r['values']}")


if __name__ == "__main__":
    main()
