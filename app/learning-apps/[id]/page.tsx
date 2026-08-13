'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ChevronLeft, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { getLearningApp } from '@/lib/db';
import { LearningApp } from '@/lib/types';

export default function LearningAppDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { loading: authLoading } = useAuth();
  const [app, setApp] = useState<LearningApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundApp, setNotFoundApp] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await getLearningApp(id);
        if (cancelled) return;
        if (!result) { setNotFoundApp(true); return; }
        setApp(result);
      } catch (e) {
        console.error(e);
        if (!cancelled) setNotFoundApp(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, authLoading]);

  if (authLoading || loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} color="#a39e98" className="animate-spin" />
    </div>
  );

  if (notFoundApp || !app) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <p style={{ fontSize: '14px', color: '#a39e98' }}>アプリが見つかりませんでした。</p>
      <Link href="/learning-apps" style={{ fontSize: '13px', color: '#0075de', textDecoration: 'none', fontWeight: 500 }}>
        学習アプリ一覧に戻る
      </Link>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        borderBottom: '1px solid rgba(0,0,0,0.1)', padding: '10px 16px',
        background: '#ffffff', flexShrink: 0,
      }}>
        <Link href="/learning-apps" style={{
          display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0,
          fontSize: '13px', color: '#615d59', textDecoration: 'none',
        }}>
          <ChevronLeft size={16} />
          戻る
        </Link>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {app.icon ?? '📘'} {app.name}
        </span>
        <a
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', flexShrink: 0,
            fontSize: '12px', color: '#a39e98', textDecoration: 'none',
          }}
        >
          <ExternalLink size={12} />
          別ウィンドウ
        </a>
      </header>

      <iframe
        src={app.url}
        title={app.name}
        style={{ flex: 1, minHeight: 0, width: '100%', border: 'none' }}
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
