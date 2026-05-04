'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';

type Status = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0))).buffer as ArrayBuffer;
}

export default function PushNotificationButton() {
  const [status,  setStatus]  = useState<Status>('loading');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) {
          setStatus('subscribed');
        } else if (Notification.permission === 'denied') {
          setStatus('denied');
        } else {
          setStatus('unsubscribed');
        }
      });
    }).catch(() => setStatus('unsupported'));
  }, []);

  async function handleSubscribe() {
    setWorking(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
      const res = await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(sub.toJSON()),
      });
      if (res.ok) setStatus('subscribed');
    } catch {
      if (Notification.permission === 'denied') setStatus('denied');
    } finally {
      setWorking(false);
    }
  }

  async function handleUnsubscribe() {
    setWorking(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await fetch('/api/push/subscribe', { method: 'DELETE' });
      setStatus('unsubscribed');
    } finally {
      setWorking(false);
    }
  }

  // 非対応ブラウザは何も表示しない
  if (status === 'loading' || status === 'unsupported') return null;

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', borderRadius: '8px', border: 'none',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'opacity 0.15s',
  };

  if (status === 'denied') {
    return (
      <div style={{ fontSize: '12px', color: '#a39e98', padding: '8px 0', lineHeight: 1.6 }}>
        🔕 通知がブロックされています。<br />
        ブラウザの設定から「通知を許可」してください。
      </div>
    );
  }

  if (status === 'subscribed') {
    return (
      <button
        onClick={handleUnsubscribe}
        disabled={working}
        style={{ ...btnBase, background: '#f0eeec', color: '#615d59', opacity: working ? 0.6 : 1 }}
      >
        {working ? <Loader2 size={14} className="animate-spin" /> : <BellOff size={14} />}
        通知をオフにする
      </button>
    );
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={working}
      style={{ ...btnBase, background: '#0075de', color: '#ffffff', opacity: working ? 0.6 : 1 }}
    >
      {working ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
      朝7時の通知を受け取る
    </button>
  );
}
