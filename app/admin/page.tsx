'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getUserRole } from '@/lib/db';
import { LogOut, Users, Send, RefreshCw } from 'lucide-react';

type UserRow = {
  id:                string;
  name:              string;
  role:              string;
  linked_student_id: string | null;
  created_at:        string;
};

export default function AdminPage() {
  const [users, setUsers]         = useState<UserRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [slackSending, setSlackSending] = useState(false);
  const [slackMsg, setSlackMsg]   = useState('');
  const [error, setError]         = useState('');
  const router  = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      // 管理者チェック
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login-epis'); return; }
      const role = await getUserRole(user.id);
      if (role !== 'admin') { router.replace('/weekly'); return; }

      // ユーザー一覧取得
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) { setError('ユーザー取得に失敗しました。'); }
      else        { setUsers(data ?? []); }
      setLoading(false);
    })();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login-epis');
  }

  async function handleSlackSend() {
    setSlackSending(true);
    setSlackMsg('');
    try {
      const cronSecret = prompt('CRON_SECRET を入力してください：');
      if (!cronSecret) { setSlackSending(false); return; }

      const res = await fetch('/api/cron/daily-report', {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSlackMsg(`✅ 送信完了（${data.studentsReported}名分）`);
      } else {
        setSlackMsg(`❌ ${data.error}`);
      }
    } catch {
      setSlackMsg('❌ 送信に失敗しました。');
    } finally {
      setSlackSending(false);
    }
  }

  const roleLabel: Record<string, string> = {
    student: '生徒',
    parent:  '保護者',
    admin:   '管理者',
  };

  const roleBadgeColor: Record<string, string> = {
    student: '#e8f4fd',
    parent:  '#fef3e8',
    admin:   '#edfaf1',
  };

  const roleTextColor: Record<string, string> = {
    student: '#0075de',
    parent:  '#e67e22',
    admin:   '#27ae60',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f5f4' }}>
        <p style={{ color: '#a39e98' }}>読み込み中...</p>
      </div>
    );
  }

  const students = users.filter(u => u.role === 'student');
  const parents  = users.filter(u => u.role === 'parent');
  const admins   = users.filter(u => u.role === 'admin');

  return (
    <div style={{ minHeight: '100vh', background: '#f6f5f4', padding: '24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" fill="#0075de" />
              <rect x="7" y="8" width="10" height="1.5" rx="0.75" fill="white" />
              <rect x="7" y="11" width="7"  height="1.5" rx="0.75" fill="white" />
              <rect x="7" y="14" width="8"  height="1.5" rx="0.75" fill="white" />
            </svg>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(0,0,0,0.95)' }}>管理者ダッシュボード</div>
              <div style={{ fontSize: '12px', color: '#a39e98' }}>週間学習記録アプリ</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)',
              background: '#ffffff', fontSize: '13px', color: '#615d59',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <LogOut size={14} /> ログアウト
          </button>
        </div>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#c0392b' }}>
            {error}
          </div>
        )}

        {/* サマリーカード */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: '生徒',   count: students.length, color: '#0075de' },
            { label: '保護者', count: parents.length,  color: '#e67e22' },
            { label: '管理者', count: admins.length,   color: '#27ae60' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color }}>{count}</div>
              <div style={{ fontSize: '13px', color: '#615d59', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Slack日報手動送信 */}
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>Slack日報を今すぐ送信</div>
              <div style={{ fontSize: '12px', color: '#a39e98', marginTop: '2px' }}>通常は毎日21:00に自動送信されます</div>
            </div>
            <button
              onClick={handleSlackSend}
              disabled={slackSending}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '6px', border: 'none',
                background: slackSending ? '#a39e98' : '#4a154b',
                color: '#ffffff', fontSize: '13px', fontWeight: 600,
                cursor: slackSending ? 'default' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {slackSending ? <><RefreshCw size={14} /> 送信中...</> : <><Send size={14} /> 送信</>}
            </button>
          </div>
          {slackMsg && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: slackMsg.startsWith('✅') ? '#27ae60' : '#c0392b' }}>
              {slackMsg}
            </div>
          )}
        </div>

        {/* ユーザー一覧 */}
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <Users size={16} color="#615d59" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>
              登録ユーザー一覧（{users.length}名）
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f9f8f7' }}>
                  {['名前', '役割', '紐付け先生徒ID', '登録日'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#615d59', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'rgba(0,0,0,0.85)' }}>
                      {u.name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                        fontSize: '12px', fontWeight: 600,
                        background: roleBadgeColor[u.role] ?? '#f0f0f0',
                        color: roleTextColor[u.role] ?? '#333',
                      }}>
                        {roleLabel[u.role] ?? u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#a39e98', fontFamily: 'monospace', fontSize: '11px' }}>
                      {u.linked_student_id
                        ? u.linked_student_id.slice(0, 8) + '...'
                        : <span style={{ color: '#dddddd' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#a39e98', whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleDateString('ja-JP')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
