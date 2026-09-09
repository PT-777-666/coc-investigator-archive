/* detailModal.js — 探索者の詳細表示モーダル。編集・削除の起点にもなる。 */
(function (global) {
  'use strict';

  let modalEl = null;

  function mount() {
    modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay';
    modalEl.hidden = true;
    modalEl.innerHTML = '<div class="modal-panel modal-panel-detail" id="detail-panel"></div>';
    document.body.appendChild(modalEl);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) close();
    });
  }

  function abilityRow(inv) {
    return Model.ABILITY_KEYS.map((k) => `
      <div class="stat-cell"><span class="stat-key">${k}</span><span class="stat-val">${inv.abilities[k] ?? '-'}</span></div>
    `).join('');
  }

  // SANは「最大値」をデータとして持っていないため、目安の上限(99)に対する
  // 割合でゲージを描く簡易的な表示。HP/MPは単なる数値表記にしたため対象外。
  const GAUGE_REFS = { SAN: 99 };

  function gaugeHtml(key, value) {
    const ref = GAUGE_REFS[key];
    const pct = value == null ? 0 : Math.max(0, Math.min(100, Math.round((value / ref) * 100)));
    // SANが目安上限の1/5を下回る範囲は「不定領域」(発狂の危険域)として、
    // トラックの背景色を変えて一目で分かるようにする(現在値がその範囲まで
    // 減っていなければ、ゲージに隠れて見えない)。
    const dangerClass = key === 'SAN' ? ' gauge-track-danger' : '';
    return `
      <div class="gauge-row">
        <span class="gauge-label">${key}</span>
        <div class="gauge-track${dangerClass}"><div class="gauge-fill gauge-fill-${key}" style="width:${pct}%"></div></div>
        <span class="gauge-value">${value ?? '-'}</span>
      </div>
    `;
  }

  function derivedRow(inv) {
    const gaugeKeys = Object.keys(GAUGE_REFS).filter((k) => Model.DERIVED_KEYS.includes(k));
    const otherKeys = Model.DERIVED_KEYS.filter((k) => !GAUGE_REFS[k]);
    const gauges = gaugeKeys.map((k) => gaugeHtml(k, inv.derived[k])).join('');
    const others = otherKeys.map((k) => `
      <div class="stat-cell"><span class="stat-key">${k}</span><span class="stat-val">${inv.derived[k] ?? '-'}</span></div>
    `).join('');
    return `<div class="gauge-group">${gauges}</div>${others ? `<div class="stat-grid" style="margin-top:8px;">${others}</div>` : ''}`;
  }

  // 技能の状態。90以上は最優先で強調し、それ以外は「初期値のまま」か
  // 「成長させたか」で分ける。初期値は取り込み元のデータ(s.initial)を優先し、
  // 無ければCoC6版の標準初期値表(Model.baseSkillValue)から求める。
  function skillState(s, abilities) {
    if (s.value != null && s.value >= 90) return 'exceptional';
    const baseline = s.initial != null ? s.initial : Model.baseSkillValue(s.name, abilities);
    if (baseline == null || s.value == null) return '';
    return s.value > baseline ? 'grown' : 'initial';
  }

  // いあきゃら等の技能表と同じように、初期/職業/興味/成長/他/合計を列で並べる。
  // 内訳が無い技能(ここふぉりあ駒出力・手入力など)は該当欄が「-」になるだけで、
  // 合計はそのまま表示される。
  function skillTableHtml(skills, abilities) {
    const cell = (v) => `<td>${v ?? '-'}</td>`;
    const rows = skills.map((s) => {
      const state = skillState(s, abilities);
      const totalClass = state ? `skill-total skill-total-${state}` : 'skill-total';
      // 初期値のままの技能は、既定では「初期値のままの技能も表示する」チェックが
      // 入るまで隠す(hidden属性で描画時から隠しておき、チェック時にJSで外す)。
      return `
        <tr data-skill-state="${state}"${state === 'initial' ? ' hidden' : ''}>
          <td class="skill-name-cell">${Utils.escapeHtml(s.name)}</td>
          ${cell(s.initial)}
          ${cell(s.occupation)}
          ${cell(s.interest)}
          ${cell(s.growth)}
          ${cell(s.other)}
          <td class="${totalClass}">${s.value ?? '-'}</td>
        </tr>
      `;
    }).join('');
    return `
      <div class="skill-table-wrap">
        <table class="skill-table">
          <thead>
            <tr><th>技能名</th><th>初期</th><th>職業</th><th>興味</th><th>成長</th><th>他</th><th>合計</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  // キャラクター保管所の実UI(戦闘技能/探索技能/行動技能/交渉技能/知識技能の5分類、
  // charaHokankoSync.jsのSKILL_GROUPSと同じ並び)に合わせて、技能をカテゴリごとの
  // 表に分けて横に並べる。件数の多い1列の表よりも見つけやすく、間延びしない。
  const SKILL_CATEGORY_LABELS = {
    TBA: '戦闘技能',
    TFA: '探索技能',
    TAA: '行動技能',
    TCA: '交渉技能',
    TKA: '知識技能'
  };
  const SKILL_CATEGORY_ORDER = ['TBA', 'TFA', 'TAA', 'TCA', 'TKA'];

  // 「製作(美術品修復)」のような分野付き技能名からカテゴリ判定用の素の技能名を取り出す。
  function bareSkillName(name) {
    return String(name || '').replace(/[（(].*$/, '').trim();
  }

  // 「こぶし（パンチ）」のように括弧込みがそのまま正式な技能名のものもあるため、
  // まず名前そのもので探し、見つからなければ分野を除いた素の名前で探す。
  function findSkillCategory(groups, skillName) {
    const exact = groups.find((g) => g.names.includes(skillName));
    if (exact) return exact;
    const bare = bareSkillName(skillName);
    return groups.find((g) => g.names.includes(bare));
  }

  function groupSkillsByCategory(skills) {
    const groups = SKILL_CATEGORY_ORDER.map((prefix) => ({
      label: SKILL_CATEGORY_LABELS[prefix],
      names: CharaHokankoSync.SKILL_GROUPS[prefix],
      skills: []
    }));
    const others = [];
    skills.forEach((s) => {
      const group = findSkillCategory(groups, s.name);
      (group ? group.skills : others).push(s);
    });
    return { groups, others };
  }

  function skillGroupHtml(label, skills, abilities) {
    // グループ内が全て初期値のままの技能だった場合、既定では行と一緒にグループ自体も隠す
    // (チェックを入れたときにJS側で外す。「初期値のまま」と判定できない技能が1件でも
    // あれば、そちらは常に表示されるのでグループごと隠さない)。
    const allInitial = skills.length > 0 && skills.every((s) => skillState(s, abilities) === 'initial');
    return `
      <div class="skill-group"${allInitial ? ' hidden' : ''}>
        <h4 class="skill-group-title">${Utils.escapeHtml(label)}</h4>
        ${skillTableHtml(skills, abilities)}
      </div>
    `;
  }

  function skillsHtml(inv) {
    if (!inv.skills || inv.skills.length === 0) return '<p class="hint">技能の登録はありません。</p>';
    const { groups, others } = groupSkillsByCategory(inv.skills);
    const sections = groups
      .filter((g) => g.skills.length > 0)
      .map((g) => skillGroupHtml(g.label, g.skills, inv.abilities));
    if (others.length > 0) sections.push(skillGroupHtml('その他', others, inv.abilities));
    return `<div class="skill-table-columns">${sections.join('')}</div>`;
  }

  // 技能は初期値のままのものも含めると件数が多くなりがちなため、既定では
  // 「初期値のまま(=未成長)」の技能を隠し、チェックを入れたときだけ全件表示する。
  function skillFilterToggleHtml(inv) {
    if (!inv.skills || inv.skills.length === 0) return '';
    return `
      <label class="skill-filter-toggle">
        <input type="checkbox" id="skill-show-all">
        初期値のままの技能も表示する
      </label>
    `;
  }

  function applySkillFilter(scopeEl, showAll) {
    scopeEl.querySelectorAll('tr[data-skill-state]').forEach((tr) => {
      tr.hidden = !showAll && tr.dataset.skillState === 'initial';
    });
    scopeEl.querySelectorAll('.skill-group').forEach((group) => {
      const rows = group.querySelectorAll('tbody tr');
      if (rows.length === 0) return;
      group.hidden = ![...rows].some((tr) => !tr.hidden);
    });
  }

  // いあきゃらの「新たに得た知識・経験」で使われる3カテゴリ。この3つは
  // 「カテゴリ名: タイトル」という形でメモのtitleに入ってくる(iacharaSync.js参照)ため、
  // カテゴリごとに別々の折りたたみグループに分類する。
  const KNOWLEDGE_NOTE_CATEGORIES = ['魔導書、呪文、アーティファクト', '遭遇した超自然の存在', '通過したシナリオ名'];

  function matchesCategory(n, cat) {
    return n.title === cat || n.title.startsWith(`${cat}: `);
  }

  // グループの見出し(トグルのsummary)に既にカテゴリ名が出ているため、
  // 各メモのタイトルからは「カテゴリ名: 」の重複部分を取り除いて表示する。
  function stripCategoryPrefix(n, cat) {
    if (n.title === cat) return { ...n, title: '' };
    if (n.title.startsWith(`${cat}: `)) return { ...n, title: n.title.slice(cat.length + 2) };
    return n;
  }

  function noteItemHtml(n) {
    return `
      <div class="note-item">
        ${n.title ? `<p class="note-item-title">${Utils.escapeHtml(n.title)}</p>` : ''}
        <p class="note-item-text">${Utils.escapeHtml(n.text).replace(/\n/g, '<br>')}</p>
      </div>
    `;
  }

  function notesGroupHtml(label, notes) {
    if (notes.length === 0) return '';
    return `
      <details class="notes-group">
        <summary>${Utils.escapeHtml(label)} (${notes.length}件)</summary>
        ${notes.map(noteItemHtml).join('')}
      </details>
    `;
  }

  // メモは件数が多くなりがちなため、詳細画面を開いた直後は畳んでおき、
  // 「魔導書・呪文・アーティファクト」「遭遇した超自然の存在」「通過したシナリオ名」を
  // それぞれ別々のグループ、それ以外を「その他のメモ」グループとして、
  // グループごとにトグル(折りたたみ)で表示する。
  function notesHtml(inv) {
    if (!inv.notes || inv.notes.length === 0) return '';
    let remaining = inv.notes;
    const categoryGroups = KNOWLEDGE_NOTE_CATEGORIES.map((cat) => {
      const matched = remaining.filter((n) => matchesCategory(n, cat));
      remaining = remaining.filter((n) => !matchesCategory(n, cat));
      return notesGroupHtml(cat, matched.map((n) => stripCategoryPrefix(n, cat)));
    }).join('');
    return `
      <h3>メモ</h3>
      ${categoryGroups}
      ${notesGroupHtml('その他のメモ', remaining)}
    `;
  }

  function open(id) {
    const inv = Store.get().investigators.find((x) => x.id === id);
    if (!inv) return;
    const panel = modalEl.querySelector('#detail-panel');
    panel.innerHTML = `
      <div class="modal-header">
        <h2>${Utils.investigatorNameHtml(inv)}</h2>
        <div class="modal-header-actions">
          <button type="button" class="btn-secondary" id="detail-edit-top">編集</button>
          <button type="button" class="btn-icon" id="detail-close">✕</button>
        </div>
      </div>
      <div class="modal-body">
        <div class="detail-top-grid">
          <div class="detail-top-left">
            ${inv.image ? `<img class="detail-image" src="${inv.image}" alt="">` : ''}
            <div class="detail-meta">
              <span>職業: ${Utils.escapeHtml(inv.occupation) || '-'}</span>
              <span>性別: ${Utils.escapeHtml(inv.gender) || '-'}</span>
              <span>年齢: ${Utils.escapeHtml(inv.age) || '-'}</span>
              <span>システム: ${Utils.escapeHtml(inv.system) || '-'}</span>
              <span>状態: ${Utils.escapeHtml(inv.status) || '-'}</span>
            </div>
            <div class="detail-tags">${(inv.tags || []).map((t) => `<span class="tag-chip-sm">${Utils.escapeHtml(t)}</span>`).join('')}</div>
          </div>
          <div class="detail-top-right">
            <h3>能力値</h3>
            <div class="stat-grid">${abilityRow(inv)}</div>
            ${derivedRow(inv)}
          </div>
        </div>

        <h3>技能</h3>
        ${skillFilterToggleHtml(inv)}
        ${skillsHtml(inv)}

        ${notesHtml(inv)}
        ${inv.sourceUrl ? `<p class="detail-source"><a href="${Utils.escapeHtml(inv.sourceUrl)}" target="_blank" rel="noopener noreferrer">元のキャラクターシートを開く ↗</a></p>` : ''}
        <p class="detail-dates">作成: ${Utils.formatDateTime(inv.createdAt)} / 更新: ${Utils.formatDateTime(inv.updatedAt)}</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" id="detail-edit">編集</button>
        <button type="button" class="btn-danger" id="detail-delete">削除</button>
      </div>
    `;
    const skillShowAllCheckbox = panel.querySelector('#skill-show-all');
    if (skillShowAllCheckbox) {
      skillShowAllCheckbox.addEventListener('change', () => {
        applySkillFilter(panel, skillShowAllCheckbox.checked);
      });
    }
    panel.querySelector('#detail-close').addEventListener('click', close);
    const openEditForm = () => {
      close();
      InvestigatorForm.open(inv);
    };
    panel.querySelector('#detail-edit-top').addEventListener('click', openEditForm);
    panel.querySelector('#detail-edit').addEventListener('click', openEditForm);
    panel.querySelector('#detail-delete').addEventListener('click', async () => {
      close();
      await MainActions.deleteInvestigator(inv.id);
    });
    modalEl.hidden = false;
  }

  function close() {
    modalEl.hidden = true;
  }

  global.DetailModal = { mount, open, close };
})(window);
