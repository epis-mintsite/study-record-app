'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Trash2, Loader2, ChevronDown } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/lib/useAuth';
import {
  TestResult, TestScore, TestType,
  TEST_TYPE_NAMES, TEST_TYPE_COLORS,
  STANDARD_CATEGORIES,
} from '@/lib/types';
import { getTestResults, saveTestResult, deleteTestResult } from '@/lib/db';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

const TEST_TYPES: TestType[] = ['日本人学校', 'epis', '模試', '検定', 'その他'];

const CHART_COLORS: Record<string, string> = {
  '国語': '#C084FC', '数学': '#38BDF8', '英語': '#F472B6', '理科': '#4ADE80', '社会': '#FB923C',
};

type ScoreRow = { subject: string; score: string; maxScore: string };
type CertRow  = { grade: string; passed: string; score: string; maxScore: string };

const DEFAULT_ROWS: ScoreRow[] = STANDARD_CATEGORIES
  .filter(c => c !== 'その他')
  .map(s => ({ subject: s, score: '', maxScore: '100' }));

function pct(score?: number, max?: number): number | null {
  if (score == null || !max) return null;
  return Math.round((score / max) * 100);
}

// ---- styles ----
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 500, color: '#615d59', marginBottom: '6px',
};
const inp: React.CSSProperties = {
  width: '100%', border: '1px solid #d1d5db', borderRadius: '6px',
  padding: '8px 10px', fontSize: '14px', color: 'rgba(0,0,0,0.9)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
const card: React.CSSProperties = {
  background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: '12px', padding: '20px',
  boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px',
};

export default function TestsPage() {
  const { user, loading: authLoading } = useAuth();
  const isDemo = !user;

  const [results, setResults]       = useState<TestResult[]>([]);
  const [loading, setLoading]       = useState(false);
  const [filter, setFilter]         = useState<TestType | 'すべて'>('すべて');
  const [showModal, setShowModal]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // form
  const [fType,  setFType]  = useState<TestType>('日本人学校');
  const [fName,  setFName]  = useState('中間テスト');
  const [fDate,  setFDate]  = useState(() => new Date().toISOString().slice(0, 10));
  const [rows,   setRows]   = useState<ScoreRow[]>(DEFAULT_ROWS.map(r => ({ ...r })));
  const [cert,   setCert]   = useState<CertRow>({ grade: '', passed: 'pass', score: '', maxScore: '' });
  const [fNotes, setFNotes] = useState('');

  const load = useCallback(async () => {
    if (isDemo || !user) return;
    setLoading(true);
    try { setResults(await getTestResults(user.id)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, isDemo]);

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  function handleTypeChange(t: TestType) {
    setFType(t);
    const names = TEST_TYPE_NAMES[t];
    setFName(names.length ? names[0] : '');
    if (t !== '検定') setRows(DEFAULT_ROWS.map(r => ({ ...r })));
  }

  function resetForm() {
    setFType('日本人学校'); setFName('中間テスト');
    setFDate(new Date().toISOString().slice(0, 10));
    setRows(DEFAULT_ROWS.map(r => ({ ...r })));
    setCert({ grade: '', passed: 'pass', score: '', maxScore: '' });
    setFNotes('');
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      let scores: TestScore[];
      if (fType === '検定') {
        scores = [{
          subject: fName,
          grade:   cert.grade || undefined,
          passed:  cert.passed === 'pass' ? true : cert.passed === 'fail' ? false : undefined,
          score:   cert.score   ? Number(cert.score)   : undefined,
          maxScore:cert.maxScore? Number(cert.maxScore) : undefined,
        }];
      } else {
        scores = rows
          .filter(r => r.subject && r.score !== '')
          .map(r => ({ subject: r.subject, score: Number(r.score), maxScore: Number(r.maxScore) || 100 }));
      }
      await saveTestResult(user.id, { date: fDate, testType: fType, testName: fName, scores, notes: fNotes || undefined });
      await load();
      setShowModal(false);
      resetForm();
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`「${name}」を削除しますか？`)) return;
    setDeletingId(id);
    try {
      await deleteTestResult(id);
      setResults(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : '削除に失敗しました。');
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = filter === 'すべて' ? results : results.filter(r => r.testType === filter);

  // chart
  const chartSubjects = Array.from(new Set(
    results.flatMap(r => r.scores.map(s => s.subject)).filter(s => CHART_COLORS[s])
  ));
  const chartData = results
    .slice().reverse()
    .filter(r => r.scores.some(s => s.score != null && s.maxScore != null))
    .map(r => {
      const entry: Record<string, string | number> = {
        name: `${r.date.slice(5, 7)}/${r.date.slice(8, 10)} ${r.testName}`,
      };
      for (const s of r.scores) {
        const p = pct(s.score, s.maxScore);
        if (p != null) entry[s.subject] = p;
      }
      return entry;
    });

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} color="#a39e98" className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', width: '100%', padding: '32px 24px 64px' }}>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.625px', margin: 0 }}>
            成績・テスト結果
          </h1>
          {!isDemo && (
            <button
              onClick={() => setShowModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#0075de', fontSize: '14px', fontWeight: 600, color: '#ffffff', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <Plus size={14} /> 追加
            </button>
          )}
        </div>

        {isDemo && (
          <div style={{ background: '#f6f5f4', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '10px 16px', marginBottom: '20px', fontSize: '13px', color: '#615d59' }}>
            デモモードで表示中。データを登録するには <a href="/login" style={{ color: '#0075de', fontWeight: 600, textDecoration: 'none' }}>ログイン</a> してください。
          </div>
        )}

        {/* filter tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {(['すべて', ...TEST_TYPES] as const).map(t => {
            const active = filter === t;
            const col = t !== 'すべて' ? TEST_TYPE_COLORS[t] : null;
            return (
              <button key={t} onClick={() => setFilter(t)} style={{
                padding: '5px 14px', borderRadius: '9999px', fontSize: '13px',
                fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
                border: active ? 'none' : '1px solid rgba(0,0,0,0.12)',
                background: active ? (col?.bg ?? '#0075de') : 'transparent',
                color: active ? (col?.text ?? '#ffffff') : '#615d59',
                transition: 'all 0.1s',
              }}>{t}</button>
            );
          })}
        </div>

        {/* chart */}
        {chartData.length > 1 && chartSubjects.length > 0 && (
          <div style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.9)', margin: '0 0 16px' }}>
              得点推移 <span style={{ fontSize: '11px', fontWeight: 400, color: '#a39e98' }}>（%）</span>
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a39e98', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#a39e98', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '12px', fontFamily: 'inherit' }} formatter={(v) => [`${v}%`]} />
                <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'inherit', color: '#615d59' }} />
                {chartSubjects.map(s => (
                  <Line key={s} type="monotone" dataKey={s} stroke={CHART_COLORS[s]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#a39e98', gap: '10px' }}>
            <Loader2 size={20} className="animate-spin" />
            <span style={{ fontSize: '14px' }}>読み込み中...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#a39e98', fontSize: '14px' }}>
            {isDemo ? 'ログインしてテスト結果を登録しましょう。' : 'テスト結果がありません。「追加」から登録してください。'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(r => {
              const tc = TEST_TYPE_COLORS[r.testType];
              const numScores = r.scores.filter(s => s.score != null && s.maxScore != null);
              const total    = numScores.reduce((sum, s) => sum + (s.score ?? 0), 0);
              const totalMax = numScores.reduce((sum, s) => sum + (s.maxScore ?? 0), 0);
              return (
                <div key={r.id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: tc.bg, color: tc.text }}>
                          {r.testType}
                        </span>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(0,0,0,0.9)' }}>{r.testName}</span>
                        <span style={{ fontSize: '12px', color: '#a39e98' }}>{r.date.replace(/-/g, '/')}</span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {r.scores.map((s, i) => {
                          const p = pct(s.score, s.maxScore);
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '12px', color: '#615d59', fontWeight: 500 }}>{s.subject}</span>
                              {s.grade && (
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(0,0,0,0.85)' }}>{s.grade}</span>
                              )}
                              {s.passed != null && (
                                <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '4px', background: s.passed ? '#D1FAE5' : '#FEE2E2', color: s.passed ? '#065F46' : '#991B1B' }}>
                                  {s.passed ? '合格' : '不合格'}
                                </span>
                              )}
                              {s.score != null && s.maxScore != null && (
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>
                                  {s.score}<span style={{ color: '#a39e98', fontWeight: 400 }}>/{s.maxScore}</span>
                                </span>
                              )}
                              {p != null && (
                                <span style={{ fontSize: '11px', color: '#a39e98' }}>({p}%)</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {numScores.length > 1 && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#615d59' }}>
                          合計 <strong style={{ color: 'rgba(0,0,0,0.9)' }}>{total}</strong>
                          <span style={{ color: '#a39e98' }}>/{totalMax}</span>
                          <span style={{ color: '#a39e98', marginLeft: '4px' }}>({Math.round(total / totalMax * 100)}%)</span>
                        </div>
                      )}
                      {r.notes && (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#615d59' }}>{r.notes}</div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(r.id, r.testName)}
                      disabled={deletingId === r.id}
                      style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#a39e98', borderRadius: '4px' }}
                    >
                      {deletingId === r.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ---- Add Modal ---- */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '480px', margin: 'auto', border: '1px solid rgba(0,0,0,0.1)', boxShadow: 'rgba(0,0,0,0.05) 0px 23px 52px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', margin: 0 }}>テスト結果を追加</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a39e98' }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* test type */}
              <div>
                <label style={lbl}>テスト種別</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {TEST_TYPES.map(t => {
                    const active = fType === t;
                    const col = TEST_TYPE_COLORS[t];
                    return (
                      <button key={t} onClick={() => handleTypeChange(t)} style={{
                        padding: '5px 12px', borderRadius: '9999px', fontSize: '13px',
                        fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
                        border: active ? 'none' : '1px solid rgba(0,0,0,0.15)',
                        background: active ? col.bg : 'transparent',
                        color: active ? col.text : '#615d59',
                        transition: 'all 0.1s',
                      }}>{t}</button>
                    );
                  })}
                </div>
              </div>

              {/* test name */}
              <div>
                <label style={lbl}>テスト名</label>
                {TEST_TYPE_NAMES[fType].length > 0 ? (
                  <div style={{ position: 'relative' }}>
                    <select
                      value={fName}
                      onChange={e => setFName(e.target.value)}
                      style={{ ...inp, appearance: 'none', WebkitAppearance: 'none', paddingRight: '32px' } as React.CSSProperties}
                    >
                      {TEST_TYPE_NAMES[fType].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#a39e98', pointerEvents: 'none' }} />
                  </div>
                ) : (
                  <input
                    type="text" value={fName} onChange={e => setFName(e.target.value)}
                    placeholder={fType === '模試' ? '例：全統模試' : 'テスト名を入力'}
                    style={inp}
                  />
                )}
              </div>

              {/* date */}
              <div>
                <label style={lbl}>実施日</label>
                <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={inp} />
              </div>

              {/* scores */}
              {fType === '検定' ? (
                <div>
                  <label style={lbl}>結果</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ ...lbl, marginBottom: '4px' }}>級・レベル（任意）</label>
                      <input type="text" value={cert.grade} onChange={e => setCert(p => ({ ...p, grade: e.target.value }))}
                        placeholder="例：2級、N2、Band 6" style={inp} />
                    </div>
                    <div>
                      <label style={{ ...lbl, marginBottom: '6px' }}>合否</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {([['pass', '合格'], ['fail', '不合格'], ['', '未判定']] as [string, string][]).map(([v, label]) => (
                          <button key={v} onClick={() => setCert(p => ({ ...p, passed: v }))} style={{
                            padding: '6px 14px', borderRadius: '4px', fontSize: '13px', fontWeight: cert.passed === v ? 600 : 400,
                            cursor: 'pointer', fontFamily: 'inherit',
                            border: cert.passed === v ? 'none' : '1px solid rgba(0,0,0,0.15)',
                            background: cert.passed === v
                              ? (v === 'pass' ? '#D1FAE5' : v === 'fail' ? '#FEE2E2' : '#F3F4F6')
                              : 'transparent',
                            color: cert.passed === v
                              ? (v === 'pass' ? '#065F46' : v === 'fail' ? '#991B1B' : '#374151')
                              : '#615d59',
                          }}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ ...lbl, marginBottom: '4px' }}>スコア（任意）</label>
                        <input type="number" value={cert.score} onChange={e => setCert(p => ({ ...p, score: e.target.value }))}
                          placeholder="例：1850" style={inp} />
                      </div>
                      <div>
                        <label style={{ ...lbl, marginBottom: '4px' }}>満点（任意）</label>
                        <input type="number" value={cert.maxScore} onChange={e => setCert(p => ({ ...p, maxScore: e.target.value }))}
                          placeholder="例：2250" style={inp} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label style={lbl}>得点</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 28px', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#a39e98', padding: '0 2px' }}>科目</span>
                      <span style={{ fontSize: '11px', color: '#a39e98', textAlign: 'center' }}>得点</span>
                      <span style={{ fontSize: '11px', color: '#a39e98', textAlign: 'center' }}>満点</span>
                      <span />
                    </div>
                    {rows.map((row, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 28px', gap: '6px', alignItems: 'center' }}>
                        <input type="text" value={row.subject}
                          onChange={e => setRows(p => p.map((r, j) => j === i ? { ...r, subject: e.target.value } : r))}
                          placeholder="科目名" style={{ ...inp, fontSize: '13px' }} />
                        <input type="number" value={row.score}
                          onChange={e => setRows(p => p.map((r, j) => j === i ? { ...r, score: e.target.value } : r))}
                          placeholder="点" style={{ ...inp, fontSize: '13px', textAlign: 'center' }} />
                        <input type="number" value={row.maxScore}
                          onChange={e => setRows(p => p.map((r, j) => j === i ? { ...r, maxScore: e.target.value } : r))}
                          placeholder="満点" style={{ ...inp, fontSize: '13px', textAlign: 'center' }} />
                        <button onClick={() => setRows(p => p.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a39e98', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setRows(p => [...p, { subject: '', score: '', maxScore: '100' }])}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '4px', border: '1px dashed rgba(0,0,0,0.2)', background: 'transparent', fontSize: '12px', color: '#615d59', cursor: 'pointer', fontFamily: 'inherit', width: 'fit-content' }}
                    >
                      <Plus size={12} /> 科目を追加
                    </button>
                  </div>
                </div>
              )}

              {/* notes */}
              <div>
                <label style={lbl}>メモ（任意）</label>
                <textarea
                  value={fNotes} onChange={e => setFNotes(e.target.value)}
                  placeholder="例：数学の計算ミスが多かった"
                  rows={2}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px', padding: '9px 16px', fontSize: '14px', fontWeight: 500, color: '#615d59', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                キャンセル
              </button>
              <button onClick={handleSave} disabled={saving || !fName} style={{ flex: 1, border: 'none', borderRadius: '4px', padding: '9px 16px', fontSize: '14px', fontWeight: 600, color: '#ffffff', background: '#0075de', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: saving || !fName ? 0.7 : 1 }}>
                {saving ? <><Loader2 size={14} className="animate-spin" />保存中</> : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
