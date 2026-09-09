/* listView.js — 探索者の一覧表(テーブル)を描画する。
 * 行クリックで詳細モーダルを開き、行内のボタンから編集・削除もできる。
 */
(function (global) {
  'use strict';

  let rootEl = null;

  function mount(el) {
    rootEl = el;
    Store.subscribe(render);
    render();
  }

  function render() {
    if (!rootEl) return;
    const state = Store.get();
    if (state.loading) {
      rootEl.innerHTML = '<p class="hint">読み込み中…</p>';
      return;
    }
    const list = Store.visibleInvestigators();
    if (list.length === 0) {
      rootEl.innerHTML = '<p class="hint">条件に一致する探索者がいません。</p>';
      return;
    }

    const rows = list.map((inv) => `
      <tr class="inv-row" data-id="${inv.id}">
        <td>${Utils.thumbHtml(inv)}</td>
        <td class="col-name">${Utils.investigatorNameHtml(inv)}</td>
        <td>${Utils.escapeHtml(inv.occupation)}</td>
        <td>${Utils.escapeHtml(inv.system)}</td>
        <td><span class="status-badge status-${Utils.escapeHtml(inv.status)}">${Utils.escapeHtml(inv.status)}</span></td>
        <td class="col-tags">${(inv.tags || []).map((t) => `<span class="tag-chip-sm">${Utils.escapeHtml(t)}</span>`).join('')}</td>
        <td class="col-date">${Utils.escapeHtml(Utils.formatDateTime(inv.updatedAt))}</td>
        <td class="col-actions">
          <button type="button" class="btn-icon" data-action="edit" title="編集">✎</button>
          <button type="button" class="btn-icon btn-icon-danger" data-action="delete" title="削除">🗑</button>
        </td>
      </tr>
    `).join('');

    rootEl.innerHTML = `
      <table class="inv-table">
        <thead>
          <tr>
            <th></th><th>名前</th><th>職業</th><th>システム</th><th>状態</th><th>タグ</th><th>更新日</th><th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    rootEl.querySelectorAll('.inv-row').forEach((row) => {
      const id = row.dataset.id;
      row.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) {
          DetailModal.open(id);
          return;
        }
        e.stopPropagation();
        if (actionBtn.dataset.action === 'edit') {
          const inv = Store.get().investigators.find((x) => x.id === id);
          InvestigatorForm.open(inv);
        } else if (actionBtn.dataset.action === 'delete') {
          MainActions.deleteInvestigator(id);
        }
      });
    });
  }

  global.ListView = { mount };
})(window);
