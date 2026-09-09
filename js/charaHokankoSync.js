/* charaHokankoSync.js — 「キャラクター保管所」(charasheet.vampire-blood.net)連携。
 *
 * キャラクター保管所には、キャラクターシートのURL末尾に「.js」を付けると、
 * データをJSON形式で取得できる公式の機能がある。利用規約のヘルプページ
 * (https://charasheet.vampire-blood.net/help/kiyaku)で「復旧用に保存してください」と
 * 案内されている、公式に想定された使い方であり、禁止されているのは「全データ転載」
 * (他人のデータをまとめて転載・再配布すること)であって、本人が自分のキャラクター1件を
 * バックアップする用途はこれに当たらない。
 *
 * ブックマークレットやDOM操作は一切不要で、ユーザーが自分でそのURLを開いて
 * コピーした内容をこのアプリに貼り付けるだけで済む(通信の横取りやスクレイピングでは
 * なく、公式に案内されている保存方法をそのまま利用しているだけ)。
 *
 * 【注意】技能値は名前を含まない数値の配列(例: TBAD, TBAP)で渡ってくるため、
 * 技能名との対応は、キャラクター保管所の「クトゥルフ PC作成ツール」
 * (coc_pc_making.html, 6版用)の技能表の並び順を2026-09-08に確認して固定している。
 * このツール側の並びが変わると技能名がズレる可能性がある。「新クトゥルフ神話TRPG
 * PC作成ツール」(7版相当)は別テンプレートの可能性があり未対応。
 */
(function (global) {
  'use strict';

  // 技能グループごとの技能名(表示順)。キャラクター保管所のJSONでは
  // 「<グループ略号>P」という配列(例: TBAP)に、この並び順で最終値が入っている。
  const SKILL_GROUPS = {
    TBA: ['回避', 'キック', '組み付き', 'こぶし（パンチ）', '頭突き', '投擲', 'マーシャルアーツ', '拳銃', 'サブマシンガン', 'ショットガン', 'マシンガン', 'ライフル'],
    TFA: ['応急手当', '鍵開け', '隠す', '隠れる', '聞き耳', '忍び歩き', '写真術', '精神分析', '追跡', '登攀', '図書館', '目星'],
    TAA: ['運転', '機械修理', '重機械操作', '乗馬', '水泳', '製作', '操縦', '跳躍', '電気修理', 'ナビゲート', '変装'],
    TCA: ['言いくるめ', '信用', '説得', '値切り', '母国語'],
    TKA: ['医学', 'オカルト', '化学', 'クトゥルフ神話', '芸術', '経理', '考古学', 'コンピューター', '心理学', '人類学', '生物学', '地質学', '電子工学', '天文学', '博物学', '物理学', '法律', '薬学', '歴史']
  };

  // 「運転(自動車)」のように、分野を別欄で指定できる技能の補足フィールド名。
  const SPECIALIZATION_FIELDS = {
    '運転': 'unten_bunya',
    '製作': 'seisaku_bunya',
    '操縦': 'main_souju_norimono',
    '母国語': 'mylang_name',
    '芸術': 'geijutu_bunya'
  };

  function toNumberOrNull(v) {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // 「.js」出力の内容(JSON文字列)を、探索者フォームに反映する形へマッピングする。
  function parseCharaHokankoExport(rawText) {
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      throw new Error('JSONとして読み取れませんでした。キャラクターページURLの末尾に「.js」を付けて開いた内容をそのまま貼り付けてください。');
    }

    const result = { source: 'charahokanko', abilities: {}, derived: {}, skills: [] };

    result.name = String(data.pc_name || '').trim();
    result.occupation = String(data.shuzoku || '').trim();
    result.age = String(data.age || '').trim();
    result.gender = String(data.sex || '').trim();
    if (data.data_id) result.sourceUrl = `https://charasheet.vampire-blood.net/${data.data_id}`;

    Model.ABILITY_KEYS.forEach((key, i) => {
      const v = toNumberOrNull(data['NA' + (i + 1)]);
      if (v != null) result.abilities[key] = v;
    });

    const hp = toNumberOrNull(data.NA9);
    const mp = toNumberOrNull(data.NA10);
    if (hp != null) result.derived.HP = hp;
    if (mp != null) result.derived.MP = mp;
    // 現在のSAN(SAN_Left)が未入力なら、初期正気度(POW×5, NA14)を代わりに使う。
    const sanLeft = toNumberOrNull(data.SAN_Left);
    const sanInitial = toNumberOrNull(data.NA14);
    if (sanLeft != null) result.derived.SAN = sanLeft;
    else if (sanInitial != null) result.derived.SAN = sanInitial;
    if (data.dmg_bonus != null && data.dmg_bonus !== '') {
      const dbRaw = String(data.dmg_bonus);
      result.derived.DB = /^[+-]/.test(dbRaw) ? dbRaw : `+${dbRaw}`;
    }

    // 技能配列の添字とその意味(実機のスクリーンショットで確認・推測、2026-09-09):
    //   D=初期値(確認済み) K=興味P(確認済み、「回避」でK[0]=10が興味Pの欄に表示されていた)
    //   P=合計(確認済み、D+K+他=Pの計算が一致) U=「成長」チェック(数値ではなく判定予定フラグ)
    //   S=職業P、A=成長分 は実例が無く、興味Pプールの合計が"TK_Total"・職業Pプールの合計が
    //   "TS_Total"という命名(S=職業/K=興味)と一致することから推測。O=その他(Otherの頭文字)。
    // S・Aは消去法での推測のため、もし表示が実態とズレていたら入れ替える。
    const skills = [];
    Object.keys(SKILL_GROUPS).forEach((prefix) => {
      const names = SKILL_GROUPS[prefix];
      const totals = data[prefix + 'P'];
      const initials = data[prefix + 'D'];
      const occupations = data[prefix + 'S'];
      const interests = data[prefix + 'K'];
      const growths = data[prefix + 'A'];
      const others = data[prefix + 'O'];
      if (!Array.isArray(totals)) return;
      names.forEach((name, i) => {
        const value = toNumberOrNull(totals[i]);
        if (value == null) return;
        const pick = (arr) => (Array.isArray(arr) ? toNumberOrNull(arr[i]) : null);
        const specField = SPECIALIZATION_FIELDS[name];
        const spec = specField && data[specField] ? String(data[specField]).trim() : '';
        skills.push({
          name: spec ? `${name}(${spec})` : name,
          value,
          initial: pick(initials),
          occupation: pick(occupations),
          interest: pick(interests),
          growth: pick(growths),
          other: pick(others)
        });
      });
    });
    result.skills = skills;

    // このツール(coc_pc_making.html)で作成された場合は"game":"coc"になっている(6版用)。
    if (data.game === 'coc') result.systemGuess = 'クトゥルフ神話TRPG 6版';

    const noteLines = [];
    if (data.pc_height) noteLines.push(`身長: ${data.pc_height}`);
    if (data.pc_weight) noteLines.push(`体重: ${data.pc_weight}`);
    if (data.pc_kigen) noteLines.push(`出身: ${data.pc_kigen}`);
    if (data.color_hair) noteLines.push(`髪の色: ${data.color_hair}`);
    if (data.color_eye) noteLines.push(`瞳の色: ${data.color_eye}`);
    if (data.color_skin) noteLines.push(`肌の色: ${data.color_skin}`);
    result.extraInfo = noteLines.join('\n');
    result.backstory = data.pc_making_memo ? String(data.pc_making_memo) : '';

    return result;
  }

  global.CharaHokankoSync = { parseCharaHokankoExport, SKILL_GROUPS };
})(window);
