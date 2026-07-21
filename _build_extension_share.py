# -*- coding: utf-8 -*-
"""extension/(개인용) → extension-share/(공유·웹스토어용) 생성.

공유용 = 개인용에서 개인 전용 스크립트(EXCLUDE_IDS)를 제거한 버전.
extension/ 수정 후 이 스크립트를 실행하면 extension-share/ 전체 재생성 +
웹스토어 제출용 zip(extension-release/)까지 빌드된다.
extension-share/는 직접 수정하지 말 것 (재생성 시 덮어씀).
"""
import io
import json
import os
import re
import shutil
import stat
import time
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'extension')
DST = os.path.join(ROOT, 'extension-share')
RELEASE = os.path.join(ROOT, 'extension-release')

# 공유용에서 제외할 스크립트 id (= scripts/{id}.js 파일명과 동일해야 함)
EXCLUDE_IDS = [
    'gin-national-demand-download',  # 지인 전국 수요-입주 플러스 다운로드 (개인용 전용)
]

# 1) extension-share/ 재생성 (제외 스크립트 파일 빼고 복사)
# OneDrive 동기화 잠금으로 rmtree가 일시 실패할 수 있어 재시도
def _rmtree_retry(path, attempts=5):
    def onexc(func, p, exc):
        os.chmod(p, stat.S_IWRITE)
        func(p)
    for i in range(attempts):
        try:
            shutil.rmtree(path, onexc=onexc)
            return
        except OSError:
            if i == attempts - 1:
                raise
            time.sleep(1.5)

if os.path.exists(DST):
    _rmtree_retry(DST)
exclude_files = {f'{sid}.js' for sid in EXCLUDE_IDS}
shutil.copytree(SRC, DST, ignore=lambda d, names: [
    n for n in names if os.path.basename(d) == 'scripts' and n in exclude_files])

# 2) manifest.json: 제외 스크립트가 포함된 content_scripts 항목 제거
mpath = os.path.join(DST, 'manifest.json')
m = json.load(io.open(mpath, encoding='utf-8'))
before = len(m['content_scripts'])
m['content_scripts'] = [
    cs for cs in m['content_scripts']
    if not any(f'scripts/{sid}.js' in cs['js'] for sid in EXCLUDE_IDS)]
io.open(mpath, 'w', encoding='utf-8', newline='\n').write(
    json.dumps(m, ensure_ascii=False, indent=2) + '\n')
print(f'manifest: {before} → {len(m["content_scripts"])} entries')

# 3) common/registry.js: 제외 id 라인 제거
rpath = os.path.join(DST, 'common', 'registry.js')
lines = io.open(rpath, encoding='utf-8').read().splitlines()
kept = [l for l in lines if not any(f"id: '{sid}'" in l for sid in EXCLUDE_IDS)]
assert len(lines) - len(kept) == len(EXCLUDE_IDS), '레지스트리에서 제외 id를 찾지 못함'
io.open(rpath, 'w', encoding='utf-8', newline='\n').write('\n'.join(kept) + '\n')

# 4) 검증: manifest가 참조하는 파일 존재 + 제외 id 흔적 없음
for cs in m['content_scripts']:
    for j in cs['js']:
        assert os.path.exists(os.path.join(DST, j)), f'누락: {j}'
share_all = ''
for dp, _, fs in os.walk(DST):
    for fn in fs:
        if fn.endswith(('.js', '.json', '.html')):
            share_all += io.open(os.path.join(dp, fn), encoding='utf-8').read()
for sid in EXCLUDE_IDS:
    assert sid not in share_all, f'공유본에 {sid} 잔존'
print('검증 OK: 제외 스크립트 흔적 없음')

# 5) 웹스토어 제출용 zip (공유 버전 기준)
os.makedirs(RELEASE, exist_ok=True)
ver = m['version']
out = os.path.join(RELEASE, f'luciferhong-tools-v{ver}.zip')
for old in os.listdir(RELEASE):
    if re.match(r'luciferhong-tools-v.*\.zip$', old) and os.path.join(RELEASE, old) != out:
        os.remove(os.path.join(RELEASE, old))
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for dp, _, fs in os.walk(DST):
        for fn in sorted(fs):
            full = os.path.join(dp, fn)
            z.write(full, os.path.relpath(full, DST).replace(os.sep, '/'))
print(f'공유용 zip: {out} ({os.path.getsize(out):,} bytes)')
