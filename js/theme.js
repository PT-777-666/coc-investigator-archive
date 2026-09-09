/* theme.js — ライト/ダークテーマの切り替えと記憶。
 * <head>内で最初に読み込み、描画前にテーマを適用することで、
 * 一瞬だけ違うテーマが見えてしまう(ちらつき)のを防いでいる。
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'coc-investigator-archive-theme';

  function systemPrefersLight() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  }

  // 保存済みの選択があればそれを使い、無ければ初回だけOS設定を参考にする。
  function getTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return systemPrefersLight() ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f2f5fa' : '#0a0e1a');
  }

  function setTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }

  function toggleTheme() {
    const next = getTheme() === 'light' ? 'dark' : 'light';
    setTheme(next);
    return next;
  }

  applyTheme(getTheme());

  global.ThemeManager = { getTheme, setTheme, toggleTheme };
})(window);
