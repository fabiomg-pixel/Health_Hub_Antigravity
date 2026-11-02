// Service worker do painel: abre sem sinal (na academia). Rede primeiro, cache como reserva.
// Nunca guarda /api/* (os dados vivos vêm da rede) e nunca atrapalha POST.
const V = 'saude-v26';
const BASE = ['./', 'index.html', 'palco.js', 'palco.css', 'treino.js', 'corrida.js', 'decisao.js', 'campanha.js', 'pixel.js', 'data/jornada.json', 'data/historia.json', 'manifest.webmanifest', 'icon-192.png', 'data/semana.json', 'data/fatos.json', 'data/treinos.json', 'data/corridas.json', 'data/alimentacao.json', 'data/dashboard.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then(r => { if (r && r.ok) { const c = r.clone(); caches.open(V).then(ca => ca.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match('index.html'))));
});
