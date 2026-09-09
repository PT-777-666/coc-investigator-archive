/* investigatorForm.js — 探索者の新規登録・編集フォーム(モーダル)。
 * 技能は行を自由に追加・削除できるようにしている。
 */
(function (global) {
  'use strict';

  let modalEl = null;
  let editingId = null; // nullなら新規登録
  let skillRows = [];   // [{name, value}] フォーム編集中の作業用コピー
  let noteRows = [];    // [{title, text}] フォーム編集中の作業用コピー(いあきゃらのメモ欄のように複数持てる)

  function mount() {
    modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay';
    modalEl.hidden = true;
    modalEl.innerHTML = '<div class="modal-panel modal-panel-wide" id="form-panel"></div>';
    document.body.appendChild(modalEl);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) close();
    });
  }

  function abilityInputsHtml(abilities) {
    return Model.ABILITY_KEYS.map((k) => `
      <label class="stat-input"><span>${k}</span>
        <input type="number" data-ability="${k}" value="${abilities[k] ?? ''}">
      </label>
    `).join('');
  }

  function derivedInputsHtml(derived) {
    return Model.DERIVED_KEYS.map((k) => `
      <label class="stat-input"><span>${k}</span>
        <input type="text" data-derived="${k}" value="${derived[k] ?? ''}">
      </label>
    `).join('');
  }

  function skillRowsHtml() {
    return skillRows.map((s, i) => `
      <div class="skill-row" data-index="${i}">
        <input type="text" class="skill-name" placeholder="技能名" value="${Utils.escapeHtml(s.name)}">
        <input type="number" class="skill-value" placeholder="値" value="${s.value ?? ''}">
        <button type="button" class="btn-icon btn-icon-danger" data-remove-skill="${i}">✕</button>
      </div>
    `).join('');
  }

  function renderSkillRows() {
    const container = modalEl.querySelector('#skill-rows');
    container.innerHTML = skillRowsHtml();
    container.querySelectorAll('[data-remove-skill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        skillRows.splice(Number(btn.dataset.removeSkill), 1);
        renderSkillRows();
      });
    });
  }

  function noteRowsHtml() {
    return noteRows.map((n, i) => `
      <div class="note-row" data-index="${i}">
        <div class="note-row-header">
          <input type="text" class="note-title" placeholder="タイトル(例: 通過したシナリオ、呪文など。省略可)" value="${Utils.escapeHtml(n.title)}">
          <button type="button" class="btn-icon btn-icon-danger" data-remove-note="${i}">✕</button>
        </div>
        <textarea class="note-text" rows="3" placeholder="内容">${Utils.escapeHtml(n.text)}</textarea>
      </div>
    `).join('');
  }

  function renderNoteRows() {
    const container = modalEl.querySelector('#note-rows');
    container.innerHTML = noteRowsHtml();
    container.querySelectorAll('[data-remove-note]').forEach((btn) => {
      btn.addEventListener('click', () => {
        noteRows.splice(Number(btn.dataset.removeNote), 1);
        renderNoteRows();
      });
    });
  }

  function open(investigator) {
    editingId = investigator ? investigator.id : null;
    const inv = investigator || Model.createEmptyInvestigator();
    skillRows = (inv.skills || []).map((s) => ({ ...s }));
    noteRows = (inv.notes || []).map((n) => ({ ...n }));

    const panel = modalEl.querySelector('#form-panel');
    panel.innerHTML = `
      <div class="modal-header">
        <h2>${editingId ? '探索者を編集' : '探索者を新規登録'}</h2>
        <button type="button" class="btn-icon" id="form-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="import-columns">
        <details class="iachara-import">
          <summary>いあきゃらから読み込む(テキスト出力推奨)</summary>
          <div class="iachara-import-body">
            <p class="hint-small">
              <strong>おすすめ:</strong> いあきゃらのシートページで「出力」→「<strong>ファイルに出力</strong>」タブでテキストファイルを保存してください。
              保存した<strong>ファイルをそのまま下の欄にドラッグ&ドロップ</strong>するか、中身をコピーして貼り付けてください。
              基本情報・能力値・技能に加え、呪文・遭遇した超自然の存在・通過したシナリオ・メモまで、これ1つで全部反映されます。
            </p>
            <div id="iachara-text-dropzone" class="dropzone">
              <textarea id="iachara-text-paste" rows="4" placeholder="ここに「ファイルに出力」のテキストを貼り付け、またはファイルをドラッグ&ドロップ"></textarea>
            </div>
            <button type="button" class="btn-secondary" id="iachara-text-apply-btn">反映する</button>
            <div id="iachara-text-preview" class="iachara-preview"></div>

            <details class="iachara-fallback">
              <summary>更新を素早く済ませたい場合: ブックマークレットを使う(呪文・シナリオ・メモは含まれません)</summary>
              <p class="hint-small">
                下のボタンをブラウザの<strong>ブックマークバーへドラッグ&ドロップ</strong>して登録してください(クリックしても動作しません)。
                いあきゃらのシートページを開いた状態でそのブックマークをクリックすると、基本情報に加えて
                「出力→ココフォリア駒出力」も自動で試み、能力値・技能まで一度にコピーされます。
              </p>
              <a href="${IacharaSync.bookmarkletHref()}" class="bookmarklet-link" onclick="return false;">🎲 探索者取込</a>
              <textarea id="iachara-paste" rows="3" placeholder="ここにJSONを貼り付け"></textarea>
              <button type="button" class="btn-secondary" id="iachara-apply-btn">反映する</button>
              <div id="iachara-preview" class="iachara-preview"></div>

              <details class="iachara-fallback" id="iachara-fallback">
                <summary>能力値・技能が自動で入らなかった場合(手動)</summary>
                <p class="hint-small">
                  いあきゃらで「出力」をクリックし、技能の設定を「<strong>すべての技能を出力</strong>」に切り替えてから
                  「ココフォリア駒出力」(または「チャパレ出力」)をクリックしてコピーし、下に貼り付けてください。
                  (「変更された技能を出力」のままだと、変更した技能しか含まれません)
                </p>
                <textarea id="ccfolia-paste" rows="3" placeholder="ココフォリア駒出力 または チャットパレット出力の内容を貼り付け"></textarea>
                <button type="button" class="btn-secondary" id="ccfolia-apply-btn">反映する</button>
                <div id="ccfolia-preview" class="iachara-preview"></div>
              </details>
            </details>
          </div>
        </details>
        <details class="iachara-import">
          <summary>キャラクター保管所から読み込む</summary>
          <div class="iachara-import-body">
            <p class="hint-small">
              キャラクター保管所のキャラクターページURLの末尾に<strong>「.js」</strong>を付けて開き
              (例: <code>https://charasheet.vampire-blood.net/123456.js</code>)、表示された内容をコピーして下に貼り付けてください。
              (規約で案内されている公式のバックアップ機能です。ブックマークレットは不要です)
            </p>
            <textarea id="hokanko-paste" rows="3" placeholder="ここに.jsの内容(JSON)を貼り付け"></textarea>
            <button type="button" class="btn-secondary" id="hokanko-apply-btn">反映する</button>
            <div id="hokanko-preview" class="iachara-preview"></div>
          </div>
        </details>
        </div>
        <form id="inv-form">
          <div class="form-grid">
            <label>名前<input type="text" name="name" value="${Utils.escapeHtml(inv.name)}" required></label>
            <label>職業<input type="text" name="occupation" value="${Utils.escapeHtml(inv.occupation)}"></label>
            <label>性別<input type="text" name="gender" value="${Utils.escapeHtml(inv.gender)}"></label>
            <label>年齢<input type="text" name="age" value="${Utils.escapeHtml(inv.age)}"></label>
            <label>システム
              <input type="text" name="system" list="system-suggestions" value="${Utils.escapeHtml(inv.system)}">
              <datalist id="system-suggestions">
                ${Model.SYSTEM_SUGGESTIONS.map((s) => `<option value="${s}">`).join('')}
              </datalist>
            </label>
            <label>状態
              <select name="status">
                ${Model.STATUS_OPTIONS.map((s) => `<option value="${s}"${s === inv.status ? ' selected' : ''}>${s}</option>`).join('')}
              </select>
            </label>
            <label class="form-span-2">タグ(カンマ区切り)<input type="text" name="tags" value="${Utils.escapeHtml((inv.tags || []).join(', '))}"></label>
            <label class="form-span-2">立ち絵・画像
              <input type="file" id="image-input" accept="image/*">
            </label>
          </div>
          <div id="image-preview-wrap">${inv.image ? `<img id="image-preview" class="detail-image" src="${inv.image}" alt="">` : ''}</div>

          <h3>能力値</h3>
          <div class="stat-input-grid">${abilityInputsHtml(inv.abilities)}</div>
          <h3>副次数値</h3>
          <div class="stat-input-grid">${derivedInputsHtml(inv.derived)}</div>

          <h3>技能</h3>
          <div id="skill-rows"></div>
          <button type="button" class="btn-secondary" id="add-skill-row">+ 技能を追加</button>

          <h3>メモ</h3>
          <div id="note-rows"></div>
          <button type="button" class="btn-secondary" id="add-note-row">+ メモを追加</button>

          <label>元シートURL(任意)<input type="url" name="sourceUrl" value="${Utils.escapeHtml(inv.sourceUrl)}" placeholder="https://..."></label>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" id="form-cancel">キャンセル</button>
        <button type="submit" form="inv-form" class="btn-primary">保存</button>
      </div>
    `;

    renderSkillRows();
    renderNoteRows();

    panel.querySelector('#form-close').addEventListener('click', close);
    panel.querySelector('#form-cancel').addEventListener('click', close);
    panel.querySelector('#add-skill-row').addEventListener('click', () => {
      skillRows.push({ name: '', value: null });
      renderSkillRows();
    });
    panel.querySelector('#add-note-row').addEventListener('click', () => {
      noteRows.push({ title: '', text: '' });
      renderNoteRows();
    });

    const imageInput = panel.querySelector('#image-input');
    let pendingImage = inv.image || '';
    // イメージカラーはいあきゃらからの自動取り込み専用(手動入力欄は無い)。
    let pendingColor = inv.color || '';
    imageInput.addEventListener('change', async () => {
      const file = imageInput.files[0];
      if (!file) return;
      pendingImage = await Utils.readFileAsDataUrl(file);
      panel.querySelector('#image-preview-wrap').innerHTML = `<img id="image-preview" class="detail-image" src="${pendingImage}" alt="">`;
    });

    const setFieldValue = (name, value) => {
      if (value == null || value === '') return;
      const el = panel.querySelector(`[name="${name}"]`);
      if (el) el.value = value;
    };
    const applyImage = (imageUrl) => {
      if (!imageUrl) return;
      pendingImage = imageUrl;
      panel.querySelector('#image-preview-wrap').innerHTML = `<img id="image-preview" class="detail-image" src="${pendingImage}" alt="">`;
    };
    const applyColor = (color) => {
      if (!color) return '';
      pendingColor = color;
      return ` イメージカラー(<span class="color-dot" style="background:${Utils.escapeHtml(color)}"></span>${Utils.escapeHtml(color)})も反映しました。`;
    };
    // システムは推測でしかないので、まだ未入力の場合だけ参考値として埋める(誤って上書きしない)。
    const applySystemGuess = (guess) => {
      if (!guess) return;
      const el = panel.querySelector('[name="system"]');
      if (el && !el.value) el.value = guess;
    };
    // 同じ名前の技能が既にあれば数値を上書き更新し、無ければ新しい行として追加する
    // (再取り込みで技能値の変化を反映できるようにするため)。
    const mergeSkills = (newSkills) => {
      if (!newSkills || !newSkills.length) return;
      newSkills.forEach((s) => {
        const existing = skillRows.find((row) => row.name === s.name);
        if (existing) {
          existing.value = s.value;
          if (s.initial != null) existing.initial = s.initial;
        } else {
          skillRows.push(s);
        }
      });
      renderSkillRows();
    };
    // 技能と同じように、同じタイトルのメモが既にあれば内容を上書きし、無ければ新規追加する
    // (同じキャラを何度も読み込んでも、既存のメモが増殖しないようにするため)。
    // タイトル無しのメモ(いあきゃらの自由記述欄など)は同一性を判断できないため、常に追加する。
    const mergeNotes = (newNotes) => {
      if (!newNotes || !newNotes.length) return;
      newNotes.forEach((n) => {
        const existing = n.title ? noteRows.find((row) => row.title === n.title) : null;
        if (existing) {
          existing.text = n.text;
        } else {
          noteRows.push({ ...n });
        }
      });
      renderNoteRows();
    };

    const applyIacharaText = (text) => {
      const previewEl = panel.querySelector('#iachara-text-preview');
      let parsed;
      try {
        parsed = IacharaSync.parseIacharaTextExport(text);
      } catch (err) {
        previewEl.innerHTML = `<p class="iachara-error">${Utils.escapeHtml(err.message)}</p>`;
        return;
      }

      setFieldValue('name', parsed.name);
      setFieldValue('occupation', parsed.occupation);
      setFieldValue('gender', parsed.gender);
      setFieldValue('age', parsed.age);
      applyImage(parsed.image);
      const colorNote = applyColor(parsed.color);
      applySystemGuess(parsed.systemGuess);

      Object.entries(parsed.abilities || {}).forEach(([k, v]) => {
        const el = panel.querySelector(`[data-ability="${k}"]`);
        if (el) el.value = v;
      });
      Object.entries(parsed.derived || {}).forEach(([k, v]) => {
        const el = panel.querySelector(`[data-derived="${k}"]`);
        if (el) el.value = v;
      });

      mergeSkills(parsed.skills);

      mergeNotes(parsed.notes);

      const systemNote = parsed.systemGuess ? `(システムを「${parsed.systemGuess}」と読み取りました)` : '';
      previewEl.innerHTML = `<p class="iachara-success">基本情報・能力値を反映し、技能${parsed.skills.length}件・メモ${parsed.notes.length}件を追加しました。値が正しいか確認してください。${Utils.escapeHtml(systemNote)}${colorNote}</p>`;
    };

    panel.querySelector('#iachara-text-apply-btn').addEventListener('click', () => {
      applyIacharaText(panel.querySelector('#iachara-text-paste').value);
    });

    // 「ファイルに出力」で保存したテキストファイルを、そのままドラッグ&ドロップできるようにする。
    const textDropzone = panel.querySelector('#iachara-text-dropzone');
    const textPasteEl = panel.querySelector('#iachara-text-paste');
    ['dragenter', 'dragover'].forEach((evt) => {
      textDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        textDropzone.classList.add('dropzone-active');
      });
    });
    ['dragleave', 'dragend'].forEach((evt) => {
      textDropzone.addEventListener(evt, () => textDropzone.classList.remove('dropzone-active'));
    });
    textDropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      textDropzone.classList.remove('dropzone-active');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      const text = await file.text();
      textPasteEl.value = text;
      applyIacharaText(text);
    });

    panel.querySelector('#ccfolia-apply-btn').addEventListener('click', () => {
      const pasteEl = panel.querySelector('#ccfolia-paste');
      const previewEl = panel.querySelector('#ccfolia-preview');
      let parsed;
      try {
        parsed = IacharaSync.parseCCFoliaExport(pasteEl.value);
      } catch (err) {
        previewEl.innerHTML = `<p class="iachara-error">${Utils.escapeHtml(err.message)}</p>`;
        return;
      }

      setFieldValue('name', parsed.name);
      setFieldValue('sourceUrl', parsed.sourceUrl);
      applyImage(parsed.image);
      applySystemGuess(parsed.systemGuess);

      Object.entries(parsed.abilities || {}).forEach(([k, v]) => {
        const el = panel.querySelector(`[data-ability="${k}"]`);
        if (el) el.value = v;
      });
      Object.entries(parsed.derived || {}).forEach(([k, v]) => {
        const el = panel.querySelector(`[data-derived="${k}"]`);
        if (el) el.value = v;
      });

      mergeSkills(parsed.skills);

      const systemNote = parsed.systemGuess ? `(システムを「${parsed.systemGuess}」と推測して入力しました。違う場合は直してください)` : '';
      previewEl.innerHTML = `<p class="iachara-success">能力値を反映し、技能を${parsed.skills.length}件追加しました。値が正しいか確認してください。${Utils.escapeHtml(systemNote)}</p>`;
    });

    panel.querySelector('#hokanko-apply-btn').addEventListener('click', () => {
      const pasteEl = panel.querySelector('#hokanko-paste');
      const previewEl = panel.querySelector('#hokanko-preview');
      let parsed;
      try {
        parsed = CharaHokankoSync.parseCharaHokankoExport(pasteEl.value);
      } catch (err) {
        previewEl.innerHTML = `<p class="iachara-error">${Utils.escapeHtml(err.message)}</p>`;
        return;
      }

      setFieldValue('name', parsed.name);
      setFieldValue('occupation', parsed.occupation);
      setFieldValue('gender', parsed.gender);
      setFieldValue('age', parsed.age);
      setFieldValue('sourceUrl', parsed.sourceUrl);
      applySystemGuess(parsed.systemGuess);

      Object.entries(parsed.abilities || {}).forEach(([k, v]) => {
        const el = panel.querySelector(`[data-ability="${k}"]`);
        if (el) el.value = v;
      });
      Object.entries(parsed.derived || {}).forEach(([k, v]) => {
        const el = panel.querySelector(`[data-derived="${k}"]`);
        if (el) el.value = v;
      });

      mergeSkills(parsed.skills);

      mergeNotes([
        parsed.extraInfo ? { title: 'キャラクター保管所 基本情報', text: parsed.extraInfo } : null,
        parsed.backstory ? { title: '設定', text: parsed.backstory } : null
      ].filter(Boolean));

      const systemNote = parsed.systemGuess ? `(システムを「${parsed.systemGuess}」と推測して入力しました。違う場合は直してください)` : '';
      previewEl.innerHTML = `<p class="iachara-success">基本情報・能力値を反映し、技能を${parsed.skills.length}件追加しました。値が正しいか確認してください。${Utils.escapeHtml(systemNote)}</p>`;
    });

    panel.querySelector('#iachara-apply-btn').addEventListener('click', () => {
      const pasteEl = panel.querySelector('#iachara-paste');
      const previewEl = panel.querySelector('#iachara-preview');
      let parsed;
      try {
        parsed = IacharaSync.parseIacharaExport(pasteEl.value);
      } catch (err) {
        previewEl.innerHTML = `<p class="iachara-error">${Utils.escapeHtml(err.message)}</p>`;
        return;
      }

      setFieldValue('name', parsed.name);
      setFieldValue('occupation', parsed.occupation);
      setFieldValue('gender', parsed.gender);
      setFieldValue('age', parsed.age);
      setFieldValue('sourceUrl', parsed.sourceUrl);
      applyImage(parsed.image);
      const colorNote = applyColor(parsed.color);

      if (parsed.extraInfo) {
        mergeNotes([{ title: 'いあきゃら基本情報', text: parsed.extraInfo }]);
      }

      if (parsed.ccfoliaAutoCaptured) {
        applySystemGuess(parsed.systemGuess);
        Object.entries(parsed.abilities || {}).forEach(([k, v]) => {
          const el = panel.querySelector(`[data-ability="${k}"]`);
          if (el) el.value = v;
        });
        Object.entries(parsed.derived || {}).forEach(([k, v]) => {
          const el = panel.querySelector(`[data-derived="${k}"]`);
          if (el) el.value = v;
        });
        mergeSkills(parsed.skills);
        const systemNote = parsed.systemGuess ? `(システムを「${parsed.systemGuess}」と推測して入力しました。違う場合は直してください)` : '';
        previewEl.innerHTML = `<p class="iachara-success">職業・性別などに加え、能力値・技能${parsed.skills.length}件も自動で反映しました。${Utils.escapeHtml(systemNote)}${colorNote}</p>`;
      } else {
        previewEl.innerHTML = `<p class="iachara-success">職業・性別・年齢などを反映しました。能力値・技能の自動取得はできなかったので、下の「手動」欄をお試しください。${colorNote}</p>`;
        panel.querySelector('#iachara-fallback').open = true;
      }
    });

    panel.querySelector('#inv-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      // フォーム内の最新の技能名/値をskillRowsへ、メモの内容をnoteRowsへ反映してから保存する。
      panel.querySelectorAll('.skill-row').forEach((row) => {
        const i = Number(row.dataset.index);
        skillRows[i].name = row.querySelector('.skill-name').value;
        skillRows[i].value = row.querySelector('.skill-value').value;
      });
      panel.querySelectorAll('.note-row').forEach((row) => {
        const i = Number(row.dataset.index);
        noteRows[i].title = row.querySelector('.note-title').value;
        noteRows[i].text = row.querySelector('.note-text').value;
      });

      const formData = new FormData(e.target);
      const raw = {
        id: inv.id,
        name: formData.get('name'),
        occupation: formData.get('occupation'),
        gender: formData.get('gender'),
        age: formData.get('age'),
        system: formData.get('system'),
        status: formData.get('status'),
        tags: String(formData.get('tags') || '').split(',').map((t) => t.trim()).filter(Boolean),
        image: pendingImage,
        color: pendingColor,
        abilities: Object.fromEntries(Model.ABILITY_KEYS.map((k) => [k, panel.querySelector(`[data-ability="${k}"]`).value])),
        derived: Object.fromEntries(Model.DERIVED_KEYS.map((k) => [k, panel.querySelector(`[data-derived="${k}"]`).value])),
        skills: skillRows,
        notes: noteRows,
        sourceUrl: formData.get('sourceUrl'),
        source: inv.source,
        createdAt: inv.createdAt
      };

      // このツールは「キャラの更新のしやすさ」が主目的なので、新規登録時に既存の探索者と
      // 同じ名前が入力された場合は、別の新しい探索者を追加するのではなく既存のものを
      // 更新扱いにする(いあきゃらから再取得して上書きする、という使い方を想定している)。
      let baseInvestigator = inv;
      if (!editingId) {
        const trimmedName = String(raw.name || '').trim();
        const existing = trimmedName
          ? Store.get().investigators.find((x) => (x.name || '').trim() === trimmedName)
          : null;
        if (existing) {
          raw.id = existing.id;
          raw.createdAt = existing.createdAt;
          baseInvestigator = existing;
        }
      }

      const normalized = Model.normalizeInvestigator(raw, baseInvestigator);
      await MainActions.saveInvestigator(normalized);
      close();
    });

    modalEl.hidden = false;
  }

  function close() {
    modalEl.hidden = true;
    editingId = null;
  }

  global.InvestigatorForm = { mount, open, close };
})(window);
