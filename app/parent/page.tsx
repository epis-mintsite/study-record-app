'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import WeeklyGrid from '@/app/components/WeeklyGrid';
import { getWeekDates, formatDate } from '@/lib/mockData';
import { StudyRecord, TestResult, WeeklyReview, TEST_TYPE_COLORS, PastExamRecord, SchoolPassingScore, ExamCategory } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { createClient } from '@/lib/supabase';
import {
  getUserRole, getLinkedStudentId, getStudentProfile,
  getStudyRecords, getTestResults, getWeeklyReview,
  getPastExamRecords, getPassingScores,
} from '@/lib/db';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const CHART_COLORS: Record<string, string> = {
  '国語': '#C084FC', '数学': '#38BDF8', '英語': '#F472B6',
  '理科': '#4ADE80', '社会': '#FB923C',
};

const CATEGORY_COLORS: Record<ExamCategory, { bg: string; text: string }> = {
  '一般': { bg: '#DBEAFE', text: '#1D4ED8' },
  '帰国': { bg: '#EDE9FE', text: '#5B21B6' },
};

function pct(score?: number, max?: number) {
  if (score == null || !max) return null;
  return Math.round((score / max) * 100);
}

function fmtTime(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}時間${m > 0 ? m + '分' : ''}` : `${m}分`;
}

export default function ParentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [roleChecked,  setRoleChecked]  = useState(false);
  const [studentId,    setStudentId]    = useState<string | null>(null);
  const [studentName,  setStudentName]  = useState<string>('');
  const [dataLoading,  setDataLoading]  = useState(false);

  // week nav
  const [referenceDate, setReferenceDate] = useState(new Date());
  const weekDates = getWeekDates(referenceDate);
  const weekStart = formatDate(weekDates[0]);
  const weekLabel = (() => {
    const s = weekDates[0], e = weekDates[6];
    return `${s.getFullYear()}年${s.getMonth() + 1}月${s.getDate()}日 〜 ${e.getMonth() + 1}月${e.getDate()}日`;
  })();

  // data
  const [weekRecords,  setWeekRecords]  = useState<StudyRecord[]>([]);
  const [testResults,  setTestResults]  = useState<TestResult[]>([]);
  const [review,       setReview]       = useState<WeeklyReview | null>(null);
  const [monthlyData,  setMonthlyData]  = useState<Record<string, string | number>[]>([]);
  const [pastExams,    setPastExams]    = useState<PastExamRecord[]>([]);
  const [passingScores, setPassingScores] = useState<SchoolPassingScore[]>([]);

  // tabs
  const [tab, setTab] = useState<'weekly' | 'tests' | 'past-exams' | 'review'>('weekly');

  // ---- Auth & role check ----
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    getUserRole(user.id).then(async role => {
      if (role !== 'parent') { router.replace('/weekly'); return; }
      const sid = await getLinkedStudentId(user.id);
      setStudentId(sid);
      if (sid) {
        const profile = await getStudentProfile(sid);
        setStudentName(profile?.name ?? '');
      }
      setRoleChecked(true);
    });
  }, [user, authLoading, router]);

  // ---- Load week data ----
  const loadWeekData = useCallback(async (sid: string, dates: Date[]) => {
    setDataLoading(true);
    try {
      const dateStrings = dates.map(formatDate);
      const records = await getStudyRecords(sid, dateStrings);
      setWeekRecords(records);
    } catch (e) { console.error(e); }
    finally { setDataLoading(false); }
  }, []);

  // ---- Load test results & review (once per student) ----
  const loadStaticData = useCallback(async (sid: string) => {
    try {
      const [tests, rev, exams, scores] = await Promise.all([
        getTestResults(sid),
        getWeeklyReview(sid, weekStart),
        getPastExamRecords(sid),
        getPassingScores(),
      ]);
      setTestResults(tests);
      setReview(rev);
      setPastExams(exams);
      setPassingScores(scores);
    } catch (e) { console.error(e); }
  }, [weekStart]);

  // ---- Load monthly chart data (last 4 weeks) ----
  const loadMonthlyData = useCallback(async (sid: string) => {
    try {
      const today = new Date();
      const allDates: string[] = [];
      for (let i = 27; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        allDates.push(formatDate(d));
      }
      const records = await getStudyRecords(sid, allDates);

      const weeks = [3, 2, 1, 0].map(wk => {
        const startIdx = wk * 7;
        const slice = allDates.slice(startIdx, startIdx + 7);
        const entry: Record<string, string | number> = { name: `第${4 - wk}週` };
        for (const r of records.filter(r => slice.includes(r.date))) {
          for (const [cat, min] of Object.entries(r.dailyTotals)) {
            entry[cat] = ((entry[cat] as number) || 0) + (min as number);
          }
        }
        return entry;
      });
      setMonthlyData(weeks);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (!roleChecked || !studentId) return;
    loadWeekData(studentId, weekDates);
    loadStaticData(studentId);
    loadMonthlyData(studentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleChecked, studentId, referenceDate]);

  // ---- Derived ----
  const chartSubjects = Array.from(new Set(
    monthlyData.flatMap(d => Object.keys(d).filter(k => k !== 'name' && CHART_COLORS[k]))
  ));

  // ---- Styles ----
  const cardStyle: React.CSSProperties = {
    background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)',
    borderRadius: '12px', padding: '24px',
    boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px',
  };
  const navBtn: React.CSSProperties = {
    width: '32px', height: '32px', borderRadius: '4px',
    border: '1px solid rgba(0,0,0,0.12)', background: '#ffffff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#615d59',
  };

  if (authLoading || !roleChecked) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
      <Loader2 size={24} color="#a39e98" className="animate-spin" />
    </div>
  );

  // No linked student
  if (!studentId) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <Navbar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>👨‍👧</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(0,0,0,0.9)', marginBottom: '10px' }}>
            お子さまのアカウントが紐付けされていません
          </div>
          <div style={{ fontSize: '13px', color: '#615d59', lineHeight: 1.75, marginBottom: '20px' }}>
            保護者アカウントの登録時に、お子さまのメールアドレスが正しく入力されていない可能性があります。
          </div>
          <div style={{
            background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '8px',
            padding: '16px', textAlign: 'left', fontSize: '13px', color: '#92400E', lineHeight: 1.75,
          }}>
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>解決方法</div>
            <ol style={{ margin: 0, paddingLeft: '18px' }}>
              <li>お子さまが先に生徒アカウントを作成していることを確認する</li>
              <li>一度ログアウトする</li>
              <li>新規登録で「保護者」を選び、お子さまのメールアドレスを正しく入力して再登録する</li>
            </ol>
          </div>
          <button
            onClick={() => { supabase.auth.signOut(); router.replace('/login'); }}
            style={{
              marginTop: '20px', padding: '9px 24px', borderRadius: '6px', border: 'none',
              background: '#7C3AED', color: '#ffffff', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ログアウトして再登録する
          </button>
        </div>
      </main>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '32px 24px 64px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '9999px', background: '#f2f9ff', fontSize: '12px', fontWeight: 600, color: '#097fe8', marginBottom: '8px' }}>
            閲覧専用
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.625px', margin: 0 }}>
            保護者ダッシュボード
            {studentName && (
              <span style={{ fontSize: '16px', fontWeight: 500, color: '#615d59', marginLeft: '12px' }}>
                {studentName} さん
              </span>
            )}
          </h1>
        </div>

        {/* Monthly chart */}
        <div style={{ ...cardStyle, marginBottom: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(0,0,0,0.95)', margin: '0 0 20px', letterSpacing: '-0.2px' }}>
            月間科目別学習時間
            <span style={{ fontSize: '12px', fontWeight: 400, color: '#a39e98', marginLeft: '8px' }}>（分）</span>
          </h2>
          {monthlyData.length === 0 ? (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a39e98', fontSize: '13px' }}>
              学習データがありません
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#615d59', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#a39e98', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '12px', fontFamily: 'inherit' }}
                  formatter={(v) => [`${v}分`]}
                />
                <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'inherit', color: '#615d59' }} />
                {(chartSubjects.length > 0 ? chartSubjects : Object.keys(CHART_COLORS)).map(cat => (
                  <Bar key={cat} dataKey={cat} fill={CHART_COLORS[cat] ?? '#ccc'} stackId="a" radius={[0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0' }}>
          {([['weekly', '週間表'], ['tests', '成績'], ['past-exams', '過去問'], ['review', '振返り']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '8px 20px', fontSize: '14px', fontWeight: tab === key ? 600 : 500,
              color: tab === key ? '#0075de' : '#615d59',
              background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              borderBottom: tab === key ? '2px solid #0075de' : '2px solid transparent',
              marginBottom: '-1px', transition: 'color 0.1s',
            }}>{label}</button>
          ))}
        </div>

        {/* Week nav (shared by weekly + review) */}
        {(tab === 'weekly' || tab === 'review') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <button onClick={() => { const d = new Date(referenceDate); d.setDate(d.getDate() - 7); setReferenceDate(d); }} style={navBtn} aria-label="前の週">
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.2px' }}>{weekLabel}</span>
            <button onClick={() => { const d = new Date(referenceDate); d.setDate(d.getDate() + 7); setReferenceDate(d); }} style={navBtn} aria-label="次の週">
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ---- 週間表タブ ---- */}
        {tab === 'weekly' && (
          dataLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#a39e98', gap: '10px' }}>
              <Loader2 size={20} className="animate-spin" />
              <span style={{ fontSize: '14px' }}>読み込み中...</span>
            </div>
          ) : (
            <WeeklyGrid weekDates={weekDates} records={weekRecords} customCategories={[]} />
          )
        )}

        {/* ---- 成績タブ ---- */}
        {tab === 'tests' && (
          <div>
            {testResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#a39e98', fontSize: '14px' }}>
                テスト結果がまだ登録されていません。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {testResults.slice(0, 10).map(r => {
                  const tc = TEST_TYPE_COLORS[r.testType];
                  const numScores = r.scores.filter(s => s.score != null && s.maxScore != null);
                  const total    = numScores.reduce((sum, s) => sum + (s.score ?? 0), 0);
                  const totalMax = numScores.reduce((sum, s) => sum + (s.maxScore ?? 0), 0);
                  return (
                    <div key={r.id} style={cardStyle}>
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
                              {s.grade && <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(0,0,0,0.85)' }}>{s.grade}</span>}
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
                              {p != null && <span style={{ fontSize: '11px', color: '#a39e98' }}>({p}%)</span>}
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
                      {r.notes && <div style={{ marginTop: '6px', fontSize: '12px', color: '#615d59' }}>{r.notes}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---- 過去問タブ ---- */}
        {tab === 'past-exams' && (
          <div>
            {pastExams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#a39e98', fontSize: '14px' }}>
                過去問演習の記録がまだありません。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pastExams.slice(0, 10).map(r => {
                  const cc = CATEGORY_COLORS[r.examCategory];
                  return (
                    <div key={r.id} style={cardStyle}>
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
                          const ref = passingScores.find(x => x.schoolName === r.schoolName && x.examCategory === r.examCategory && x.examYear === r.examYear && x.subject === s.subject);
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
                      {r.notes && <div style={{ marginTop: '6px', fontSize: '12px', color: '#615d59' }}>{r.notes}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---- 振返りタブ ---- */}
        {tab === 'review' && (
          <div>
            {!review || (!review.reviewText && !review.improvement && !review.testStrategy) ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#a39e98', fontSize: '14px' }}>
                この週の振返りはまだ入力されていません。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Study summary */}
                {(() => {
                  const snap = review.studySnapshot ?? {};
                  const total = Object.values(snap).reduce((s, v) => s + v, 0);
                  if (total === 0) return null;
                  return (
                    <div style={cardStyle}>
                      <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.9)', margin: '0 0 12px' }}>学習サマリー</h2>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ padding: '8px 16px', borderRadius: '8px', background: '#F0F7FF', border: '1px solid #BFDBFE' }}>
                          <div style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 500, marginBottom: '2px' }}>合計</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1D4ED8' }}>{fmtTime(total)}</div>
                        </div>
                        {Object.entries(snap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, min]) => (
                          <div key={cat} style={{ padding: '8px 14px', borderRadius: '8px', background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.08)' }}>
                            <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500, marginBottom: '2px' }}>{cat}</div>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>{fmtTime(min)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Text sections */}
                {[
                  { label: '📊 今週の振返り', value: review.reviewText },
                  { label: '💡 来週への改善案', value: review.improvement },
                  { label: '📝 テスト対策',    value: review.testStrategy },
                ].filter(s => s.value?.trim()).map(sec => (
                  <div key={sec.label} style={cardStyle}>
                    <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.9)', margin: '0 0 12px' }}>{sec.label}</h2>
                    <p style={{ fontSize: '14px', color: 'rgba(0,0,0,0.85)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {sec.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
