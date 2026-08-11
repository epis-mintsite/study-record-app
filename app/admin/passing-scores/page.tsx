'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Trash2, Plus } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/lib/useAuth';
import { getUserRole, getPassingScores } from '@/lib/db';
import { SchoolPassingScore, ExamCategory, EXAM_CATEGORIES, STANDARD_CATEGORIES } from '@/lib/types';

const CATEGORY_COLORS: Record<ExamCategory, { bg: string; text: string }> = {
  '一般': { bg: '#DBEAFE', text: '#1D4ED8' },
  '帰国': { bg: '#EDE9FE', text: '#5B21B6' },
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 500, color: '#615d59', marginBottom: '6px',
};
const inp: React.CSSProperties = {
  width: '100%', border: '1px solid #d1d5db', borderRadius: '6px',
  padding: '8px 10px', fontSize: '14px', color: 'rgba(0,0,0,0.9)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
const cardStyle: React.CSSProperties = {
  background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: '12px', padding: '24px',
  boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px',
};

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export default function AdminPassingScoresPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [scores, setScores] = useState<SchoolPassingScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [fSchool, setFSchool] = useState('');
  const [fCategory, setFCategory] = useState<ExamCategory>('一般');
  const [fYear, setFYear] = useState(() => new Date().getFullYear());
  const [fSubject, setFSubject] = useState<string>(STANDARD_CATEGORIES[0]);
  const [fPassing, setFPassing] = useState('');
  const [fMax, setFMax] = useState('100');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    getUserRole(user.id).then(role => {
      if (role !== 'admin') { router.replace('/weekly'); return; }
      setReady(true);
    });
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setScores(await getPassingScores()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  async function handleSave() {
    if (!fSchool.trim() || !fPassing) return;
    setSaving(true);
    setError('');
    const { ok, data } = await api('/api/admin/passing-scores', 'POST', {
      schoolName: fSchool.trim(),
      examCategory: fCategory,
      examYear: fYear,
      subject: fSubject,
      passingScore: Number(fPassing),
      maxScore: fMax ? Number(fMax) : undefined,
    });
    setSaving(false);
    if (!ok) { setError(data.error ?? '保存に失敗しました'); return; }
    setFPassing('');
    await load();
  }

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`「${label}」を削除しますか？`)) return;
    setDeletingId(id);
    const { ok, data } = await api(`/api/admin/passing-scores/${id}`, 'DELETE');
    setDeletingId(null);
    if (!ok) { setError(data.error ?? '削除に失敗しました'); return; }
    setScores(prev => prev.filter(s => s.id !== id));
  }

  // schoolName -> category -> year でグルーピング
  const grouped = scores.reduce<Record<string, SchoolPassingScore[]>>((acc, s) => {
    const key = `${s.schoolName}__${s.examCategory}__${s.examYear}`;
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  if (authLoading || !ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
      <Loader2 size={24} color="#a39e98" className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', width: '100%', padding: '32px 24px 64px' }}>

        <div style={{ marginBottom: '28px' }}>
          <button
            onClick={() => router.push('/admin')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#615d59', fontFamily: 'inherit', padding: 0, marginBottom: '12px' }}
          >
            <ChevronLeft size={16} />
            管理者ダッシュボードに戻る
          </button>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.625px', margin: 0 }}>
            合格最低点（参考）の管理
          </h1>
          <p style={{ fontSize: '13px', color: '#a39e98', margin: '8px 0 0' }}>
            学校×入試区分×年度×科目ごとに合格最低点の参考値を登録します。生徒・保護者の過去問演習画面に表示されます。
          </p>
        </div>

        {error && (
          <div style={{ background: '#FFF5F5', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#C0392B' }}>
            {error}
          </div>
        )}

        {/* 登録フォーム */}
        <div style={{ ...cardStyle, marginBottom: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.9)', margin: '0 0 16px' }}>登録・更新</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={lbl}>高校名</label>
              <input type="text" value={fSchool} onChange={e => setFSchool(e.target.value)} placeholder="例：〇〇高等学校" style={inp} />
            </div>
            <div>
              <label style={lbl}>入試区分</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {EXAM_CATEGORIES.map(c => {
                  const active = fCategory === c;
                  const cc = CATEGORY_COLORS[c];
                  return (
                    <button key={c} onClick={() => setFCategory(c)} style={{
                      padding: '7px 16px', borderRadius: '6px', fontSize: '13px', flex: 1,
                      fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
                      border: active ? 'none' : '1px solid rgba(0,0,0,0.15)',
                      background: active ? cc.bg : 'transparent',
                      color: active ? cc.text : '#615d59',
                    }}>{c}</button>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={lbl}>年度</label>
              <input type="number" value={fYear} onChange={e => setFYear(Number(e.target.value))} style={inp} />
            </div>
            <div>
              <label style={lbl}>科目</label>
              <select value={fSubject} onChange={e => setFSubject(e.target.value)} style={inp}>
                {STANDARD_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>合格最低点</label>
              <input type="number" value={fPassing} onChange={e => setFPassing(e.target.value)} placeholder="例：65" style={inp} />
            </div>
            <div>
              <label style={lbl}>満点（任意）</label>
              <input type="number" value={fMax} onChange={e => setFMax(e.target.value)} placeholder="例：100" style={inp} />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !fSchool.trim() || !fPassing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', borderRadius: '6px', border: 'none', background: '#0075de', fontSize: '14px', fontWeight: 600, color: '#ffffff', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving || !fSchool.trim() || !fPassing ? 0.7 : 1 }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            登録・更新
          </button>
          <p style={{ fontSize: '11px', color: '#a39e98', margin: '8px 0 0' }}>
            同じ学校・入試区分・年度・科目で既に登録済みの場合は上書きされます。
          </p>
        </div>

        {/* 一覧 */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#a39e98', gap: '10px' }}>
            <Loader2 size={20} className="animate-spin" />
            <span style={{ fontSize: '14px' }}>読み込み中...</span>
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#a39e98', fontSize: '14px' }}>
            まだ登録されていません。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(grouped).map(([key, items]) => {
              const [schoolName, category, year] = key.split('__');
              const cc = CATEGORY_COLORS[category as ExamCategory];
              return (
                <div key={key} style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: cc.bg, color: cc.text }}>
                      {category}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(0,0,0,0.9)' }}>{schoolName}</span>
                    <span style={{ fontSize: '12px', color: '#a39e98' }}>{year}年度</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {items.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '6px', background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <span style={{ fontSize: '12px', color: '#615d59', fontWeight: 500 }}>{s.subject}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>
                          {s.passingScore}{s.maxScore != null && <span style={{ color: '#a39e98', fontWeight: 400 }}>/{s.maxScore}</span>}
                        </span>
                        <button
                          onClick={() => handleDelete(s.id, `${schoolName} ${s.subject}`)}
                          disabled={deletingId === s.id}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#a39e98', display: 'flex', alignItems: 'center' }}
                        >
                          {deletingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
