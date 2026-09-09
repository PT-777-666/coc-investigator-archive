/* sampleData.js — 初回起動時にだけ投入するサンプル探索者。
 * 操作感を確認してもらうためのダミーデータで、不要なら削除してよい。
 */
(function (global) {
  'use strict';

  const now = new Date().toISOString();

  global.SAMPLE_INVESTIGATORS = [
    {
      id: 'sample-0001',
      name: 'サンプル・探索者',
      occupation: '私立探偵',
      gender: '不明',
      age: '28',
      system: 'クトゥルフ神話TRPG 7版',
      status: '生存',
      tags: ['サンプル'],
      image: '',
      abilities: { STR: 50, CON: 60, POW: 65, DEX: 55, APP: 45, SIZ: 60, INT: 70, EDU: 75 },
      derived: { HP: 12, MP: 13, SAN: 65, DB: '+0' },
      skills: [
        { name: '目星', value: 60 },
        { name: '図書館', value: 55 },
        { name: '説得', value: 40 }
      ],
      notes: [{ title: '', text: 'これはサンプルデータです。内容を確認したら編集または削除してください。' }],
      sourceUrl: '',
      source: 'manual',
      createdAt: now,
      updatedAt: now
    }
  ];
})(window);
