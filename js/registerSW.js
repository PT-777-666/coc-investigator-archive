/* registerSW.js — PWAとしてインストールできるよう、サービスワーカーを登録する。
 * 対応していないブラウザでは何もしない(通常のWebアプリとしては引き続き使える)。
 */
(function () {
  'use strict';
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        // 登録に失敗しても通常表示は続けられるので、ここでは何もしない
      });
    });
  }
})();
