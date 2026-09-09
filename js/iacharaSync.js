/* iacharaSync.js — 「いあきゃら」連携。
 *
 * いあきゃらには「探索者データを直接取得する」ような公式APIは無いが、CCFOLIA(TRPGセッション
 * ツール)向けの「出力→ココフォリア駒出力」「チャットパレット出力」という、他ツールへの
 * 連携を目的とした公式のエクスポート機能がある。これは規約上も安全で構造も安定しているため、
 * 能力値・HP/MP/SAN・技能値は**この公式出力を優先して読み取る**方式にしている
 * (parseCCFoliaExport)。ユーザーが自分でいあきゃら上の「出力」メニューからコピーし、
 * このアプリに貼り付けるだけなので、DOM操作の自動化にも依存しない。
 *
 * 職業・性別・年齢など、CCFOLIA出力に含まれない項目については、trpg-character-archiveで
 * 規約確認済みのブックマークレット方式(自分のシートページを自分のブラウザで読み取る)を
 * 補助的に使う(parseIacharaExport)。いずれも「ユーザー本人が、自分が投稿した情報を
 * 自分の意思で取り出す」操作であり、いあきゃら利用規約第15条が禁止する「営利目的の
 * 複製・転用」からは除外される(「ただし、ユーザー本人による投稿情報の利用は除く」)
 * 行為を想定している。大量的・自動的な連続アクセスは行わない。
 *
 * 【経緯】当初はブックマークレットで能力値・技能まで自動抽出しようとしたが、実機検証
 * (2026-09-02)で、技能値はいあきゃら画面上では入力欄の中にあり画面のテキストとしては
 * 読み取れないことが判明した。また画面全体を読み取る方式は、ログイン中のメールアドレス
 * などが混入するリスクもあった。ユーザーから「出力にチャットパレット出力・ココフォリア
 * 駒出力がある」との情報提供を受け、そちらを正として使う方式に変更した。
 *
 * 「ここふぉりあ駒出力」の技能は、キャラ出力ダイアログの「チャットパレット設定」で
 * デフォルトが「変更された技能を出力」になっているため、そのままだと変更済みの技能しか
 * 含まれない。ブックマークレットは自動で「すべての技能を出力」に切り替えてから
 * 出力させることで、この制限を回避している(手動で貼り付ける場合は、いあきゃら側で
 * この設定を切り替えてから「出力」してください)。
 *
 * 【呪文・遭遇した超自然の存在・通過したシナリオ・メモについて】実機検証(2026-09-06)の結果、
 * これらの折りたたみ欄はDOM操作での自動取得を諦めていたが、2026-09-08にユーザーから
 * 「出力→ファイルに出力」で保存できるテキストファイルの中身を提供してもらったところ、
 * 基本情報・能力値・技能に加えて、呪文・遭遇した超自然の存在・通過したシナリオ・メモまで
 * 全て含まれた完全なテキストであることが判明した。しかも見出し(【】〈〉[])で構造化されて
 * いて解析しやすいため、これを正として使う方式に切り替えた(parseIacharaTextExport)。
 * DOM操作は一切不要で、ユーザーが自分でファイルを保存し、その中身を貼り付けるだけで済む。
 * ブックマークレット方式(parseIacharaExport / parseCCFoliaExport)は、テキスト出力を
 * 使いたくない場合の簡易的な代替手段として残している。
 */
(function (global) {
  'use strict';

  // いあきゃらのキャラクターシートページ上で実行するブックマークレットの中身。
  // 職業・性別・年齢など、CCFOLIA出力に含まれない項目の補助取得用。
  // 構造(MUIのクラス名等)に依存せず、"ラベルの次に値が並ぶ"という表示パターンだけを
  // 頼りに読み取ることで、多少のUI変更に耐えるようにしている。
  const BOOKMARKLET_SOURCE = `(async function(){
    try {
      if (!/iachara\\.com/.test(location.hostname)) {
        alert('いあきゃらのキャラクターシートページ(iachara.com)で実行してください。');
        return;
      }
      // 処理中であることが分かるよう、画面の右上に小さな案内を出す(完了時に消す)。
      var statusBanner = document.createElement('div');
      statusBanner.textContent = '探索者アーカイブ: 取得中…';
      statusBanner.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;' +
        'background:#1c1e26;color:#eceef2;padding:8px 14px;border-radius:6px;' +
        'font-family:sans-serif;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
      document.body.appendChild(statusBanner);

      var emailPattern = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9.-]+/;
      var suspiciousPattern = /mail|メール|login|ログイン|account|アカウント|password|パスワード|token|userid|ユーザーid|uid/i;
      var root = document.querySelector('main') || document.body;
      var fields = {};
      root.querySelectorAll('div').forEach(function (div) {
        if (div.children.length !== 2) return;
        var a = div.children[0], b = div.children[1];
        if (a.tagName !== 'P' || a.children.length !== 0) return;
        var label = a.textContent.trim();
        if (!label || suspiciousPattern.test(label)) return;
        if (b.tagName === 'P' && b.children.length === 0) {
          var value = b.textContent.trim();
          if (!value || emailPattern.test(value) || suspiciousPattern.test(value)) return;
          fields[label] = value;
        } else {
          var swatch = b.querySelector('[style*="background-color"]');
          if (swatch) fields[label] = swatch.style.backgroundColor;
        }
      });

      // 「出力」ボタンで「キャラ出力」ダイアログを開き、技能の出力設定を
      // 「すべての技能を出力」に切り替えてから「ココフォリア駒出力」をクリックし、
      // コピーされる内容を横取りする試み。見つからない/失敗しても致命的ではなく、
      // その場合は基本情報だけ持って続行する(ユーザーはアプリ側の予備欄に手動で貼り付けられる)。
      var ccfoliaJson = '';
      try {
        var findByText = function (text) {
          var all = document.body.querySelectorAll('*');
          for (var i = 0; i < all.length; i++) {
            if (all[i].children.length === 0 && all[i].textContent.trim() === text) return all[i];
          }
          return null;
        };
        var clickUp = function (leaf) {
          if (!leaf) return false;
          var el = leaf;
          for (var i = 0; i < 6 && el; i++) {
            if (el.tagName === 'BUTTON' || (el.getAttribute && el.getAttribute('role') === 'button')) { el.click(); return true; }
            el = el.parentElement;
          }
          leaf.click();
          return true;
        };
        // ラベルのテキストから、近くにあるラジオボタンのinput要素を探して直接クリックする
        // (MUI等のUIではラベルのテキストだけクリックしても反応しないことがあるため)。
        var findRadioByLabel = function (text) {
          var leaf = findByText(text);
          if (!leaf) return null;
          var container = leaf;
          for (var i = 0; i < 5 && container; i++) {
            if (container.querySelector) {
              var radio = container.querySelector('input[type="radio"]');
              if (radio) return radio;
            }
            container = container.parentElement;
          }
          return null;
        };

        var shutsuryoku = findByText('出力');
        if (shutsuryoku) {
          clickUp(shutsuryoku);
          await new Promise(function (r) { setTimeout(r, 250); });

          var allSkillsRadio = findRadioByLabel('すべての技能を出力');
          if (allSkillsRadio && !allSkillsRadio.checked) {
            allSkillsRadio.click();
            await new Promise(function (r) { setTimeout(r, 150); });
          }

          var komaButton = findByText('ココフォリア駒出力');
          if (komaButton) {
            var captured = null;
            var origWrite = (navigator.clipboard && navigator.clipboard.writeText) ? navigator.clipboard.writeText.bind(navigator.clipboard) : null;
            if (origWrite) {
              navigator.clipboard.writeText = function (t) { captured = t; return origWrite(t); };
            }
            clickUp(komaButton);
            await new Promise(function (r) { setTimeout(r, 300); });
            if (origWrite) navigator.clipboard.writeText = origWrite;
            if (captured) ccfoliaJson = captured;
          }

          var closeBtn = findByText('閉じる');
          if (closeBtn) clickUp(closeBtn); else document.body.click();
        }
      } catch (e2) { /* 自動取得に失敗しても致命的ではないので続行する */ }

      var name = document.title.replace(/\\s*-\\s*いあきゃら\\s*$/, '').trim();
      var img = document.querySelector('img[src*="image.iaproject.app"]');
      var payload = {
        source: 'iachara-bookmarklet',
        iacharaUrl: location.href,
        name: name,
        image: img ? img.src : '',
        fields: fields,
        ccfoliaJson: ccfoliaJson
      };
      var text = JSON.stringify(payload, null, 2);
      statusBanner.remove();
      var done = function () {
        alert(ccfoliaJson
          ? 'キャラクター情報(能力値・技能を含む)をコピーしました。\\n「探索者アーカイブ」の貼り付け欄にペーストしてください。'
          : 'キャラクター情報をコピーしました(能力値・技能は自動取得できませんでした。予備欄で手動貼り付けしてください)。\\n「探索者アーカイブ」の貼り付け欄にペーストしてください。');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { prompt('コピーができなかったので、下のテキストを手動でコピーしてください:', text); });
      } else {
        prompt('下のテキストをコピーしてください:', text);
      }
    } catch (e) {
      if (statusBanner && statusBanner.remove) statusBanner.remove();
      alert('読み取りに失敗しました: ' + e.message);
    }
  })();`;

  function bookmarkletHref() {
    return 'javascript:' + encodeURIComponent(BOOKMARKLET_SOURCE);
  }

  const EMAIL_PATTERN = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+/;
  const SUSPICIOUS_PATTERN = /mail|メール|login|ログイン|account|アカウント|password|パスワード|token|userid|ユーザーid|uid/i;

  function isSafeField(label, value) {
    if (!value) return false;
    if (SUSPICIOUS_PATTERN.test(label)) return false;
    if (EMAIL_PATTERN.test(value) || SUSPICIOUS_PATTERN.test(value)) return false;
    return true;
  }

  function findFieldValue(fields, candidates) {
    const keys = Object.keys(fields);
    for (const candidate of candidates) {
      const hit = keys.find((k) => k.trim() === candidate);
      if (hit) return fields[hit];
    }
    return undefined;
  }

  // テキスト中の「【セクション名】」の直後から、次の「【…】」の直前までを切り出す。
  function sectionSlice(text, sectionName) {
    const startMatch = text.match(new RegExp(`【${sectionName}】`));
    if (!startMatch) return '';
    const startIdx = startMatch.index + startMatch[0].length;
    const rest = text.slice(startIdx);
    const nextMatch = rest.match(/【[^】]+】/);
    return nextMatch ? rest.slice(0, nextMatch.index) : rest;
  }

  // 【新たに得た知識・経験】【メモ】のような、「〈カテゴリ〉」「[タイトル]」で区切られた
  // セクションを、{title, text}の配列に分解する。カテゴリが分かれば「カテゴリ: タイトル」に
  // まとめる(同じタイトルが複数カテゴリに出てくることがあるため)。カテゴリ・タイトルの
  // 前に来る文章(見出しの無いメモ等)も、タイトル無しの1件として拾う。
  // 「〈報酬〉」のように本文中に現れる小見出しとの区別のため、「〈...〉」の直後の行
  // (空行を除く)が「[タイトル]」でなければ、区切りとはみなさず普通の本文として扱う。
  function extractBracketEntries(sectionText) {
    const entries = [];
    const lines = sectionText.split('\n');
    let currentCategory = '';
    let currentTitle = '';
    let buffer = [];
    const flush = () => {
      const body = buffer.join('\n').trim();
      if (body) {
        const title = currentCategory && currentTitle ? `${currentCategory}: ${currentTitle}` : (currentTitle || currentCategory);
        entries.push({ title, text: body });
      }
      buffer = [];
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const catMatch = line.match(/^〈(.+)〉\s*$/);
      if (catMatch) {
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;
        const looksLikeCategoryHeader = j < lines.length && /^\[.+\]\s*$/.test(lines[j]);
        if (looksLikeCategoryHeader) {
          flush();
          currentCategory = catMatch[1].trim();
          currentTitle = '';
          continue;
        }
      }
      const titleMatch = line.match(/^\[(.+)\]\s*$/);
      if (titleMatch) {
        flush();
        currentTitle = titleMatch[1].trim();
        continue;
      }
      buffer.push(line);
    }
    flush();
    return entries;
  }

  // 「出力→ファイルに出力」で保存できるテキストファイル(いあきゃらテキスト)の中身を、
  // 探索者フォームに反映する形へマッピングする。基本情報・能力値・技能に加えて、
  // 呪文・遭遇した超自然の存在・通過したシナリオ・メモまで、これ1つで全部読み取れる。
  function parseIacharaTextExport(rawText) {
    const text = String(rawText || '').replace(/\r\n/g, '\n');
    if (!/いあきゃらテキスト/.test(text)) {
      throw new Error('いあきゃらの「出力→ファイルに出力」で保存したテキストの内容を、そのまま貼り付けてください。');
    }

    const result = { source: 'iachara-text', abilities: {}, derived: {}, skills: [], notes: [] };

    const versionMatch = text.match(/いあきゃらテキスト\s*(\S+)\s*v/);
    if (versionMatch) result.systemGuess = `クトゥルフ神話TRPG ${versionMatch[1]}`;

    const basicSection = sectionSlice(text, '基本情報');
    // 年齢/性別/身長のように「/」区切りで1行に複数項目が並ぶものは、次の空白or「/」までを値とする。
    const field = (label, scope) => {
      const m = (scope || basicSection).match(new RegExp(`${label}[:：]\\s*([^\\s/\\n]*)`));
      return m ? m[1].trim() : '';
    };
    // 名前/職業/肌の色のように、値そのものに空白を含みうる項目は、行末までを値とする。
    const fieldLine = (label, scope) => {
      const m = (scope || basicSection).match(new RegExp(`^${label}[:：]\\s*(.*)$`, 'm'));
      return m ? m[1].trim() : '';
    };
    const nameRaw = fieldLine('名前');
    const nameMatch = nameRaw.match(/^(.*?)\s*[(（]([^)）]*)[)）]\s*$/);
    result.name = (nameMatch ? nameMatch[1] : nameRaw).trim();
    result.occupation = fieldLine('職業');
    result.age = field('年齢');
    result.gender = field('性別');

    const imgMatch = text.match(/(https:\/\/image\.iaproject\.app\/\S+)/);
    if (imgMatch) result.image = imgMatch[1];

    // 「イメージカラー」は【基本情報】の正式な項目には無く、【メモ】に貼られがちな
    // プロフィールテンプレート内(例:「●イメカラ：#ff9500」)にしか現れないため、
    // 確実ではないがベストエフォートでテキスト全体から探す。
    const colorMatch = text.match(/(?:イメ(?:ージ)?カラ|テーマカラ)ー?[^\n#]*(#[0-9a-fA-F]{3,6})/);
    if (colorMatch) result.color = Model.normalizeColor(colorMatch[1]);

    const noteLines = [];
    ['身長', '体重', '出身', '髪の色', '瞳の色'].forEach((label) => {
      const v = field(label);
      if (v) noteLines.push(`${label}: ${v}`);
    });
    // 肌の色は行の最後にあり値に空白を含みうるため、行末までを値とする。
    const skinColor = fieldLine('肌の色');
    if (skinColor) noteLines.push(`肌の色: ${skinColor}`);
    // 誕生日は「3/7」のように値自体に「/」を含むため、行末までを値とする。
    const birthday = fieldLine('誕生日');
    if (birthday) noteLines.push(`誕生日: ${birthday}`);
    if (noteLines.length) result.notes.push({ title: 'いあきゃら基本情報', text: noteLines.join('\n') });

    const abilitySection = sectionSlice(text, '能力値');
    Model.ABILITY_KEYS.forEach((key) => {
      const m = abilitySection.match(new RegExp(`^${key}\\s+(-?\\d+)`, 'm'));
      if (m) result.abilities[key] = Number(m[1]);
    });
    const hpMatch = abilitySection.match(/^HP\s+(-?\d+)/m);
    if (hpMatch) result.derived.HP = Number(hpMatch[1]);
    const mpMatch = abilitySection.match(/^MP\s+(-?\d+)/m);
    if (mpMatch) result.derived.MP = Number(mpMatch[1]);
    // 能力値表の中の「正気度」行(POW×5の初期値)ではなく、「正気度 56 / 79」という
    // 現在値/最大値の行を優先する(スラッシュの有無で区別する)。
    const sanMatch = text.match(/正気度\s+(\d+)\s*\/\s*(\d+)/);
    if (sanMatch) result.derived.SAN = Number(sanMatch[1]);
    const dbMatch = text.match(/^DB\s+(\S+)/m);
    if (dbMatch) result.derived.DB = dbMatch[1];

    // 【技能値】section: 「技能名 合計 初期値 職業P 興味P 成長分 その他」という並びの行から、
    // 内訳をすべて拾う(詳細画面での色分け・内訳ツールチップ表示に使う)。
    const skillsSection = sectionSlice(text, '技能値');
    const skillLinePattern = /^(\S.*?)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s*$/gm;
    let sm;
    const asNumOrNull = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
    while ((sm = skillLinePattern.exec(skillsSection))) {
      const name = sm[1].trim();
      if (name === '技能名') continue;
      const value = asNumOrNull(sm[2]);
      if (value != null) {
        result.skills.push({
          name,
          value,
          initial: asNumOrNull(sm[3]),
          occupation: asNumOrNull(sm[4]),
          interest: asNumOrNull(sm[5]),
          growth: asNumOrNull(sm[6]),
          other: asNumOrNull(sm[7])
        });
      }
    }

    const knowledgeSection = sectionSlice(text, '新たに得た知識・経験');
    result.notes.push(...extractBracketEntries(knowledgeSection));
    const memoSection = sectionSlice(text, 'メモ');
    result.notes.push(...extractBracketEntries(memoSection));

    return result;
  }

  // ブックマークレットが出力したJSONを、探索者フォームに反映する形へマッピングする。
  // (職業・性別・年齢など、CCFOLIA出力に含まれない項目の補助取得用)
  function parseIacharaExport(rawText) {
    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch (e) {
      throw new Error('JSONとして読み取れませんでした。ブックマークレットでコピーした内容をそのまま貼り付けてください。');
    }

    const rawFields = payload.fields || {};
    const fields = {};
    Object.keys(rawFields).forEach((label) => {
      if (isSafeField(label, rawFields[label])) fields[label] = rawFields[label];
    });

    const result = {
      name: payload.name || '',
      image: payload.image || '',
      sourceUrl: payload.iacharaUrl || '',
      source: 'iachara',
      abilities: {},
      derived: {},
      skills: []
    };
    result.occupation = findFieldValue(fields, ['職業']);
    result.age = findFieldValue(fields, ['年齢']);
    result.gender = findFieldValue(fields, ['性別']);

    // 「イメージカラー」はいあきゃらの画面上では色見本(background-color)として
    // 表示されており、ブックマークレット側でswatch.style.backgroundColorとして
    // 取得済み(rgb(r, g, b)形式)。ここで#rrggbbに正規化して構造化フィールドにする。
    const colorLabel = Object.keys(fields).find((label) => /(?:イメ(?:ージ)?カラ|テーマカラ)ー?/.test(label));
    if (colorLabel) result.color = Model.normalizeColor(fields[colorLabel]);

    const knownLabels = ['職業', '年齢', '性別', colorLabel].filter(Boolean);
    const extraLines = Object.keys(fields)
      .filter((label) => !knownLabels.includes(label) && fields[label])
      .map((label) => `${label}: ${fields[label]}`);
    if (extraLines.length) result.extraInfo = extraLines.join('\n');

    // ブックマークレットが「出力→ここふぉりあ駒出力」の自動クリックに成功していれば、
    // 能力値・HP/MP/SAN・技能もこの時点で一緒に反映できる(手間を1回にまとめるため)。
    // ブックマークレット側で「すべての技能を出力」に切り替えてから出力させているため、
    // 技能は(デフォルトの「変更された技能のみ」ではなく)全件が含まれる想定。
    result.ccfoliaAutoCaptured = false;
    if (payload.ccfoliaJson) {
      try {
        const ccfolia = parseCCFoliaExport(payload.ccfoliaJson);
        if (ccfolia.name) result.name = ccfolia.name;
        if (ccfolia.image) result.image = ccfolia.image;
        result.abilities = ccfolia.abilities || {};
        result.derived = ccfolia.derived || {};
        result.skills = ccfolia.skills || [];
        result.systemGuess = ccfolia.systemGuess;
        result.ccfoliaAutoCaptured = true;
      } catch (e) { /* 自動取得分の解析に失敗しても、基本情報は反映済みなので無視する */ }
    }

    return result;
  }

  // 「CCB<=90 【目星】」のような行から技能名と値を拾う。
  // 「CCB<={STR}*5 【STR × 5】」のような能力値ロールは、名前に「×」を含むため除外する
  // (能力値は別途abilitiesで取得済みで、重複登録を避けるため)。
  function extractSkillsFromCommands(commands) {
    const skills = [];
    const skillPattern = /CCB<=(\d+)\s*[【\[]([^】\]]+)[】\]]/g;
    let m;
    while ((m = skillPattern.exec(commands || ''))) {
      const name = m[2].trim();
      if (name.includes('×') || /\bx\s*\d/i.test(name)) continue;
      skills.push({ name, value: Number(m[1]) });
    }
    return skills;
  }

  // 「出力→ココフォリア駒出力」(JSON)、または「チャットパレット出力」(プレーンテキスト)を
  // 貼り付けた内容から、能力値・HP/MP/SAN・技能値を読み取る。いあきゃら画面のDOM構造には
  // 一切依存しないため、駒出力方式の中では最も壊れにくい。
  function parseCCFoliaExport(rawText) {
    const trimmed = (rawText || '').trim();
    let data = null;
    let commands = trimmed;
    try {
      const payload = JSON.parse(trimmed);
      data = payload.data || payload;
      commands = data.commands || '';
    } catch (e) {
      // JSONでなければ、チャットパレットのテキストがそのまま貼られたとみなす
    }

    const result = { source: 'iachara-ccfolia' };

    if (data) {
      const rawName = String(data.name || '');
      // 「晨 採価 (しん さいか)」のようなよみ表記を分離する
      const nameMatch = rawName.match(/^(.*?)\s*[(（]([^)）]*)[)）]\s*$/);
      result.name = (nameMatch ? nameMatch[1] : rawName).trim();
      result.image = data.iconUrl || '';
      result.sourceUrl = data.externalUrl || '';

      const abilities = {};
      (data.params || []).forEach((p) => {
        if (Model.ABILITY_KEYS.includes(p.label)) {
          const n = Number(p.value);
          if (Number.isFinite(n)) abilities[p.label] = n;
        }
      });
      result.abilities = abilities;

      const derived = {};
      (data.status || []).forEach((s) => {
        if (['HP', 'MP', 'SAN'].includes(s.label) && s.value != null) derived[s.label] = Number(s.value);
      });
      result.derived = derived;
    }

    const skills = extractSkillsFromCommands(commands);
    result.skills = skills;
    result.rawCommandsText = commands;

    // 「アイデア」「幸運」「知識」ロールは6版特有の用語(7版・新クトゥルフでは使われない)なので、
    // 含まれていれば6版の可能性が高いと推測する。確実ではないので、あくまで参考値として返す。
    if (/【アイデア】/.test(commands) && /【幸運】/.test(commands) && /【知識】/.test(commands)) {
      result.systemGuess = 'クトゥルフ神話TRPG 6版';
    }

    if (!data && skills.length === 0) {
      throw new Error('内容を認識できませんでした。「出力→ココフォリア駒出力」または「チャットパレット出力」でコピーした内容をそのまま貼り付けてください。');
    }
    return result;
  }

  global.IacharaSync = { BOOKMARKLET_SOURCE, bookmarkletHref, parseIacharaExport, parseCCFoliaExport, parseIacharaTextExport };
})(window);
