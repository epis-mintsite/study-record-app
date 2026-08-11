'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Trash2, Loader2 } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/lib/useAuth';
import {
  PastExamRecord, PastExamScore, SchoolPassingScore,
  ExamCategory, EXAM_CATEGORIES, STANDARD_CATEGORIES,
} from '@/lib/types';
import { getPastExamRecords, savePastExamRecord, deletePastExamRecord, getPassingScores } from '@/lib/db';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';

const CHART_COLORS: Record<string, string> = {
  '国語': '#C084FC', '数学': '#38BDF8', '英語': '#F472B6', '理科': '#4ADE80', '社会': '#FB923C',
};

const CATEGORY_COLORS: Record<ExamCategory, { bg: string; text: string }> = {
  '一般': { bg: '#DBEAFE', text: '#1D4ED8' },
  '帰国': { bg: '#EDE9FE', text: '#5B21B6' },
};

type ScoreRow = { subject: string; score: string; maxScore: string };

const DEFAULT_ROWS: ScoreRow[] = STANDARD_CATEGORIES
  .filter(c => c !== 'その他')
  .map(s => ({ subject: s, score: '', maxScore: '100' }));

function pct(score?: number, max?: number): number | null {
  if (score == null || !max) return null;
  return Math.round((score / max) * 100);
}

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

export default function PastExamsPage() {
  const { user, loading: authLoading } = useAuth();
  const isDemo = !user;

  const [records, setRecords]         = useState<PastExamRecord[]>([]);
  const [passingScores, setPassingScores] = useState<SchoolPassingScore[]>([]);
  const [loading, setLoading]         = useState(false);
  const [schoolFilter, setSchoolFilter] = useState('すべて');
  const [showModal, setShowModal]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  // form
  const [fSchool,   setFSchool]   = useState('');
  const [fCategory, setFCategory] = useState<ExamCategory>('一般');
  const [fYear,     setFYear]     = useState(() => new Date().getFullYear());
  const [fDate,     setFDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [rows,      setRows]      = useState<ScoreRow[]>(DEFAULT_ROWS.map(r => ({ ...r })));
  const [fNotes,    setFNotes]    = useState('');

  const load = useCallback(async () => {
    if (isDemo || !user) return;
    setLoading(true);
    try {
      const [recs, scores] = await Promise.all([getPastExamRecords(user.id), getPassingScores()]);
      setRecords(recs);
      setPassingScores(scores);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, isDemo]);

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  function resetForm() {
    setFSchool(''); setFCategory('一般'); setFYear(new Date().getFullYear());
    setFDate(new Date().toISOString().slice(0, 10));
    setRows(DEFAULT_ROWS.map(r => ({ ...r })));
    setFNotes('');
  }

  async function handleSave() {
    if (!user || !fSchool.trim()) return;
    setSaving(true);
    try {
      const scores: PastExamScore[] = rows
        .filter(r => r.subject && r.score !== '')
        .map(r => ({ subject: r.subject, score: Number(r.score), maxScore: r.maxScore ? Number(r.maxScore) : undefined }));
      await savePastExamRecord(user.id, {
        schoolName: fSchool.trim(), examCategory: fCategory, examYear: fYear,
        attemptDate: fDate, scores, notes: fNotes || undefined,
      });
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
    if (!window.confirm(`「${name}」の記録を削除しますか？`)) return;
    setDeletingId(id);
    try {
      await deletePastExamRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : '削除に失敗しました。');
    } finally {
      setDeletingId(null);
    }
  }

  function findPassingScore(schoolName: string, category: ExamCategory, year: number, subject: string): SchoolPassingScore | undefined {
    return passingScores.find(p => p.schoolName === schoolName && p.examCategory === category && p.examYear === year && p.subject === subject);
  }

  const schoolNames = Array.from(new Set(records.map(r => r.schoolName)));
  const filtered = schoolFilter === 'すべて' ? records : records.filter(r => r.schoolName === schoolFilter);

  // chart: 特定の学校を選んでいるときだけ、得点率の推移＋合格最低点（直近年度・参考）を表示
  const chartRecords = schoolFilter === 'すべて' ? [] : records.filter(r => r.schoolName === schoolFilter).slice().reverse();
  const chartSubjects = Array.from(new Set(chartRecords.flatMap(r => r.scores.map(s => s.subject)).filter(s => CHART_COLORS[s])));
  const chartData = chartRecords
    .filter(r => r.scores.some(s => s.score != null && s.maxScore != null))
    .map(r => {
      const entry: Record<string, string | number> = {
        name: `${r.attemptDate.slice(5, 7)}/${r.attemptDate.slice(8, 10)} ${r.examYear}年度`,
      };
      for (const s of r.scores) {
        const p = pct(s.score, s.maxScore);
        if (p != null) entry[s.subject] = p;
      }
      return entry;
    });
  // 参考: 選択中の学校について、科目ごとに最も新しい年度の合格最低点(%)
  const referenceLines = schoolFilter === 'すべて' ? [] : chartSubjects
    .map(subject => {
      const candidates = passingScores.filter(p => p.schoolName === schoolFilter && p.subject === subject && p.maxScore);
      if (candidates.length === 0) return null;
      const latest = candidates.slice().sort((a, b) => b.examYear - a.examYear)[0];
      const p = pct(latest.passingScore, latest.maxScore);
      return p != null ? { subject, pct: p, year: latest.examYear } : null;
    })
    .filter((x): x is { subject: string; pct: number; year: number } => x != null);

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} color="#a39e98" className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', width: '100%', padding: '32px 24px 64px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.625px', margin: 0 }}>
            過去問演習
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
        <p style={{ fontSize: '13px', color: '#a39e98', margin: '0 0 20px' }}>
          志望校の過去問を解いた記録です。合格最低点は目安として表示される参考値で、正式な発表とは異なる場合があります。
        </p>

        {isDemo && (
          <div style={{ background: '#f6f5f4', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '10px 16px', marginBottom: '20px', fontSize: '13px', color: '#615d59' }}>
            デモモードで表示中。データを登録するには <a href="/login" style={{ color: '#0075de', fontWeight: 600, textDecoration: 'none' }}>ログイン</a> してください。
          </div>
        )}

        {/* school filter */}
        {schoolNames.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {(['すべて', ...schoolNames]).map(s => {
              const active = schoolFilter === s;
              return (
                <button key={s} onClick={() => setSchoolFilter(s)} style={{
                  padding: '5px 14px', borderRadius: '9999px', fontSize: '13px',
                  fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
                  border: active ? 'none' : '1px solid rgba(0,0,0,0.12)',
                  background: active ? '#0075de' : 'transparent',
                  color: active ? '#ffffff' : '#615d59',
                }}>{s}</button>
              );
            })}
          </div>
        )}

        {/* chart */}
        {chartData.length > 1 && chartSubjects.length > 0 && (
          <div style={{ ...card, marginBottom: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.9)', margin: '0 0 4px' }}>
              得点率の推移 <span style={{ fontSize: '11px', fontWeight: 400, color: '#a39e98' }}>（%・{schoolFilter}）</span>
            </h2>
            {referenceLines.length > 0 && (
              <p style={{ fontSize: '11px', color: '#a39e98', margin: '0 0 12px' }}>
                点線: 直近年度（{referenceLines.map(r => r.year).sort((a, b) => b - a)[0]}年度）の合格最低点（参考）
              </p>
            )}
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a39e98', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#a39e98', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '12px', fontFamily: 'inherit' }} formatter={(v) => [`${v}%`]} />
                <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'inherit', color: '#615d59' }} />
                {chartSubjects.map(s => (
                  <Line key={s} type="monotone" dataKey={s} stroke={CHART_COLORS[s]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                ))}
                {referenceLines.map(r => (
                  <ReferenceLine key={r.subject} y={r.pct} stroke={CHART_COLORS[r.subject] ?? '#a39e98'} strokeDasharray="4 4" strokeWidth={1.5} />
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
            {isDemo ? 'ログインして過去問演習の記録を登録しましょう。' : '記録がありません。「追加」から登録してください。'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(r => {
              const cc = CATEGORY_COLORS[r.examCategory];
              const numScores = r.scores.filter(s => s.score != null && s.maxScore != null);
              const total    = numScores.reduce((sum, s) => sum + (s.score ?? 0), 0);
              const totalMax = numScores.reduce((sum, s) => sum + (s.maxScore ?? 0), 0);
              return (
                <div key={r.id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: cc.bg, color: cc.text }}>
                          {r.examCategory}
                        </span>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(0,0,0,0.9)' }}>{r.schoolName}</span>
                        <span style={{ fontSize: '12px', color: '#a39e98' }}>{r.examYear}年度・{r.attemptDate.replace(/-/g, '/')}実施</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {r.scores.map((s, i) => {
                          const p = pct(s.score, s.maxScore);
                          const ref = findPassingScore(r.schoolName, r.examCategory, r.examYear, s.subject);
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', color: '#615d59', fontWeight: 500, width: '32px' }}>{s.subject}</span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>
                                {s.score}{s.maxScore != null && <span style={{ color: '#a39e98', fontWeight: 400 }}>/{s.maxScore}</span>}
                              </span>
                              {p != null && <span style={{ fontSize: '11px', color: '#a39e98' }}>({p}%)</span>}
                              {ref && (
                                <span style={{
                                  fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '4px',
                                  background: s.score >= ref.passingScore ? '#D1FAE5' : '#FFF7ED',
                                  color: s.score >= ref.passingScore ? '#065F46' : '#9A5B00',
                                }}>
                                  合格最低点(参考) {ref.passingScore}{ref.maxScore != null ? `/${ref.maxScore}` : ''}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {numScores.length > 1 && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#615d59' }}>
                          合計 <strong style={{ color: 'rgba(0,0,0,0.9)' }}>{total}</strong>
                          {totalMax > 0 && <>
                            <span style={{ color: '#a39e98' }}>/{totalMax}</span>
                            <span style={{ color: '#a39e98', marginLeft: '4px' }}>({Math.round(total / totalMax * 100)}%)</span>
                          </>}
                        </div>
                      )}
                      {r.notes && (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#615d59' }}>{r.notes}</div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(r.id, `${r.schoolName} ${r.examYear}年度`)}
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
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', margin: 0 }}>過去問演習を追加</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a39e98' }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>高校名</label>
                <input type="text" value={fSchool} onChange={e => setFSchool(e.target.value)}
                  placeholder="例：〇〇高等学校" list="school-name-suggestions" style={inp} />
                <datalist id="school-name-suggestions">
                  {schoolNames.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div>
                <label style={lbl}>入試区分</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {EXAM_CATEGORIES.map(c => {
                    const active = fCategory === c;
                    const cc = CATEGORY_COLORS[c];
                    return (
                      <button key={c} onClick={() => setFCategory(c)} style={{
                        padding: '5px 16px', borderRadius: '9999px', fontSize: '13px',
                        fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
                        border: active ? 'none' : '1px solid rgba(0,0,0,0.15)',
                        background: active ? cc.bg : 'transparent',
                        color: active ? cc.text : '#615d59',
                      }}>{c}</button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={lbl}>年度</label>
                  <input type="number" value={fYear} onChange={e => setFYear(Number(e.target.value))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>実施日</label>
                  <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={inp} />
                </div>
              </div>

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

              <div>
                <label style={lbl}>メモ（任意）</label>
                <textarea
                  value={fNotes} onChange={e => setFNotes(e.target.value)}
                  placeholder="例：大問3の記述で時間が足りなかった"
                  rows={2}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px', padding: '9px 16px', fontSize: '14px', fontWeight: 500, color: '#615d59', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                キャンセル
              </button>
              <button onClick={handleSave} disabled={saving || !fSchool.trim()} style={{ flex: 1, border: 'none', borderRadius: '4px', padding: '9px 16px', fontSize: '14px', fontWeight: 600, color: '#ffffff', background: '#0075de', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: saving || !fSchool.trim() ? 0.7 : 1 }}>
                {saving ? <><Loader2 size={14} className="animate-spin" />保存中</> : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
