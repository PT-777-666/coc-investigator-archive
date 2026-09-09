/* fileStore.js — File System Access APIを使い、探索者データを実際のJSONファイルとして
 * ユーザーが選んだローカルフォルダに直接保存する。
 *
 * ブラウザ側(小さなIndexedDB)に保存するのは「どのフォルダを選んだか」という
 * ハンドルだけで、探索者データそのものは一切ブラウザストレージに依存しない。
 * ブラウザのサイトデータを消してもファイルは無事に残る(フォルダへのアクセス許可を
 * 選び直す必要はあるが、データそのものは消えない)。
 *
 * Chromium系ブラウザ(Edge/Chrome)専用のAPI。Firefox等では動作しない。
 */
(function (global) {
  'use strict';

  const HANDLE_DB_NAME = 'coc-investigator-archive-handle';
  const HANDLE_STORE = 'handles';
  const HANDLE_KEY = 'root';

  let dirHandle = null;
  const filenameCache = new Map(); // id -> 現在ディスク上にあるファイル名

  function isSupported() {
    return typeof window.showDirectoryPicker === 'function';
  }

  async function openHandleDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(HANDLE_DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(HANDLE_STORE, { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveHandleToDb(handle) {
    const db = await openHandleDb();
    return new Promise((resolve, reject) => {
      const store = db.transaction(HANDLE_STORE, 'readwrite').objectStore(HANDLE_STORE);
      const req = store.put({ key: HANDLE_KEY, handle });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function loadHandleFromDb() {
    const db = await openHandleDb();
    return new Promise((resolve, reject) => {
      const store = db.transaction(HANDLE_STORE, 'readonly').objectStore(HANDLE_STORE);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result ? req.result.handle : null);
      req.onerror = () => reject(req.error);
    });
  }

  // 保存済みのフォルダハンドルを読み込み、書き込み権限があるか確認する(ユーザー操作なしで呼べる)。
  // 'none'(未選択) | 'granted'(すぐ使える) | 'needs-permission'(ユーザー操作での許可が必要)
  async function checkSavedFolder() {
    const handle = await loadHandleFromDb();
    if (!handle) return 'none';
    dirHandle = handle;
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    return perm === 'granted' ? 'granted' : 'needs-permission';
  }

  // ボタンのクリックハンドラ内など、ユーザー操作の最中に呼ぶ必要がある。
  async function requestPermissionForSavedFolder() {
    if (!dirHandle) return false;
    const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
    return perm === 'granted';
  }

  // ボタンのクリックハンドラ内など、ユーザー操作の最中に呼ぶ必要がある。新しいフォルダを選ぶ。
  async function chooseFolder() {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    dirHandle = handle;
    await saveHandleToDb(handle);
    return handle;
  }

  function folderName() {
    return dirHandle ? dirHandle.name : '';
  }

  // ファイル名に使えない文字を取り除く(人間がフォルダを見たときに分かりやすい名前にするため)。
  function sanitizeForFilename(str) {
    const cleaned = String(str || '').replace(/[\\/:*?"<>|]/g, '').trim();
    return cleaned.slice(0, 40) || '無題';
  }

  // 「名前_id先頭8桁.json」というファイル名にする。同名でも衝突しないようにしつつ、
  // Explorerで見たときに誰のデータか分かるようにする。
  function filenameFor(investigator) {
    const shortId = String(investigator.id || '').replace(/-/g, '').slice(0, 8);
    return `${sanitizeForFilename(investigator.name)}_${shortId}.json`;
  }

  async function getAllInvestigators() {
    if (!dirHandle) return [];
    const list = [];
    filenameCache.clear();
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind !== 'file' || !name.endsWith('.json')) continue;
      try {
        const file = await handle.getFile();
        const data = JSON.parse(await file.text());
        if (!data || !data.id) continue;
        filenameCache.set(data.id, name);
        list.push(data);
      } catch (e) {
        // 壊れている/関係ないJSONファイルは読み飛ばす
      }
    }
    return list;
  }

  // 名前が変わってファイル名が変わる場合は、古いファイルを消してから新しい名前で書き込む。
  async function putInvestigator(investigator) {
    const newName = filenameFor(investigator);
    const oldName = filenameCache.get(investigator.id);
    if (oldName && oldName !== newName) {
      try { await dirHandle.removeEntry(oldName); } catch (e) { /* 既に無ければ無視 */ }
    }
    const fileHandle = await dirHandle.getFileHandle(newName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(investigator, null, 2));
    await writable.close();
    filenameCache.set(investigator.id, newName);
    return investigator;
  }

  async function putInvestigators(list) {
    for (const inv of list) await putInvestigator(inv);
  }

  async function deleteInvestigator(id) {
    const name = filenameCache.get(id);
    if (!name) return;
    try { await dirHandle.removeEntry(name); } catch (e) { /* 既に無ければ無視 */ }
    filenameCache.delete(id);
  }

  async function clearInvestigators() {
    for (const [id, name] of Array.from(filenameCache.entries())) {
      try { await dirHandle.removeEntry(name); } catch (e) { /* 既に無ければ無視 */ }
      filenameCache.delete(id);
    }
  }

  global.FileStore = {
    isSupported,
    checkSavedFolder,
    requestPermissionForSavedFolder,
    chooseFolder,
    folderName,
    getAllInvestigators,
    putInvestigator,
    putInvestigators,
    deleteInvestigator,
    clearInvestigators
  };
})(window);
