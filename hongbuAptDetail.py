#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import argparse, json
from pathlib import Path
import pandas as pd

PYEONG_PER_M2 = 3.305785
REQUIRED_COLS = [
    "단지코드","단지명","사용승인일","총세대수",
    "공급면적","전용면적","구조","방수","욕실수","평형명","평형별 세대수"
]
TYPE_COL_MAP = {
    "공급평수":"공급평수","공급면적":"공급면적","전용면적":"전용면적","구조":"구조",
    "방수":"방 갯수","욕실수":"화장실 갯수","평형명":"타입","평형별 세대수":"평형 세대수"
}

def read_table(path: Path, sheet_name: str | int | None):
    ext = path.suffix.lower()
    keep_str = ["단지코드","단지명","사용승인일","구조","평형명"]
    dtype = {c: "string" for c in keep_str}
    if ext == ".xlsx":
        df = pd.read_excel(path, sheet_name=sheet_name or 0, dtype=dtype, engine="openpyxl")
    elif ext == ".csv":
        try: df = pd.read_csv(path, dtype=dtype)
        except UnicodeDecodeError: df = pd.read_csv(path, dtype=dtype, encoding="cp949")
    else:
        raise ValueError("xlsx 또는 csv만 지원합니다.")
    df.columns = [str(c).strip() for c in df.columns]
    return df

def ensure_required(df: pd.DataFrame):
    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing: raise ValueError(f"필수 컬럼 없음: {missing}")

def to_num(s, as_int=False):
    x = pd.to_numeric(s, errors="coerce")
    return x.round().astype("Int64") if as_int else x

def parse_use_ym(v):
    """입주시기: 항상 문자열로. NaN이면 None. 날짜형이면 'YYYY.MM'."""
    if pd.isna(v):
        return None
    if hasattr(v, "strftime"):
        return v.strftime("%Y.%m")
    s = str(v).strip().replace("/", ".").replace("-", ".")
    parts = s.split(".")
    if len(parts) >= 2 and parts[0].isdigit() and parts[1].isdigit():
        s = f"{parts[0]}.{parts[1].zfill(2)}"
    return s

def build_json(df: pd.DataFrame) -> dict:
    ensure_required(df)
    df["총세대수"] = to_num(df["총세대수"], as_int=True)
    df["공급면적"]  = to_num(df["공급면적"])
    df["전용면적"]  = to_num(df["전용면적"])
    df["방수"]      = to_num(df["방수"], as_int=True)
    df["욕실수"]    = to_num(df["욕실수"], as_int=True)
    df["평형별 세대수"] = to_num(df["평형별 세대수"], as_int=True)
    df["공급평수"]  = (df["공급면적"] / PYEONG_PER_M2).round(1)

    # 단지코드만 안정 정렬 → 그룹 내부는 전용면적 오름차순
    df_sorted = df.sort_values(["단지코드"], kind="mergesort")

    result: dict[str, dict] = {}
    for complex_id, g in df_sorted.groupby("단지코드", dropna=True, sort=False):
        first = g.iloc[0]
        g = g.sort_values(["전용면적", "평형명"], na_position="last", kind="mergesort")

        type_rows = []
        seen = set()  # ✅ 중복 제거용
        for _, row in g.iterrows():
            item = {}
            for src, dst in TYPE_COL_MAP.items():
                val = row.get(src)
                if pd.isna(val): val = None
                if hasattr(val, "item"):
                    try: val = val.item()
                    except Exception: pass
                item[dst] = val
            
            # ✅ 같은 평형 중복 제거 (전체 item을 JSON으로 변환해서 비교)
            key = json.dumps(item, ensure_ascii=False, sort_keys=True)
            if key not in seen:
                seen.add(key)
                type_rows.append(item)

        total_units = None if pd.isna(first["총세대수"]) else int(first["총세대수"])
        key = str(complex_id) if pd.notna(complex_id) else ""
        result[key] = {
            "아이디": key,
            "아파트명": None if pd.isna(first["단지명"]) else str(first["단지명"]),
            "입주시기": parse_use_ym(first["사용승인일"]),   # ← 문자열
            "총세대수": total_units,
            "타입정보": type_rows
        }
    return result

def main():
    import argparse
    ap = argparse.ArgumentParser(description="엑셀/CSV → JSON (단지별 한 줄 출력)")
    ap.add_argument("input_path")
    ap.add_argument("output_path")
    ap.add_argument("--sheet", default=None, help="엑셀 시트명/인덱스(0부터). CSV는 무시")
    args = ap.parse_args()

    path_in, path_out = Path(args.input_path), Path(args.output_path)
    sheet = int(args.sheet) if isinstance(args.sheet, str) and args.sheet.isdigit() else args.sheet

    df = read_table(path_in, sheet)
    data = build_json(df)

    # ✅ 저장: 각 단지를 한 줄로 (내부는 완전 압축, 단지 간만 개행)
    # 유효한 JSON 객체를 유지하기 위해 { … } 형태로 감싸고, 항목 사이에 콤마를 넣습니다.
    parts = []
    for k, v in data.items():
        # separators=(',',':') 로 공백 없이 압축
        parts.append(f"\"{k}\":" + json.dumps(v, ensure_ascii=False, separators=(',',':')))
    text = "{\n" + ",\n".join(parts) + "\n}"

    path_out.parent.mkdir(parents=True, exist_ok=True)
    with open(path_out, "w", encoding="utf-8") as f:
        f.write(text)

    print(f"[완료] 단지 수 {len(data)} → {path_out} (단지별 한 줄)")

if __name__ == "__main__":
    main()
