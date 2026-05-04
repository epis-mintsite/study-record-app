// Service Worker - Web Push 通知受信

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: '学習ランキング', body: event.data.text() };
  }

  const options = {
    body:    data.body  ?? '',
    icon:    '/globe.svg',
    badge:   '/globe.svg',
    lang:    'ja',
    data:    { url: data.url ?? '/ranking' },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? '学習ランキング', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/ranking';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 既に開いているタブがあればフォーカス
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      // なければ新規タブで開く
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
