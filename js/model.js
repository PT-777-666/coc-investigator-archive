/* model.js — 探索者データの形と、初期値・正規化ロジック。
 * 新規作成・編集フォームの保存時と、JSONインポート時の両方から使う
 * 「入口を1つにまとめる」ことで、データの形が食い違うのを防いでいる。
 */
(function (global) {
  'use strict';

  // CoC(クトゥルフ神話TRPG)共通の8能力値。
  const ABILITY_KEYS = ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ', 'INT', 'EDU'];

  // 副次的な数値。build・move(ビルド・移動力)は7版特有で版によって要不要が分かれるため、
  // 版を問わず共通するHP/MP/SAN/DBに加え、6版のアイデア・幸運・知識ロールを固定項目にする
  // (7版ではこれらを使わないため、その場合は空欄のままでよい)。
  const DERIVED_KEYS = ['HP', 'MP', 'SAN', 'DB', 'アイデア', '幸運', '知識'];

  // 状態のプルダウン候補(自由入力も可)。
  const STATUS_OPTIONS = ['生存', 'ロスト', 'その他'];

  // システム欄の入力補助候補(自由入力も可)。
  const SYSTEM_SUGGESTIONS = ['クトゥルフ神話TRPG 6版', 'クトゥルフ神話TRPG 7版', '新クトゥルフ神話TRPG'];

  // 空の探索者データを1件分作る(新規登録フォームの初期値)。
  function createEmptyInvestigator() {
    const now = new Date().toISOString();
    return {
      id: Utils.uuid(),
      name: '',
      occupation: '',
      gender: '',
      age: '',
      system: '',
      status: '生存',
      tags: [],
      image: '',
      abilities: Object.fromEntries(ABILITY_KEYS.map((k) => [k, null])),
      derived: Object.fromEntries(DERIVED_KEYS.map((k) => [k, null])),
      skills: [],
      notes: [],
      sourceUrl: '',
      source: 'manual',
      createdAt: now,
      updatedAt: now
    };
  }

  // 数値化できる場合だけ数値にし、できなければnullにする(空欄・非数値の入力に強くする)。
  function toNumberOrNull(value) {
    if (value === '' || value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  // フォーム入力やインポートしたJSONを、DBに保存する形へ正規化する。
  // 未知のフィールドは無視し、欠けているフィールドは初期値で補う。
  function normalizeInvestigator(raw, existing) {
    const base = existing || createEmptyInvestigator();
    const now = new Date().toISOString();
    const abilities = {};
    ABILITY_KEYS.forEach((k) => {
      abilities[k] = toNumberOrNull(raw.abilities ? raw.abilities[k] : undefined);
    });
    const derived = {};
    DERIVED_KEYS.forEach((k) => {
      const v = raw.derived ? raw.derived[k] : undefined;
      // DBは「+1D4」のような文字式を書きたい場合があるので数値化しない
      derived[k] = k === 'DB' ? (v || null) : toNumberOrNull(v);
    });
    // initial(初期値)・occupation(職業P)・interest(興味P)・growth(成長分)・other(その他)は、
    // 取り込み元がその内訳を持っている場合だけ入る任意項目(今のところいあきゃらの
    // テキスト出力のみ)。分かれば、詳細画面での色分け表示・内訳ツールチップに使う。
    const optionalSkillNum = (v) => (v == null ? null : toNumberOrNull(v));
    const skills = Array.isArray(raw.skills)
      ? raw.skills
        .map((s) => ({
          name: String(s.name || '').trim(),
          value: toNumberOrNull(s.value),
          initial: optionalSkillNum(s.initial),
          occupation: optionalSkillNum(s.occupation),
          interest: optionalSkillNum(s.interest),
          growth: optionalSkillNum(s.growth),
          other: optionalSkillNum(s.other)
        }))
        .filter((s) => s.name)
      : [];
    const tags = Array.isArray(raw.tags)
      ? raw.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];

    // いあきゃらの「メモ」欄のように、タイトル付きのメモを複数持てるようにする。
    // 旧バージョン(単一のmemo文字列)で保存されたデータも、1件のメモとして読み込む。
    let notes;
    if (Array.isArray(raw.notes)) {
      notes = raw.notes
        .map((n) => ({ title: String(n.title || '').trim(), text: String(n.text || '') }))
        .filter((n) => n.title || n.text);
    } else if (raw.memo) {
      notes = [{ title: '', text: String(raw.memo) }];
    } else {
      notes = [];
    }

    return {
      id: raw.id || base.id || Utils.uuid(),
      name: String(raw.name || '').trim(),
      occupation: String(raw.occupation || '').trim(),
      gender: String(raw.gender || '').trim(),
      age: String(raw.age || '').trim(),
      system: String(raw.system || '').trim(),
      status: String(raw.status || '生存').trim(),
      tags,
      image: raw.image || '',
      abilities,
      derived,
      skills,
      notes,
      sourceUrl: String(raw.sourceUrl || '').trim(),
      source: raw.source || 'manual',
      createdAt: raw.createdAt || base.createdAt || now,
      updatedAt: raw.updatedAt || now
    };
  }

  // 8能力値の合計(未入力があれば無視して合計する)。並べ替え・遊び機能で使う。
  function abilityTotal(investigator) {
    return ABILITY_KEYS.reduce((sum, k) => sum + (investigator.abilities[k] || 0), 0);
  }

  // CoC6版の技能初期値(ユーザー提供の一覧)。取り込み元に初期値が無い技能でも、
  // ここと照らし合わせれば「初期値のまま」か「成長させたか」を判定できる。
  // 表記ゆれ(制作/製作、コンピュータ/コンピューター等)は複数キーで吸収する。
  const BASE_SKILL_PERCENT = {
    '言いくるめ': 5, '医学': 5, '運転': 20, '応急手当': 30,
    'オカルト': 5, '化学': 1, '科学': 1, '鍵開け': 1,
    '隠す': 15, '隠れる': 10, '機械修理': 20,
    '聞き耳': 25, 'キック': 25, 'クトゥルフ神話': 0,
    '組み付き': 25, '芸術': 5, '経理': 10, '拳銃': 20,
    '考古学': 1, 'こぶし（パンチ）': 50, 'こぶし／パンチ': 50, 'こぶし(パンチ)': 50,
    'コンピューター': 1, 'コンピュータ': 1,
    'サブマシンガン': 15, '忍び歩き': 10, 'しのび歩き': 10, '写真術': 10,
    '重機械操作': 1, '乗馬': 5, 'ショットガン': 30,
    '信用': 15, '心理学': 5, '人類学': 1, '水泳': 25,
    '製作': 5, '制作': 5, '精神分析': 1, '生物学': 1, '説得': 15,
    '操縦': 1, '地質学': 1, '跳躍': 25, '追跡': 10,
    '頭突き': 10, '電気修理': 10, '電子工学': 1,
    '天文学': 1, '投擲': 25, '登攀': 40, '図書館': 25,
    'ナビゲート': 10, '値切り': 5, '博物学': 10,
    '物理学': 1, '変装': 1, '法律': 5, '他の言語': 1,
    'マーシャルアーツ': 1, 'マシンガン': 15, '目星': 25,
    '薬学': 1, 'ライフル': 25, '歴史': 20
  };
  // 能力値によって初期値が変わる技能(回避=DEX×2、母国語=EDU×5)。
  const BASE_SKILL_FORMULA = {
    '回避': (abilities) => (abilities.DEX || 0) * 2,
    '母国語': (abilities) => (abilities.EDU || 0) * 5
  };

  // 技能名(「製作(美術品修復)」のような分野つきも可)と能力値から、CoC6版の初期値を求める。
  // 該当する技能が無ければnullを返す(独自技能・未対応の版など)。
  function baseSkillValue(skillName, abilities) {
    const bareName = String(skillName || '').replace(/[（(].*$/, '').trim();
    if (BASE_SKILL_FORMULA[bareName]) return BASE_SKILL_FORMULA[bareName](abilities || {});
    if (bareName in BASE_SKILL_PERCENT) return BASE_SKILL_PERCENT[bareName];
    return null;
  }

  global.Model = {
    ABILITY_KEYS,
    DERIVED_KEYS,
    STATUS_OPTIONS,
    SYSTEM_SUGGESTIONS,
    createEmptyInvestigator,
    normalizeInvestigator,
    abilityTotal,
    baseSkillValue
  };
})(window);
