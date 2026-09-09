/* sw.js — サービスワーカー。オフラインでもアプリ本体を起動できるよう、
 * アプリのファイル一式(コード・画像)だけをキャッシュする。
 * 探索者データ自体はここでは扱わない(File System Access APIでローカルフォルダに
 * 直接保存されるため、Service Workerの範囲外)。
 */
const CACHE_NAME = 'coc-investigator-archive-v48';
const PRECACHE_URLS = [
  './',
  './index.html',
  './css/style.css',
  './manifest.json',
  './js/theme.js',
  './js/utils.js',
  './js/model.js',
  './js/fileStore.js',
  './js/state.js',
  './js/sampleData.js',
  './js/listView.js',
  './js/searchFilter.js',
  './js/detailModal.js',
  './js/iacharaSync.js',
  './js/charaHokankoSync.js',
  './js/investigatorForm.js',
  './js/registerSW.js',
  './js/importExport.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// キャッシュ優先で返し、無ければネットワークから取得する(単純なapp-shell戦略)。
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
