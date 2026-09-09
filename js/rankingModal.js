/* rankingModal.js — 能力値ランキング(遊び機能)。
 * 保管・検索・更新という基本機能とは独立した「眺めて遊ぶ」ための別画面。
 * 選んだ能力値(または全能力値合計)で、ベスト3・ワースト3を表彰台形式で表示する。
 */
(function (global) {
  'use strict';

  let modalEl = null;
  let currentKey = 'abilityTotal';
  let currentEdition = '6版';

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

  // CoC6版は能力値が素の2D6/3D6(だいたい3〜18)、7版・新クトゥルフ神話TRPGは
  // その5倍(だいたい15〜90)というように、版によって能力値のスケールがまるで違う。
  // 混ぜてランキングすると数字として比較にならないため、版ごとに分ける。
  // 「システム」欄は自由入力なので、まずテキストから判定し、書かれていない/
  // 判定できない場合は能力値の平均から推測する(6版なら概ね20未満、7版なら20以上)。
  function editionFor(inv) {
    const sys = String(inv.system || '');
    if (sys.includes('6版')) return '6版';
    if (sys.includes('7版') || sys.includes('新クトゥルフ')) return '7版';
    const vals = Model.ABILITY_KEYS.map((k) => inv.abilities[k]).filter((v) => v != null);
    if (vals.length === 0) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return avg >= 20 ? '7版' : '6版';
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

  function rankedList() {
    return Store.get().investigators
      .filter((inv) => editionFor(inv) === currentEdition && hasValueFor(inv, currentKey))
      .map((inv) => ({ inv, value: valueFor(inv, currentKey) }))
      .sort((a, b) => b.value - a.value);
  }

  const PODIUM_ORDER = [2, 1, 3]; // 表示上の並び(左から2位・1位・3位)

  function podiumHtml(rows, title) {
    if (rows.length === 0) return '';
    const spot = (rank) => {
      const row = rows[rank - 1];
      if (!row) return '';
      return `
        <div class="podium-spot rank-${rank}" data-id="${row.inv.id}">
          <div class="podium-crown">👑</div>
          ${Utils.thumbHtml(row.inv, 'row-thumb podium-thumb')}
          <div class="podium-label">
            <div class="podium-name">${Utils.escapeHtml(row.inv.name) || '(名前未設定)'}</div>
            <div class="podium-value">${row.value}</div>
          </div>
          <div class="podium-step">${rank}</div>
        </div>
      `;
    };
    return `
      <h3 class="ranking-podium-title">${title}</h3>
      <div class="podium">${PODIUM_ORDER.map(spot).join('')}</div>
    `;
  }

  function bodyHtml() {
    const ranked = rankedList();
    if (ranked.length === 0) return '<p class="hint">この版・この項目の値が入っている探索者がいません。</p>';

    const best = ranked.slice(0, 3);
    const worst = ranked.slice(-3).reverse();

    return `
      ${podiumHtml(best, '🏆 ベスト3')}
      ${podiumHtml(worst, '💦 ワースト3')}
    `;
  }

  function wirePodiumClicks(container) {
    container.querySelectorAll('.podium-spot[data-id]').forEach((spot) => {
      spot.addEventListener('click', () => {
        close();
        DetailModal.open(spot.dataset.id);
      });
    });
  }

  function renderBody() {
    const wrap = modalEl.querySelector('#ranking-body-wrap');
    wrap.innerHTML = bodyHtml();
    wirePodiumClicks(wrap);
  }

  function editionCounts() {
    const counts = { '6版': 0, '7版': 0 };
    Store.get().investigators.forEach((inv) => {
      const ed = editionFor(inv);
      if (ed) counts[ed] += 1;
    });
    return counts;
  }

  function open() {
    // どちらの版のデータが多いかを見て、初期表示の版を決める。
    const counts = editionCounts();
    if (counts[currentEdition] === 0 && (counts['6版'] > 0 || counts['7版'] > 0)) {
      currentEdition = counts['7版'] > counts['6版'] ? '7版' : '6版';
    }

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
          <div class="ranking-edition-toggle" id="ranking-edition-toggle">
            <button type="button" class="btn-secondary${currentEdition === '6版' ? ' btn-toggle-active' : ''}" data-edition="6版">6版</button>
            <button type="button" class="btn-secondary${currentEdition === '7版' ? ' btn-toggle-active' : ''}" data-edition="7版">7版</button>
          </div>
        </div>
        <p class="hint-small">能力値のスケールが版によって違うため、6版と7版は別集計にしています。</p>
        <div id="ranking-body-wrap"></div>
      </div>
    `;
    panel.querySelector('#ranking-close').addEventListener('click', close);
    panel.querySelector('#ranking-key').addEventListener('change', (e) => {
      currentKey = e.target.value;
      renderBody();
    });
    panel.querySelectorAll('#ranking-edition-toggle button').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentEdition = btn.dataset.edition;
        panel.querySelectorAll('#ranking-edition-toggle button').forEach((b) => {
          b.classList.toggle('btn-toggle-active', b.dataset.edition === currentEdition);
        });
        renderBody();
      });
    });
    renderBody();
    modalEl.hidden = false;
  }

  function close() {
    modalEl.hidden = true;
  }

  global.RankingModal = { mount, open, close };
})(window);
