"""
전출입 데이터 전처리 스크립트 (다년도 버전)
입력: 행정동코드.txt, 2020~2025 연도별 CSV
출력:
  migration_data.json  — hierarchy + 연도별 sido/sgg 집계 (~3.7MB)
  emd/XXXXX.json       — 시군구별 emd 집계 (6년 합산, 시군구당 수십~수백KB)
                         HTML에서 시군구 선택 시 lazy load
"""

import csv
import json
import os
from collections import defaultdict

ADDR_CODE_FILE = "행정동코드.txt"
OUTPUT_FILE = "migration_data.json"
EMD_DIR = "emd"
EMD_OUT_DIR = "emd_out"

YEAR_FILES = {
    "2015": "2015_세대관련연간자료_20260402_53412.csv",
    "2016": "2016_세대관련연간자료_20260402_53412.csv",
    "2017": "2017_세대관련연간자료_20260402_53412.csv",
    "2018": "2018_세대관련연간자료_20260402_53412.csv",
    "2019": "2019_세대관련연간자료_20260402_53412.csv",
    "2020": "2020_세대관련연간자료_20260402_33193.csv",
    "2021": "2021_세대관련연간자료_20260402_01097.csv",
    "2022": "2022_세대관련연간자료_20260402_01097.csv",
    "2023": "2023_세대관련연간자료_20260402_01097.csv",
    "2024": "2024_세대관련연간자료_20260402_01097.csv",
    "2025": "2025_세대관련연간자료_20260402_01097.csv",
}

def load_addr_codes(filepath):
    codes = {}
    with open(filepath, "r", encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split("\t")
            if len(parts) >= 2:
                code = parts[0].strip()
                name = parts[1].strip()
                if len(code) == 10:
                    codes[code] = name
    return codes

def build_hierarchy(codes):
    hierarchy = {}
    for code, name in sorted(codes.items()):
        sido = code[:2]
        sgg  = code[2:5]
        emd  = code[5:]

        if sido not in hierarchy:
            sido_code = code[:2] + "00000000"
            hierarchy[sido] = {
                "name": codes.get(sido_code, name.split()[0]),
                "sgg": {}
            }

        if emd == "00000":
            continue
        if sgg not in hierarchy[sido]["sgg"]:
            sgg_code = code[:5] + "00000"
            sgg_name = codes.get(sgg_code, "")
            if not sgg_name:
                continue
            hierarchy[sido]["sgg"][sgg] = {"name": sgg_name, "emd": {}}

        if sgg in hierarchy[sido]["sgg"]:
            short_name = name.split()[-1] if name.split() else name
            hierarchy[sido]["sgg"][sgg]["emd"][emd] = short_name

    for sido, sdata in hierarchy.items():
        sido_full = sido + "00000000"
        if sido_full in codes:
            sdata["name"] = codes[sido_full]

    return hierarchy

def build_sgg_alias(hierarchy):
    """같은 시도 내 동일한 시군구명 → 가장 큰(최신) 코드로 통일하는 매핑 반환
    반환: {sgg5_old: sgg5_canonical, ...}
    """
    alias = {}  # old sgg5 → canonical sgg5
    for sido, sdata in hierarchy.items():
        # 이름 → 코드 목록
        name_to_codes = {}
        for sgg, info in sdata["sgg"].items():
            n = info["name"]
            name_to_codes.setdefault(n, []).append(sgg)

        for name, sgg_list in name_to_codes.items():
            if len(sgg_list) < 2:
                continue
            # 가장 큰 코드(최신)를 canonical로 사용
            canonical = max(sgg_list)
            for sgg in sgg_list:
                if sgg != canonical:
                    alias[sido + sgg] = sido + canonical

    return alias

def rebuild_emd_keys(hierarchy, sgg_alias):
    """EMD 키를 5자리 → 10자리 원본 코드로 변환.
    구 SGG(alias된 것)의 EMD를 canonical SGG에 병합 후, 모든 EMD 키를 10자리로 변환.
    """
    # 1단계: 구 SGG의 EMD를 canonical SGG에 10자리 원본 키로 병합
    for old_sgg5, canonical_sgg5 in sgg_alias.items():
        old_sido = old_sgg5[:2]
        old_sgg  = old_sgg5[2:]
        can_sgg  = canonical_sgg5[2:]
        if old_sgg not in hierarchy.get(old_sido, {}).get('sgg', {}):
            continue
        old_emd = hierarchy[old_sido]['sgg'][old_sgg]['emd']   # {5digit: name}
        can_emd = hierarchy[old_sido]['sgg'][can_sgg]['emd']   # {5digit: name}
        for emd5, name in old_emd.items():
            orig_key = old_sgg5 + emd5   # 10자리 원본 코드
            can_emd[orig_key] = name

    # 2단계: 모든 SGG의 남은 5자리 EMD 키 → 10자리 변환
    for sido, sdata in hierarchy.items():
        for sgg, info in sdata['sgg'].items():
            sgg5 = sido + sgg
            new_emd = {}
            for k, v in info['emd'].items():
                if len(k) == 5:
                    new_emd[sgg5 + k] = v
                else:
                    new_emd[k] = v   # 이미 10자리 (1단계에서 병합된 것)
            info['emd'] = new_emd


def aggregate_all(csv_filepaths, sgg_alias):
    """모든 CSV를 한 번에 순회 → sido/sgg(연도별) + emd(합산) 집계
    sgg_alias: {old_sgg5: canonical_sgg5} — 같은 이름 시군구 코드 통일
    """
    def norm_sgg(sgg5):
        return sgg_alias.get(sgg5, sgg5)

    # 연도별 sido/sgg
    years_sido = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    years_sgg  = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    # emd 전입: {in_sgg5:  {in_emd10:  {out_emd10: count}}}
    # emd 전출: {out_sgg5: {out_emd10: {in_emd10:  count}}}
    emd_in_by_sgg  = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    emd_out_by_sgg = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

    grand_total = 0
    for year, csv_file in sorted(csv_filepaths.items()):
        if not os.path.exists(csv_file):
            print(f"\n  [{year}] 파일 없음, 건너뜀")
            continue
        size_mb = os.path.getsize(csv_file) / 1024 / 1024
        print(f"\n  [{year}] {csv_file} ({size_mb:.0f}MB)")
        total = 0
        errors = 0
        with open(csv_file, "r", encoding="utf-8-sig", newline="") as f:
            for row in csv.reader(f):
                if len(row) < 9:
                    errors += 1; continue
                try:
                    in_sido  = row[0].strip().zfill(2)
                    in_sgg   = row[1].strip().zfill(3)
                    in_emd   = row[2].strip().zfill(5)
                    out_sido = row[6].strip().zfill(2)
                    out_sgg  = row[7].strip().zfill(3)
                    out_emd  = row[8].strip().zfill(5)

                    if not in_sido.isdigit() or not out_sido.isdigit():
                        errors += 1; continue

                    in_sgg5  = norm_sgg(in_sido  + in_sgg)
                    out_sgg5 = norm_sgg(out_sido + out_sgg)
                    # EMD 키는 alias 미적용 원본 코드 유지 (이름 다른 동 구분)
                    in_emd10  = in_sido  + in_sgg  + in_emd
                    out_emd10 = out_sido + out_sgg + out_emd

                    years_sido[year][in_sido][out_sido] += 1
                    years_sgg[year][in_sgg5][out_sgg5]  += 1
                    emd_in_by_sgg[in_sgg5][in_emd10][out_emd10]   += 1
                    emd_out_by_sgg[out_sgg5][out_emd10][in_emd10] += 1

                    total += 1
                    if total % 500000 == 0:
                        print(f"    {total:,}건...", flush=True)
                except (IndexError, ValueError):
                    errors += 1
        print(f"    완료: {total:,}건, 오류 {errors}건")
        grand_total += total

    print(f"\n  전체 {grand_total:,}건 처리 완료")
    return years_sido, years_sgg, emd_in_by_sgg, emd_out_by_sgg

def main():
    print("=== 전출입 다년도 전처리 시작 ===\n")

    print("[1] 행정동코드 로드")
    codes = load_addr_codes(ADDR_CODE_FILE)
    print(f"    → {len(codes):,}개")

    print("\n[2] 계층 구조 생성")
    hierarchy = build_hierarchy(codes)
    print(f"    → 시도 {len(hierarchy)}개, 시군구 {sum(len(s['sgg']) for s in hierarchy.values())}개")

    print("\n[3] 시군구 동명 alias 생성")
    sgg_alias = build_sgg_alias(hierarchy)
    dup_count = len(sgg_alias)
    print(f"    → 중복 시군구명 {dup_count}건 통일")
    if dup_count:
        for old, new in sorted(sgg_alias.items())[:5]:
            h_sido = old[:2]; h_sgg_old = old[2:]; h_sgg_new = new[2:]
            nm = hierarchy[h_sido]["sgg"].get(h_sgg_old, {}).get("name", "?")
            print(f"      {old}({nm}) → {new}")

    print("\n[3-1] EMD 키 10자리 변환 및 구 SGG EMD 병합")
    rebuild_emd_keys(hierarchy, sgg_alias)
    print(f"    완료")

    print("\n[4] CSV 집계 (sido/sgg 연도별 + emd 합산)")
    years_sido, years_sgg, emd_in_by_sgg, emd_out_by_sgg = aggregate_all(YEAR_FILES, sgg_alias)

    # 연도별 데이터 dict 변환
    years_data = {}
    for year in sorted(set(years_sido) | set(years_sgg)):
        years_data[year] = {
            "sido": {k: dict(v) for k, v in years_sido[year].items()},
            "sgg":  {k: dict(v) for k, v in years_sgg[year].items()},
        }

    # alias로 통일된 구 코드 hierarchy에서 제거
    alias_old_sgg5 = set(sgg_alias.keys())
    for sido_code, sdata in hierarchy.items():
        sdata["sgg"] = {
            sgg: info for sgg, info in sdata["sgg"].items()
            if (sido_code + sgg) not in alias_old_sgg5
        }

    # 미사용 코드 제거 (폐지된 시군구 코드 + 데이터 없는 읍면동)
    print("\n[5] 미사용 코드 제거")

    # 실제 EMD 데이터에 등장한 emd10 코드 수집
    used_emd10 = set()
    for emd_map in emd_in_by_sgg.values():
        used_emd10.update(emd_map.keys())
    for emd_map in emd_out_by_sgg.values():
        for inner in emd_map.values():
            used_emd10.update(inner.keys())

    used_sido = set()
    used_sgg = set()
    for yd in years_data.values():
        for k, vmap in yd["sido"].items():
            used_sido.add(k)
            used_sido.update(vmap.keys())
        for k, vmap in yd["sgg"].items():
            used_sgg.add(k)
            used_sgg.update(vmap.keys())

    before_sido = len(hierarchy)
    before_sgg = sum(len(s["sgg"]) for s in hierarchy.values())
    before_emd = sum(len(info["emd"]) for s in hierarchy.values() for info in s["sgg"].values())
    for sido_code, sdata in hierarchy.items():
        sdata["sgg"] = {
            sgg: info for sgg, info in sdata["sgg"].items()
            if (sido_code + sgg) in used_sgg
        }
        for info in sdata["sgg"].values():
            info["emd"] = {k: v for k, v in info["emd"].items() if k in used_emd10}
    hierarchy = {k: v for k, v in hierarchy.items() if k in used_sido}
    after_sido = len(hierarchy)
    after_sgg = sum(len(s["sgg"]) for s in hierarchy.values())
    after_emd = sum(len(info["emd"]) for s in hierarchy.values() for info in s["sgg"].values())
    print(f"    시도:   {before_sido}개 → {after_sido}개 (미사용 {before_sido-after_sido}개 제거)")
    print(f"    시군구: {before_sgg}개 → {after_sgg}개 (미사용 {before_sgg-after_sgg}개 제거)")
    print(f"    읍면동: {before_emd}개 → {after_emd}개 (미사용 {before_emd-after_emd}개 제거)")

    # migration_data.json 저장
    print(f"\n[6] {OUTPUT_FILE} 저장")
    data = {"hierarchy": hierarchy, "years": years_data, "sgg_alias": sgg_alias}
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"    → {os.path.getsize(OUTPUT_FILE)/1024/1024:.1f} MB")

    # 시군구별 emd 전입 JSON 저장
    print(f"\n[7] 시군구별 emd 전입 파일 저장 → {EMD_DIR}/")
    os.makedirs(EMD_DIR, exist_ok=True)
    saved = 0
    total_kb = 0
    for sgg5, emd_map in emd_in_by_sgg.items():
        out = {k: dict(v) for k, v in emd_map.items()}
        path = os.path.join(EMD_DIR, f"{sgg5}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        kb = os.path.getsize(path) / 1024
        total_kb += kb
        saved += 1
        if saved % 50 == 0:
            print(f"    {saved}개 저장 중...", flush=True)
    print(f"    → {saved}개 파일, 총 {total_kb/1024:.1f} MB")

    # 시군구별 emd 전출 JSON 저장
    print(f"\n[8] 시군구별 emd 전출 파일 저장 → {EMD_OUT_DIR}/")
    os.makedirs(EMD_OUT_DIR, exist_ok=True)
    saved = 0
    total_kb = 0
    for sgg5, emd_map in emd_out_by_sgg.items():
        out = {k: dict(v) for k, v in emd_map.items()}
        path = os.path.join(EMD_OUT_DIR, f"{sgg5}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        kb = os.path.getsize(path) / 1024
        total_kb += kb
        saved += 1
        if saved % 50 == 0:
            print(f"    {saved}개 저장 중...", flush=True)
    print(f"    → {saved}개 파일, 총 {total_kb/1024:.1f} MB")

    print("\n=== 완료 ===")

if __name__ == "__main__":
    main()
