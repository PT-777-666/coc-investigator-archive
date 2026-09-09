/* utils.js — 汎用ヘルパー関数群。 */
(function (global) {
  'use strict';

  // ランダムなID(UUID)を生成する。
  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // 連続した呼び出しをまとめて、最後の1回だけ実行する(検索入力などに使う)。
  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // HTMLへの埋め込み時にXSSを防ぐため、特殊文字をエスケープする。
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 選択された画像ファイルをdata URL文字列に変換する。
  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // オブジェクトをJSONファイルとしてダウンロードさせる。
  function downloadJson(filename, dataObj) {
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // 日付文字列(ISO)を「YYYY-MM-DD HH:MM」の見やすい表示に変換する。
  function formatDateTime(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // 探索者の丸いアイコン(立ち絵・画像があればそれを、無ければ名前の頭文字を表示する)。
  // 一覧表・ランキングの表彰台など、複数の画面で使い回す。
  function thumbHtml(inv, className) {
    const cls = className || 'row-thumb';
    if (inv.image) {
      return `<img class="${cls}" src="${inv.image}" alt="">`;
    }
    const initial = escapeHtml((inv.name || '?').slice(0, 1));
    return `<div class="${cls} row-thumb-placeholder">${initial}</div>`;
  }

  global.Utils = { uuid, debounce, escapeHtml, readFileAsDataUrl, downloadJson, formatDateTime, thumbHtml };
})(window);
