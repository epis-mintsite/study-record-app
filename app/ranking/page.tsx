'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trophy } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import PushNotificationButton from '@/app/components/PushNotificationButton';
import { useAuth } from '@/lib/useAuth';

type RankEntry = {
  userId: string;
  name: string;
  totalMinutes: number;
};

function fmtTime(min: number) {
  if (min === 0) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}時間${m > 0 ? m + '分' : ''}` : `${m}分`;
}

const MEDAL_COLORS = [
  { bg: '#FFF8E1', border: '#FFD700', text: '#B8860B', emoji: '🥇' },
  { bg: '#F5F5F5', border: '#C0C0C0', text: '#707070', emoji: '🥈' },
  { bg: '#FFF3E0', border: '#CD7F32', text: '#8B4513', emoji: '🥉' },
];

export default function RankingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'week' | 'yesterday'>('week');
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
  }, [user, authLoading, router]);

  const fetchRanking = useCallback(async (type: 'week' | 'yesterday') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/rankings?type=${type}`);
      if (!res.ok) throw new Error();
      const data: RankEntry[] = await res.json();
      setRanking(data);
    } catch {
      setError('データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchRanking(tab);
  }, [tab, user, fetchRanking]);

  // 自分の順位（1-indexed）
  const myRank = ranking.findIndex(r => r.userId === user?.id) + 1;
  const myEntry = ranking.find(r => r.userId === user?.id);

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f5f4' }}>
      <Loader2 size={24} color="#a39e98" className="animate-spin" />
    </div>
  );

  const tabLabel = tab === 'week' ? '今週' : '昨日';

  return (
    <div style={{ minHeight: '100vh', background: '#f6f5f4', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: '600px', margin: '0 auto', width: '100%', padding: '32px 20px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={22} color="#F59E0B" />
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', margin: 0, letterSpacing: '-0.4px' }}>
              学習ランキング
            </h1>
          </div>
          <PushNotificationButton />
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', background: '#e8e6e3', borderRadius: '8px',
          padding: '3px', marginBottom: '20px',
        }}>
          {([['week', '今週'], ['yesterday', '昨日']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: '9px', borderRadius: '6px', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px',
                fontWeight: tab === key ? 700 : 500,
                background: tab === key ? '#ffffff' : 'transparent',
                color: tab === key ? 'rgba(0,0,0,0.95)' : '#615d59',
                boxShadow: tab === key ? 'rgba(0,0,0,0.06) 0px 1px 6px' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 自分のランク（上部固定表示） */}
        {!loading && myEntry && myRank > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #0075de 0%, #005bb5 100%)',
            borderRadius: '12px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '16px',
            marginBottom: '16px', color: '#ffffff',
          }}>
            <div style={{ fontSize: '13px', opacity: 0.85, minWidth: '60px' }}>あなたの順位</div>
            <div style={{ flex: 1, fontSize: '15px', fontWeight: 700 }}>{myEntry.name}</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>
                {myRank}<span style={{ fontSize: '14px', fontWeight: 500, marginLeft: '2px' }}>位</span>
              </div>
              <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '2px' }}>{fmtTime(myEntry.totalMinutes)}</div>
            </div>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#c0392b' }}>
            {error}
          </div>
        )}

        {/* ランキングリスト */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Loader2 size={24} color="#a39e98" className="animate-spin" />
          </div>
        ) : ranking.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#a39e98', fontSize: '14px' }}>
            {tabLabel}の学習データがありません。
          </div>
        ) : (
          <>
            {/* 期間ラベル */}
            <div style={{ fontSize: '12px', color: '#a39e98', marginBottom: '10px', fontWeight: 500 }}>
              {tab === 'week' ? '今週（月〜本日）の合計学習時間' : '昨日の学習時間'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ranking.map((entry, i) => {
                const isMe = entry.userId === user?.id;
                const medal = MEDAL_COLORS[i];
                const hasStudied = entry.totalMinutes > 0;

                return (
                  <div
                    key={entry.userId}
                    style={{
                      background: isMe ? '#EFF6FF' : '#ffffff',
                      border: isMe ? '2px solid #93C5FD' : '1px solid rgba(0,0,0,0.07)',
                      borderRadius: '12px', padding: '14px 18px',
                      display: 'flex', alignItems: 'center', gap: '14px',
                      opacity: hasStudied ? 1 : 0.6,
                    }}
                  >
                    {/* 順位 */}
                    {medal ? (
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: medal.bg, border: `2px solid ${medal.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', flexShrink: 0,
                      }}>
                        {medal.emoji}
                      </div>
                    ) : (
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: '#f0eeec', border: '1px solid rgba(0,0,0,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 700, color: '#a39e98', flexShrink: 0,
                      }}>
                        {i + 1}
                      </div>
                    )}

                    {/* 名前 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '15px', fontWeight: isMe ? 700 : 500,
                        color: 'rgba(0,0,0,0.9)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {entry.name}
                        {isMe && (
                          <span style={{
                            marginLeft: '8px', fontSize: '10px', fontWeight: 700,
                            color: '#3B82F6', background: '#DBEAFE',
                            padding: '2px 6px', borderRadius: '4px',
                          }}>
                            あなた
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 時間 */}
                    <div style={{
                      fontSize: '16px', fontWeight: 700, flexShrink: 0,
                      color: hasStudied ? (i === 0 ? '#B8860B' : 'rgba(0,0,0,0.85)') : '#c8c4c0',
                    }}>
                      {fmtTime(entry.totalMinutes)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* フッター注記 */}
            <p style={{ fontSize: '11px', color: '#c8c4c0', textAlign: 'center', marginTop: '20px', lineHeight: 1.6 }}>
              ※ 学習記録アプリに入力されたデータに基づくランキングです
            </p>
          </>
        )}
      </main>
    </div>
  );
}
