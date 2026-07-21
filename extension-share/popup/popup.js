// 스크립트 목록·표시 이름·기본값은 common/registry.js에서 관리
const SCRIPTS = SCRIPT_REGISTRY;

const listEl = document.getElementById('scriptList');

async function render() {
  const { enabled = {} } = await chrome.storage.sync.get('enabled');
  listEl.textContent = '';
  for (const script of SCRIPTS) {
    const li = document.createElement('li');

    const label = document.createElement('label');
    label.textContent = script.name;
    label.htmlFor = `toggle-${script.id}`;

    const wrap = document.createElement('span');
    wrap.className = 'switch';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `toggle-${script.id}`;
    checkbox.checked = script.id in enabled ? enabled[script.id] !== false : script.on !== false;
    checkbox.addEventListener('change', () => save(script.id, checkbox.checked));
    wrap.appendChild(checkbox);

    li.appendChild(label);
    li.appendChild(wrap);
    listEl.appendChild(li);
  }
}

async function save(id, isOn) {
  const { enabled = {} } = await chrome.storage.sync.get('enabled');
  enabled[id] = isOn;
  await chrome.storage.sync.set({ enabled });
}

document.getElementById('reloadBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.reload(tab.id);
  window.close();
});

render();
