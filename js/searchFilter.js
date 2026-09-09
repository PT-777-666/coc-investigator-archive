/* searchFilter.js — 検索ボックス・タグ絞り込み・システム/状態フィルタ・並べ替えUI。 */
(function (global) {
  'use strict';

  function mount(el) {
    el.innerHTML = `
      <div class="toolbar-row">
        <input type="search" id="search-input" class="search-input" placeholder="名前・職業・タグ・技能などで検索">
        <select id="filter-system" class="filter-select"><option value="">システム: すべて</option></select>
        <select id="filter-status" class="filter-select"></select>
        <select id="sort-key" class="filter-select"></select>
        <button type="button" id="sort-dir-btn" class="btn-secondary" title="並べ替え方向を切り替え">↓</button>
      </div>
      <div class="toolbar-row tag-bar" id="tag-bar"></div>
    `;

    const searchInput = el.querySelector('#search-input');
    searchInput.addEventListener('input', Utils.debounce(() => {
      Store.set({ searchQuery: searchInput.value });
    }, 150));

    const statusSelect = el.querySelector('#filter-status');
    statusSelect.innerHTML = '<option value="">状態: すべて</option>' +
      Model.STATUS_OPTIONS.map((s) => `<option value="${s}">${s}</option>`).join('');
    statusSelect.addEventListener('change', () => Store.set({ statusFilter: statusSelect.value }));

    const sortSelect = el.querySelector('#sort-key');
    sortSelect.innerHTML = SORT_OPTIONS.map((o) => `<option value="${o.key}">並べ替え: ${o.label}</option>`).join('');
    sortSelect.addEventListener('change', () => Store.set({ sortKey: sortSelect.value }));

    const sortDirBtn = el.querySelector('#sort-dir-btn');
    sortDirBtn.addEventListener('click', () => {
      const next = Store.get().sortDir === 'asc' ? 'desc' : 'asc';
      Store.set({ sortDir: next });
    });

    const systemSelect = el.querySelector('#filter-system');
    systemSelect.addEventListener('change', () => Store.set({ systemFilter: systemSelect.value }));

    Store.subscribe((state) => {
      sortDirBtn.textContent = state.sortDir === 'asc' ? '↑' : '↓';
      renderSystemOptions(systemSelect, state);
      renderTagBar(el.querySelector('#tag-bar'), state);
    });
    renderSystemOptions(systemSelect, Store.get());
    renderTagBar(el.querySelector('#tag-bar'), Store.get());
  }

  // システム選択肢は登録済みデータから動的に作る(選択中の値は維持する)。
  function renderSystemOptions(selectEl, state) {
    const current = state.systemFilter;
    const options = ['<option value="">システム: すべて</option>']
      .concat(Store.allSystems().map((s) => `<option value="${Utils.escapeHtml(s)}"${s === current ? ' selected' : ''}>${Utils.escapeHtml(s)}</option>`));
    const html = options.join('');
    if (selectEl.innerHTML !== html) selectEl.innerHTML = html;
  }

  function renderTagBar(el, state) {
    const tags = Store.allTags();
    if (tags.length === 0) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = tags.map((t) => {
      const active = state.selectedTags.includes(t) ? ' tag-chip-active' : '';
      return `<button type="button" class="tag-chip${active}" data-tag="${Utils.escapeHtml(t)}">${Utils.escapeHtml(t)}</button>`;
    }).join('');
    el.querySelectorAll('.tag-chip').forEach((btn) => {
      btn.addEventListener('click', () => Store.toggleTag(btn.dataset.tag));
    });
  }

  global.SearchFilter = { mount };
})(window);
