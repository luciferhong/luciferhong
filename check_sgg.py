import json

files = [
    'sig_from_emd_wgs84_utf8_2025-11-01_sggfields_part01.geojson',
    'sig_from_emd_wgs84_utf8_2025-11-01_sggfields_part02.geojson'
]

for fp in files:
    g = json.load(open(fp, encoding='utf-8'))
    for f in g['features']:
        p = f.get('properties', {})
        code = str(p.get('sgg_cd') or p.get('code') or p.get('SIG_CD') or '').strip()
        if code.startswith('11'):
            sgg_nm = p.get('sgg_nm')
            name_field = p.get('name')
            sig_kor = p.get('SIG_KOR_NM')
            print(f"code={code}  sgg_nm={sgg_nm!r}  name={name_field!r}  SIG_KOR_NM={sig_kor!r}")
