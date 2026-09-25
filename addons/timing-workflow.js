/* Optional timing workflow helpers: clipboard paste and lyric-list follow. */
(function timingWorkflowAddon() {
  'use strict';

  const isEnglish = document.documentElement.lang === 'en';
  const state = { selectedLine: -1, follow: true, followedLine: -1 };
  const lineList = document.getElementById('lineList');
  const copyGroup = document.querySelector('.time-copy');
  const loopButton = document.getElementById('btnLoop');
  if (!lineList || !copyGroup || !loopButton) return;

  copyGroup.setAttribute('aria-label', isEnglish ? 'Copy or paste timestamps' : 'タイムスタンプをコピーまたは貼り付け');
  const pasteButton = document.createElement('button');
  pasteButton.type = 'button';
  pasteButton.id = 'btnPasteTime';
  pasteButton.className = 'ghost small paste-time';
  pasteButton.textContent = isEnglish ? 'Paste' : '貼り付け';
  pasteButton.title = isEnglish ? 'Paste the clipboard timestamp into the selected or current line' : 'クリップボードのタイムスタンプを選択中または再生中の行へ貼り付け';
  copyGroup.insertBefore(pasteButton, document.getElementById('timeCopyStatus'));

  const followButton = document.createElement('button');
  followButton.type = 'button';
  followButton.id = 'btnFollowLyrics';
  followButton.className = 'ghost small';
  followButton.textContent = isEnglish ? 'Follow lyrics' : '歌詞追随';
  followButton.title = isEnglish ? 'Keep the current lyric line centered while playing' : '再生位置に合う歌詞行を左欄の中央へ追随';
  followButton.setAttribute('aria-pressed', 'true');
  loopButton.parentNode.insertBefore(followButton, loopButton);

  function rows() { return Array.from(lineList.querySelectorAll('.ln')); }
  function markSelected() {
    rows().forEach((row, index) => {
      const selected = index === state.selectedLine;
      if (row.classList.contains('timing-selected') !== selected) row.classList.toggle('timing-selected', selected);
    });
  }
  function selectRow(row) {
    const index = rows().indexOf(row);
    if (index < 0) return;
    state.selectedLine = index;
    markSelected();
  }
  lineList.addEventListener('pointerdown', event => {
    const row = event.target.closest('.ln');
    if (row) selectRow(row);
  });
  lineList.addEventListener('focusin', event => {
    const row = event.target.closest('.ln');
    if (row) selectRow(row);
  });

  function parseTimestamp(raw) {
    let value = String(raw || '').trim().replace(/^\[/, '').replace(/\]$/, '').replace(',', '.');
    if (!value) return null;
    if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value);
    const parts = value.split(':');
    if (parts.length < 2 || parts.length > 3 || parts.some(part => !/^\d+(?:\.\d+)?$/.test(part))) return null;
    const seconds = Number(parts.pop());
    const minutes = Number(parts.pop());
    const hours = parts.length ? Number(parts.pop()) : 0;
    if (minutes >= 60 || seconds >= 60) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }
  function targetLineIndex() {
    const all = rows();
    if (state.selectedLine >= 0 && state.selectedLine < all.length) return state.selectedLine;
    const current = all.findIndex(row => row.classList.contains('cur'));
    return current >= 0 ? current : (all.length ? 0 : -1);
  }
  function setStatus(message) {
    const status = document.getElementById('timeCopyStatus');
    if (!status) return;
    status.textContent = message;
    clearTimeout(status._timer);
    status._timer = setTimeout(() => { status.textContent = isEnglish ? 'Click to copy' : 'クリックでコピー'; }, 2200);
  }
  pasteButton.addEventListener('click', async () => {
    let text = '';
    try {
      if (navigator.clipboard && navigator.clipboard.readText) text = await navigator.clipboard.readText();
    } catch (error) {}
    if (!text) text = window.prompt(isEnglish ? 'Paste a timestamp (seconds or mm:ss)' : 'タイムスタンプを貼り付けてください（秒 または mm:ss）') || '';
    const seconds = parseTimestamp(text);
    const index = targetLineIndex();
    const input = rows()[index] && rows()[index].querySelector('.time');
    if (!Number.isFinite(seconds) || seconds < 0 || !input) {
      setStatus(isEnglish ? 'Paste failed' : '貼り付け失敗');
      return;
    }
    state.selectedLine = index;
    input.value = seconds.toFixed(2);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    setStatus(`${seconds.toFixed(2)} → ${String(index + 1).padStart(2, '0')}`);
  });

  function followCurrentLine() {
    if (!state.follow) return;
    const all = rows();
    const index = all.findIndex(row => row.classList.contains('cur'));
    if (index < 0 || index === state.followedLine) return;
    state.followedLine = index;
    const row = all[index];
    const panel = lineList.closest('.col-left');
    if (!panel || panel.scrollHeight <= panel.clientHeight) return;
    const rowRect = row.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const rowTop = rowRect.top - panelRect.top + panel.scrollTop;
    const top = rowTop - (panel.clientHeight - rowRect.height) / 2;
    panel.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
  followButton.addEventListener('click', () => {
    state.follow = !state.follow;
    followButton.setAttribute('aria-pressed', String(state.follow));
    if (state.follow) { state.followedLine = -1; followCurrentLine(); }
  });
  new MutationObserver(() => {
    markSelected();
    followCurrentLine();
  }).observe(lineList, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  followCurrentLine();
})();
