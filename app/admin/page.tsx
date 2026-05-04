'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getUserRole } from '@/lib/db';
import Link from 'next/link';
import { LogOut, Users, Send, RefreshCw, Trophy, UserPlus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import PushNotificationButton from '@/app/components/PushNotificationButton';

type UserRow = {
  id:                string;
  name:              string;
  role:              string;
  linked_student_id: string | null;
  created_at:        string;
};

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #dddddd', borderRadius: '6px',
  padding: '8px 12px', fontSize: '14px', color: 'rgba(0,0,0,0.9)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  background: '#ffffff',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 500,
  color: '#615d59', marginBottom: '5px',
};

export default function AdminPage() {
  const [users, setUsers]         = useState<UserRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [slackSending, setSlackSending] = useState(false);
  const [slackMsg, setSlackMsg]   = useState('');
  const [error, setError]         = useState('');

  // デモアカウント作成フォーム
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [demoUserId,   setDemoUserId]   = useState('');
  const [demoPassword, setDemoPassword] = useState('');
  const [demoRole,     setDemoRole]     = useState<'student' | 'parent'>('student');
  const [demoName,     setDemoName]     = useState('');
  const [creating,     setCreating]     = useState(false);
  const [createMsg,    setCreateMsg]    = useState('');

  const router  = useRouter();
  const supabase = createClient();

  async function loadUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { setError('ユーザー取得に失敗しました。'); }
    else        { setUsers(data ?? []); }
  }

  useEffect(() => {
    (async () => {
      // 管理者チェック
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login-epis'); return; }
      const role = await getUserRole(user.id);
      if (role !== 'admin') { router.replace('/weekly'); return; }

      await loadUsers();
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

  async function handleCreateDemoUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg('');
    try {
      const res = await fetch('/api/admin/create-demo-user', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          userId:   demoUserId.trim(),
          password: demoPassword,
          role:     demoRole,
          name:     demoName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateMsg(`✅ 作成完了：${data.name || data.userId}（${demoRole === 'student' ? '生徒' : '保護者'}）　ID: ${data.userId}`);
        setDemoUserId('');
        setDemoPassword('');
        setDemoName('');
        // 一覧を再取得
        await loadUsers();
      } else {
        setCreateMsg(`❌ ${data.error}`);
      }
    } catch {
      setCreateMsg('❌ 作成に失敗しました。');
    } finally {
      setCreating(false);
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

        {/* ランキング・通知 */}
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)', padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={16} color="#F59E0B" />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>学習ランキング</div>
                <div style={{ fontSize: '12px', color: '#a39e98', marginTop: '2px' }}>生徒の学習時間ランキングを確認できます</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <PushNotificationButton />
              <Link
                href="/ranking"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px',
                  background: '#F59E0B', color: '#ffffff',
                  fontSize: '13px', fontWeight: 600, textDecoration: 'none',
                }}
              >
                <Trophy size={14} /> ランキングを見る
              </Link>
            </div>
          </div>
        </div>

        {/* Slack日報手動送信 */}
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)', padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>Slack日報を今すぐ送信</div>
              <div style={{ fontSize: '12px', color: '#a39e98', marginTop: '2px' }}>通常は毎朝7:00に自動送信されます</div>
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

        {/* デモアカウント作成 */}
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)', marginBottom: '20px', overflow: 'hidden' }}>
          {/* アコーディオンヘッダー */}
          <button
            onClick={() => { setShowCreateForm(v => !v); setCreateMsg(''); }}
            style={{
              width: '100%', padding: '18px 20px', border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={16} color="#615d59" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>デモアカウントを作成</div>
                <div style={{ fontSize: '12px', color: '#a39e98', marginTop: '2px' }}>エピスIDに依存しないデモ用ログインアカウントを発行します</div>
              </div>
            </div>
            {showCreateForm
              ? <ChevronUp size={16} color="#a39e98" />
              : <ChevronDown size={16} color="#a39e98" />
            }
          </button>

          {/* フォーム本体 */}
          {showCreateForm && (
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <form onSubmit={handleCreateDemoUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>ユーザーID <span style={{ color: '#c0392b' }}>*</span></label>
                    <input
                      type="text"
                      value={demoUserId}
                      onChange={e => setDemoUserId(e.target.value)}
                      required
                      placeholder="例：demo01"
                      pattern="[a-zA-Z0-9]+"
                      title="アルファベットと数字のみ"
                      style={inputStyle}
                    />
                    <div style={{ fontSize: '11px', color: '#a39e98', marginTop: '4px' }}>アルファベット・数字のみ</div>
                  </div>
                  <div>
                    <label style={labelStyle}>パスワード <span style={{ color: '#c0392b' }}>*</span></label>
                    <input
                      type="text"
                      value={demoPassword}
                      onChange={e => setDemoPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="6文字以上"
                      style={inputStyle}
                    />
                    <div style={{ fontSize: '11px', color: '#a39e98', marginTop: '4px' }}>ログイン時に使用するパスワード</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>表示名</label>
                    <input
                      type="text"
                      value={demoName}
                      onChange={e => setDemoName(e.target.value)}
                      placeholder="例：デモ生徒A"
                      style={inputStyle}
                    />
                    <div style={{ fontSize: '11px', color: '#a39e98', marginTop: '4px' }}>省略時はセットアップ画面で設定</div>
                  </div>
                  <div>
                    <label style={labelStyle}>役割 <span style={{ color: '#c0392b' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                      {(['student', 'parent'] as const).map(r => (
                        <label key={r} style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '7px 14px', borderRadius: '6px', cursor: 'pointer',
                          border: `1px solid ${demoRole === r ? '#0075de' : '#dddddd'}`,
                          background: demoRole === r ? '#e8f4fd' : '#ffffff',
                          fontSize: '13px', fontWeight: demoRole === r ? 600 : 400,
                          color: demoRole === r ? '#0075de' : '#615d59',
                          flex: 1, justifyContent: 'center',
                        }}>
                          <input
                            type="radio"
                            name="demoRole"
                            value={r}
                            checked={demoRole === r}
                            onChange={() => setDemoRole(r)}
                            style={{ display: 'none' }}
                          />
                          {r === 'student' ? '生徒' : '保護者'}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '10px 20px', borderRadius: '6px', border: 'none',
                    background: creating ? '#a39e98' : '#0075de', color: '#ffffff',
                    fontSize: '14px', fontWeight: 600,
                    cursor: creating ? 'default' : 'pointer', fontFamily: 'inherit',
                    alignSelf: 'flex-start',
                  }}
                >
                  {creating
                    ? <><Loader2 size={14} className="animate-spin" /> 作成中...</>
                    : <><UserPlus size={14} /> アカウントを作成</>
                  }
                </button>

                {createMsg && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '6px', fontSize: '13px',
                    background: createMsg.startsWith('✅') ? '#edfaf1' : '#fff5f5',
                    color:      createMsg.startsWith('✅') ? '#27ae60' : '#c0392b',
                    border: `1px solid ${createMsg.startsWith('✅') ? 'rgba(39,174,96,0.2)' : 'rgba(220,38,38,0.15)'}`,
                  }}>
                    {createMsg}
                  </div>
                )}
              </form>
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
                      {u.role === 'student' ? (
                        <Link
                          href={`/admin/students/${u.id}`}
                          style={{
                            color: '#0075de', textDecoration: 'none', fontWeight: 600,
                            borderBottom: '1px solid rgba(0,117,222,0.3)',
                          }}
                        >
                          {u.name || '（未設定）'}
                        </Link>
                      ) : (
                        u.name || '（未設定）'
                      )}
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
