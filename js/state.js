/* state.js — アプリの中心状態と、検索・絞り込み・並べ替えのロジック。
 * フレームワークを使わないため、状態変更 → 購読者への通知という
 * 最小限のパターン(pub/sub)だけを自前で実装している。
 */
(function (global) {
  'use strict';

  // 並べ替えの選択肢。keyはInvestigatorのプロパティパス、abilityは能力値専用の目印。
  const SORT_OPTIONS = [
    { key: 'updatedAt', label: '更新日' },
    { key: 'createdAt', label: '作成日' },
    { key: 'name', label: '名前' },
    { key: 'occupation', label: '職業' },
    { key: 'system', label: 'システム' },
    { key: 'abilityTotal', label: '能力値合計' },
    ...Model.ABILITY_KEYS.map((k) => ({ key: `ability:${k}`, label: k }))
  ];

  function createStore() {
    const listeners = new Set();
    const state = {
      investigators: [],   // Investigator[]
      searchQuery: '',      // 自由テキスト検索
      selectedTags: [],      // 選択中タグ(AND絞り込み)
      systemFilter: '',       // システムでの絞り込み(空なら全て)
      statusFilter: '',        // 状態での絞り込み(空なら全て)
      sortKey: 'updatedAt',
      sortDir: 'desc',          // 'asc' | 'desc'
      loading: true
    };

    function get() {
      return state;
    }

    function set(patch) {
      Object.assign(state, patch);
      listeners.forEach((fn) => fn(state));
    }

    function subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    function allTags() {
      const set = new Set();
      state.investigators.forEach((inv) => (inv.tags || []).forEach((t) => set.add(t)));
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'));
    }

    function allSystems() {
      const set = new Set();
      state.investigators.forEach((inv) => { if (inv.system) set.add(inv.system); });
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'));
    }

    function toggleTag(tag) {
      const idx = state.selectedTags.indexOf(tag);
      const next = idx === -1
        ? [...state.selectedTags, tag]
        : state.selectedTags.filter((t) => t !== tag);
      set({ selectedTags: next });
    }

    // 探索者1件が、現在の検索語にマッチするか判定する。
    // 名前・職業・性別・システム・タグ・技能名・メモを対象にする。
    function matchesQuery(inv, query) {
      if (!query) return true;
      const q = query.toLowerCase();
      const haystacks = [
        inv.name, inv.occupation, inv.gender, inv.system,
        ...(inv.tags || []), ...(inv.skills || []).map((s) => s.name),
        ...(inv.notes || []).flatMap((n) => [n.title, n.text])
      ];
      return haystacks.some((v) => v && String(v).toLowerCase().includes(q));
    }

    function sortValue(inv, key) {
      if (key === 'abilityTotal') return Model.abilityTotal(inv);
      if (key.startsWith('ability:')) return inv.abilities[key.slice('ability:'.length)] ?? -Infinity;
      if (key === 'createdAt' || key === 'updatedAt') return inv[key] || '';
      return (inv[key] || '').toString();
    }

    // 検索語・タグ・システム・状態での絞り込みと、選択中の並べ替えをまとめて適用する。
    function visibleInvestigators() {
      const { investigators, searchQuery, selectedTags, systemFilter, statusFilter, sortKey, sortDir } = state;
      let list = investigators.filter((inv) => matchesQuery(inv, searchQuery));
      if (selectedTags.length > 0) {
        list = list.filter((inv) => selectedTags.every((t) => (inv.tags || []).includes(t)));
      }
      if (systemFilter) list = list.filter((inv) => inv.system === systemFilter);
      if (statusFilter) list = list.filter((inv) => inv.status === statusFilter);

      const isNumeric = sortKey === 'abilityTotal' || sortKey.startsWith('ability:');
      list = list.slice().sort((a, b) => {
        const va = sortValue(a, sortKey);
        const vb = sortValue(b, sortKey);
        const cmp = isNumeric ? (va - vb) : String(va).localeCompare(String(vb), 'ja');
        return sortDir === 'asc' ? cmp : -cmp;
      });
      return list;
    }

    return {
      get, set, subscribe,
      allTags, allSystems, toggleTag,
      visibleInvestigators
    };
  }

  global.Store = createStore();
  global.SORT_OPTIONS = SORT_OPTIONS;
})(window);
