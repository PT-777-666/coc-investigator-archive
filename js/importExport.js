/* importExport.js — JSONバックアップ/復元。
 * 画像は探索者レコードにbase64で同梱されているため、このJSON1ファイルだけで
 * 画像込みの完全バックアップになる。
 */
(function (global) {
  'use strict';

  const SCHEMA_VERSION = 1;

  function exportJson() {
    const payload = {
      app: 'coc-investigator-archive',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      investigators: Store.get().investigators
    };
    const stamp = new Date().toISOString().slice(0, 10);
    Utils.downloadJson(`coc-investigator-archive_${stamp}.json`, payload);
  }

  function normalizeImported(raw) {
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.investigators) ? raw.investigators : null;
    if (!list) throw new Error('認識できる探索者データが見つかりませんでした。');
    return list.map((inv) => Model.normalizeInvestigator(inv));
  }

  async function importFromFile(file) {
    const text = await file.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      alert('JSONファイルとして読み込めませんでした。ファイルを確認してください。');
      return;
    }

    let imported;
    try {
      imported = normalizeImported(json);
    } catch (err) {
      alert(err.message);
      return;
    }

    // confirm()はOKでtrue・キャンセルでfalseを返すため、「キャンセル=全置換」という
    // 説明文に合わせて否定形の変数名にしている(以前はここが反転しており、全置換の
    // つもりでキャンセルを押すと黙ってマージされてしまうバグがあった)。
    const wantsReplace = !confirm(
      `${imported.length}件の探索者を読み込みます。\n\n` +
      'OK: 既存データを残したまま追加/更新(同じIDは上書き)\n' +
      'キャンセル: 現在の登録データを全て置き換える\n\n' +
      '続行しますか？'
    );

    if (wantsReplace) {
      const confirmed = confirm('本当に現在の登録データを全て削除して置き換えますか？この操作は取り消せません。');
      if (!confirmed) return; // 全置換をやめた場合は、マージにフォールスルーせずインポート自体を中止する
      await FileStore.clearInvestigators();
      await FileStore.putInvestigators(imported);
      Store.set({ investigators: imported, selectedTags: [] });
      alert(`${imported.length}件の探索者で置き換えました。`);
      return;
    }

    // マージ(追加/更新)
    await FileStore.putInvestigators(imported);
    const current = Store.get().investigators.slice();
    imported.forEach((inv) => {
      const idx = current.findIndex((x) => x.id === inv.id);
      if (idx === -1) current.push(inv); else current[idx] = inv;
    });
    Store.set({ investigators: current });
    alert(`${imported.length}件の探索者を追加/更新しました。`);
  }

  global.ImportExport = { exportJson, importFromFile };
})(window);
