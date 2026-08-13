'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/lib/useAuth';
import { getLearningApps } from '@/lib/db';
import { LearningApp } from '@/lib/types';

export default function LearningAppsPage() {
  const { loading: authLoading } = useAuth();
  const [apps, setApps] = useState<LearningApp[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setApps(await getLearningApps()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} color="#a39e98" className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', width: '100%', padding: '32px 24px 64px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.625px', margin: '0 0 8px' }}>
          学習アプリ
        </h1>
        <p style={{ fontSize: '13px', color: '#a39e98', margin: '0 0 24px' }}>
          自主学習に使えるアプリ一覧です。タップすると画面内で開きます。
        </p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#a39e98', gap: '10px' }}>
            <Loader2 size={20} className="animate-spin" />
            <span style={{ fontSize: '14px' }}>読み込み中...</span>
          </div>
        ) : apps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#a39e98', fontSize: '14px' }}>
            学習アプリはまだ登録されていません。
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
            {apps.map(app => (
              <Link
                key={app.id}
                href={`/learning-apps/${app.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '12px', padding: '16px',
                  boxShadow: 'rgba(0,0,0,0.03) 0px 2px 10px',
                  textDecoration: 'none', transition: 'border-color 0.15s',
                }}
              >
                <span style={{
                  flexShrink: 0, width: '44px', height: '44px', borderRadius: '10px',
                  background: '#f2f9ff', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '22px',
                }}>
                  {app.icon ?? '📘'}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {app.name}
                  </span>
                  {app.description && (
                    <span style={{ display: 'block', fontSize: '12px', color: '#a39e98', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.description}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
