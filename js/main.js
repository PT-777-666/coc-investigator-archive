/* main.js — アプリの起動処理、保存先フォルダの選択フロー、
 * ファイル更新を伴う共通アクション(MainActions)。
 * 「保存」「削除」はフォームや詳細モーダルなど複数箇所から呼ばれるため、
 * ファイル更新とStore更新をセットにしてここへ集約している。
 */
(function () {
  'use strict';

  const MainActions = {
    async saveInvestigator(investigator) {
      await FileStore.putInvestigator(investigator);
      const current = Store.get().investigators.slice();
      const idx = current.findIndex((x) => x.id === investigator.id);
      if (idx === -1) current.push(investigator); else current[idx] = investigator;
      Store.set({ investigators: current });
    },
    async deleteInvestigator(id) {
      const inv = Store.get().investigators.find((x) => x.id === id);
      if (!inv) return;
      if (!confirm(`「${inv.name || '(名前未設定)'}」を削除します。この操作は取り消せません。よろしいですか？`)) return;
      await FileStore.deleteInvestigator(id);
      Store.set({ investigators: Store.get().investigators.filter((x) => x.id !== id) });
    }
  };
  window.MainActions = MainActions;

  // 保存先フォルダの状態(未対応/未選択/権限待ち/準備完了)に応じて、
  // 通常のアプリ画面(#app-body)とフォルダ選択画面(#folder-setup)を切り替える。
  function showFolderSetup(mode, folderNameText) {
    const setupEl = document.getElementById('folder-setup');
    const appBody = document.getElementById('app-body');

    if (mode === 'ready') {
      setupEl.hidden = true;
      appBody.hidden = false;
      return;
    }
    appBody.hidden = true;
    setupEl.hidden = false;

    if (mode === 'unsupported') {
      setupEl.innerHTML = `
        <div class="folder-setup-card">
          <h2>対応していないブラウザです</h2>
          <p>このアプリは探索者データをローカルフォルダへ直接保存する方式のため、<br>
          Microsoft Edge または Google Chrome でお使いください。</p>
        </div>`;
      return;
    }

    if (mode === 'none') {
      setupEl.innerHTML = `
        <div class="folder-setup-card">
          <h2>保存先フォルダを選んでください</h2>
          <p>探索者ごとに1つのJSONファイルとして、選んだフォルダに直接保存します。<br>
          ブラウザのデータを消しても影響を受けません。フォルダを丸ごとコピーするだけでバックアップになります。</p>
          <button type="button" class="btn-primary" id="choose-folder-btn">📁 フォルダを選択</button>
        </div>`;
      setupEl.querySelector('#choose-folder-btn').addEventListener('click', async () => {
        try {
          await FileStore.chooseFolder();
          await loadInitialData();
        } catch (e) {
          // ユーザーがフォルダ選択をキャンセルした場合は何もしない
        }
      });
      return;
    }

    if (mode === 'needs-permission') {
      setupEl.innerHTML = `
        <div class="folder-setup-card">
          <h2>フォルダへのアクセスを許可してください</h2>
          <p>前回選んだフォルダ「${Utils.escapeHtml(folderNameText)}」への書き込みを許可すると、続きから使えます。</p>
          <button type="button" class="btn-primary" id="grant-permission-btn">🔓 許可する</button>
          <button type="button" class="btn-secondary" id="choose-other-folder-btn">別のフォルダを選ぶ</button>
        </div>`;
      setupEl.querySelector('#grant-permission-btn').addEventListener('click', async () => {
        const ok = await FileStore.requestPermissionForSavedFolder();
        if (ok) await loadInitialData();
        else alert('許可されませんでした。');
      });
      setupEl.querySelector('#choose-other-folder-btn').addEventListener('click', async () => {
        try {
          await FileStore.chooseFolder();
          await loadInitialData();
        } catch (e) { /* キャンセル時は何もしない */ }
      });
    }
  }

  function updateFolderIndicator() {
    const el = document.getElementById('folder-indicator');
    el.textContent = `📁 ${FileStore.folderName()}`;
  }

  // フォルダの状態を確認し、使える状態ならファイルから探索者一覧を読み込む。
  async function loadInitialData() {
    if (!FileStore.isSupported()) {
      showFolderSetup('unsupported');
      return;
    }
    const status = await FileStore.checkSavedFolder();
    if (status === 'none') {
      showFolderSetup('none');
      return;
    }
    if (status === 'needs-permission') {
      showFolderSetup('needs-permission', FileStore.folderName());
      return;
    }
    const investigators = await FileStore.getAllInvestigators();
    Store.set({ investigators, loading: false });
    showFolderSetup('ready');
    updateFolderIndicator();
  }

  function wireHeaderActions() {
    document.getElementById('btn-add').addEventListener('click', () => {
      InvestigatorForm.open(null);
    });
    document.getElementById('btn-ranking').addEventListener('click', () => {
      RankingModal.open();
    });
    document.getElementById('btn-export').addEventListener('click', () => {
      ImportExport.exportJson();
    });
    document.getElementById('btn-change-folder').addEventListener('click', async () => {
      try {
        await FileStore.chooseFolder();
        await loadInitialData();
      } catch (e) { /* キャンセル時は何もしない */ }
    });
    const importInput = document.getElementById('import-file-input');
    document.getElementById('btn-import').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) await ImportExport.importFromFile(file);
      importInput.value = '';
    });

    const themeBtn = document.getElementById('btn-theme-toggle');
    const updateThemeBtn = () => {
      themeBtn.textContent = ThemeManager.getTheme() === 'light' ? '☀️' : '🌙';
    };
    updateThemeBtn();
    themeBtn.addEventListener('click', () => {
      ThemeManager.toggleTheme();
      updateThemeBtn();
    });
  }

  function wireEmptyState() {
    document.getElementById('empty-add-btn').addEventListener('click', () => InvestigatorForm.open(null));
    document.getElementById('empty-sample-btn').addEventListener('click', async () => {
      await FileStore.putInvestigators(SAMPLE_INVESTIGATORS);
      await loadInitialData();
    });
  }

  function updateEmptyState() {
    const el = document.getElementById('empty-state');
    const state = Store.get();
    el.hidden = !(!state.loading && state.investigators.length === 0);
  }

  function updateStatsBar() {
    const el = document.getElementById('stats-bar');
    const state = Store.get();
    if (state.loading) { el.textContent = ''; return; }
    const total = state.investigators.length;
    const visible = Store.visibleInvestigators().length;
    el.textContent = visible === total ? `${total}人を登録中` : `${visible} / ${total}人を表示中`;
  }

  async function init() {
    DetailModal.mount();
    RankingModal.mount();
    InvestigatorForm.mount();
    ListView.mount(document.getElementById('list-view'));
    SearchFilter.mount(document.getElementById('search-filter'));
    wireHeaderActions();
    wireEmptyState();

    Store.subscribe(() => {
      updateEmptyState();
      updateStatsBar();
    });

    await loadInitialData();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
