// はまとしょ 蔵書点検 - Service Worker
// ホーム画面に追加したアプリをオフラインでも起動できるようにするためのキャッシュ
var CACHE_NAME = "shelf-check-cache-v1";
var CORE_ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icon/icon-192.png",
  "./icon/icon-512.png",
  "./icon/apple-touch-icon.png",
  "./icon/favicon-32.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// 蔵書データ(books.json)はアプリ側で別にキャッシュ・更新制御しているため、
// Service Workerではネットワーク優先で素通しし、自分のコア資産だけキャッシュを使う。
self.addEventListener("fetch", function(event){
  var url = event.request.url;
  if(url.indexOf("books.json") !== -1){
    return; // アプリ側のfetchロジックに任せる（介入しない）
  }

  event.respondWith(
    caches.match(event.request).then(function(cached){
      if(cached) return cached;
      return fetch(event.request).then(function(res){
        // 同一オリジンの静的ファイルはキャッシュに追加しておく
        if(event.request.method === "GET" && res && res.status === 200){
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(event.request, resClone);
          });
        }
        return res;
      }).catch(function(){
        // オフラインかつキャッシュにもない場合、index.htmlで代替（SPA的フォールバック）
        return caches.match("./index.html");
      });
    })
  );
});
