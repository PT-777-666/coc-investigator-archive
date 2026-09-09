/* rankingModal.js — 能力値ランキング(遊び機能)。
 * 保管・検索・更新という基本機能とは独立した「眺めて遊ぶ」ための別画面。
 * 選んだ能力値(または全能力値合計)で、登録済みの探索者を順位付けして並べる。
 */
(function (global) {
  'use strict';

  let modalEl = null;
  let currentKey = 'abilityTotal';
  let currentDir = 'desc'; // 'desc'(最高から) | 'asc'(最低から)

  const RANK_OPTIONS = [
    { key: 'abilityTotal', label: '全能力値合計' },
    ...Model.ABILITY_KEYS.map((k) => ({ key: k, label: k }))
  ];

  function mount() {
    modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay';
    modalEl.hidden = true;
    modalEl.innerHTML = '<div class="modal-panel modal-panel-wide" id="ranking-panel"></div>';
    document.body.appendChild(modalEl);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) close();
    });
  }

  function valueFor(inv, key) {
    return key === 'abilityTotal' ? Model.abilityTotal(inv) : inv.abilities[key];
  }

  // Model.abilityTotal()は未入力の能力値を0として合計するため、1つも能力値を
  // 入力していない探索者でも常に0という「値」を返してしまう。ランキングに
  // 無関係な探索者が紛れ込まないよう、全能力値合計の場合は個別に判定する。
  function hasValueFor(inv, key) {
    if (key === 'abilityTotal') return Model.ABILITY_KEYS.some((k) => inv.abilities[k] != null);
    return inv.abilities[key] != null;
  }

  const MEDALS = ['🥇', '🥈', '🥉'];

  function listHtml() {
    const ranked = Store.get().investigators
      .filter((inv) => hasValueFor(inv, currentKey))
      .map((inv) => ({ inv, value: valueFor(inv, currentKey) }))
      .sort((a, b) => (currentDir === 'desc' ? b.value - a.value : a.value - b.value));

    if (ranked.length === 0) return '<p class="hint">この項目の値が入っている探索者がいません。</p>';

    const rows = ranked.map((row, i) => `
      <li class="ranking-row" data-id="${row.inv.id}">
        <span class="ranking-rank">${MEDALS[i] || `${i + 1}位`}</span>
        <span class="ranking-name">${Utils.escapeHtml(row.inv.name) || '(名前未設定)'}</span>
        <span class="ranking-value">${row.value}</span>
      </li>
    `).join('');
    return `<ol class="ranking-list">${rows}</ol>`;
  }

  function renderList() {
    modalEl.querySelector('#ranking-list-wrap').innerHTML = listHtml();
    modalEl.querySelector('#ranking-list-wrap').querySelectorAll('.ranking-row').forEach((row) => {
      row.addEventListener('click', () => {
        close();
        DetailModal.open(row.dataset.id);
      });
    });
  }

  function open() {
    const panel = modalEl.querySelector('#ranking-panel');
    panel.innerHTML = `
      <div class="modal-header">
        <h2>🏆 能力値ランキング</h2>
        <button type="button" class="btn-icon" id="ranking-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="toolbar-row">
          <select id="ranking-key" class="filter-select">
            ${RANK_OPTIONS.map((o) => `<option value="${o.key}"${o.key === currentKey ? ' selected' : ''}>${o.label}</option>`).join('')}
          </select>
          <button type="button" id="ranking-dir-btn" class="btn-secondary">${currentDir === 'desc' ? '最高から' : '最低から'}</button>
        </div>
        <div id="ranking-list-wrap"></div>
      </div>
    `;
    panel.querySelector('#ranking-close').addEventListener('click', close);
    panel.querySelector('#ranking-key').addEventListener('change', (e) => {
      currentKey = e.target.value;
      renderList();
    });
    panel.querySelector('#ranking-dir-btn').addEventListener('click', (e) => {
      currentDir = currentDir === 'desc' ? 'asc' : 'desc';
      e.target.textContent = currentDir === 'desc' ? '最高から' : '最低から';
      renderList();
    });
    renderList();
    modalEl.hidden = false;
  }

  function close() {
    modalEl.hidden = true;
  }

  global.RankingModal = { mount, open, close };
})(window);
