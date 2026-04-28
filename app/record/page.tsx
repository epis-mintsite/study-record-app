'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Save, CheckCircle, Plus, X, Edit3, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { parseVoiceInput } from '@/lib/parseVoiceInput';
import { TimeSlot, STANDARD_CATEGORIES, CATEGORY_COLORS, CustomCategory } from '@/lib/types';
import { computeDailyTotals } from '@/lib/mockData';
import { useAuth } from '@/lib/useAuth';
import { upsertStudyRecord, getCustomCategories } from '@/lib/db';

const DEMO_CUSTOM_CATS: CustomCategory[] = [
  { id: '1', userId: 'demo', name: 'ピアノ', color: '#FEF9C3' },
  { id: '2', userId: 'demo', name: 'ダンス', color: '#FEE2E2' },
];

type SpeechRecognitionInstance = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

function getCategoryBg(category: string, customCats: CustomCategory[]): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category].hex;
  return customCats.find(c => c.name === category)?.color ?? CATEGORY_COLORS['その他'].hex;
}

type SlotCardProps = {
  slot: TimeSlot; index: number; customCats: CustomCategory[];
  onChange: (s: TimeSlot) => void; onDelete: () => void;
};

function SlotCard({ slot, index, customCats, onChange, onDelete }: SlotCardProps) {
  const allCats = [...STANDARD_CATEGORIES, ...customCats.map(c => c.name)];
  const bg = getCategoryBg(slot.category, customCats);
  const fieldStyle: React.CSSProperties = {
    width: '100%', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px',
    padding: '6px 10px', fontSize: '13px', color: 'rgba(0,0,0,0.9)',
    background: 'rgba(255,255,255,0.7)', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
  };
  return (
    <div style={{
      borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
      padding: '16px', background: bg, position: 'relative',
      boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.85px',
    }}>
      <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '4px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 500, color: '#a39e98' }}>#{index + 1}</span>
        <button onClick={onDelete} aria-label="削除" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a39e98', padding: '2px', lineHeight: 1 }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        {[['開始', slot.startTime, (v: string) => onChange({ ...slot, startTime: v })],
          ['終了', slot.endTime, (v: string) => onChange({ ...slot, endTime: v })]].map(([label, val, fn]) => (
          <div key={label as string}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#615d59', marginBottom: '4px' }}>{label as string}</label>
            <input type="time" value={val as string} onChange={e => (fn as (v: string) => void)(e.target.value)} style={fieldStyle} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#615d59', marginBottom: '4px' }}>科目</label>
        <select value={slot.category} onChange={e => onChange({ ...slot, category: e.target.value, isCustomCategory: !STANDARD_CATEGORIES.includes(e.target.value as any) })} style={{ ...fieldStyle, background: 'rgba(255,255,255,0.7)' }}>
          {allCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#615d59', marginBottom: '4px' }}>メモ</label>
        <input type="text" value={slot.note || ''} onChange={e => onChange({ ...slot, note: e.target.value || undefined })} placeholder="例：漢字ドリル" style={fieldStyle} />
      </div>
    </div>
  );
}

export default function RecordPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [customCats, setCustomCats] = useState<CustomCategory[]>(DEMO_CUSTOM_CATS);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) setSpeechSupported(false);
  }, []);

  // Load user's custom categories
  useEffect(() => {
    if (!authLoading && user) {
      getCustomCategories(user.id).then(cats => {
        if (cats.length > 0) setCustomCats(cats);
      }).catch(() => {});
    }
  }, [authLoading, user]);

  function startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('このブラウザは音声認識に対応していません。手入力モードをご利用ください。'); return; }
    setError(''); setTranscript(''); setInterimText(''); setTimeSlots([]); setIsSaved(false);
    const recognition = new SR();
    recognition.lang = 'ja-JP'; recognition.interimResults = true; recognition.continuous = true;
    recognitionRef.current = recognition;
    recognition.onresult = (event: any) => {
      let final = '', interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript;
      }
      if (final) setTranscript(p => p + final);
      setInterimText(interim);
    };
    recognition.onerror = (event: any) => {
      setError(event.error === 'not-allowed' ? 'マイクのアクセスが許可されていません。' : `音声認識エラー: ${event.error}`);
      setIsRecording(false);
    };
    recognition.onend = () => { setIsRecording(false); setInterimText(''); };
    recognition.start(); setIsRecording(true);
  }

  function stopRecording() { recognitionRef.current?.stop(); setIsRecording(false); }

  function handleAnalyze() {
    if (!transcript.trim()) { setError('音声テキストが空です。もう一度録音してください。'); return; }
    const parsed = parseVoiceInput(transcript, customCats.map(c => c.name));
    if (parsed.length === 0) {
      setError('学習内容を認識できませんでした。時刻と科目を含めて話してください。例：「9時から10時まで国語の漢字ドリル」');
      return;
    }
    setTimeSlots(parsed); setError('');
  }

  async function handleSave() {
    if (timeSlots.length === 0 || saving) return;
    setSaving(true);
    setError('');
    try {
      if (user) {
        await upsertStudyRecord(user.id, selectedDate, timeSlots);
      } else {
        // Demo: just simulate
        await new Promise(r => setTimeout(r, 400));
      }
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        router.push('/weekly');
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <Loader2 size={24} color="#a39e98" className="animate-spin" />
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '20px',
    boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.85px, rgba(0,0,0,0.02) 0px 0.8px 2.93px',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: '640px', margin: '0 auto', width: '100%', padding: '32px 24px 64px' }}>

        {/* Demo banner */}
        {!user && (
          <div style={{
            background: '#f6f5f4', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px',
            padding: '10px 16px', marginBottom: '20px', fontSize: '13px', color: '#615d59',
          }}>
            デモモード。<a href="/login" style={{ color: '#0075de', textDecoration: 'none', fontWeight: 600 }}>ログイン</a> するとデータが保存されます。
          </div>
        )}

        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.625px', margin: '0 0 28px' }}>
          学習を記録する
        </h1>

        {/* Date */}
        <div style={{ ...cardStyle, marginBottom: '16px' }}>
          <label htmlFor="record-date" style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#615d59', marginBottom: '8px' }}>記録する日付</label>
          <input id="record-date" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{
            border: '1px solid #dddddd', borderRadius: '4px', padding: '7px 12px',
            fontSize: '14px', color: 'rgba(0,0,0,0.9)', outline: 'none', fontFamily: 'inherit',
          }} />
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[
            { mode: false, icon: <Mic size={14} />, label: '音声入力' },
            { mode: true, icon: <Edit3 size={14} />, label: '手入力' },
          ].map(({ mode, icon, label }) => (
            <button key={label} onClick={() => { setManualMode(mode); if (mode) { setIsRecording(false); recognitionRef.current?.stop(); } }}
              style={{
                flex: 1, padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
                fontSize: '14px', fontWeight: manualMode === mode ? 600 : 500, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                border: manualMode === mode ? 'none' : '1px solid rgba(0,0,0,0.1)',
                background: manualMode === mode ? '#0075de' : 'rgba(0,0,0,0.03)',
                color: manualMode === mode ? '#ffffff' : '#615d59',
              }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Voice input */}
        {!manualMode && (
          <div style={{ ...cardStyle, marginBottom: '16px', textAlign: 'center' }}>
            {!speechSupported ? (
              <p style={{ color: '#615d59', fontSize: '14px', margin: 0 }}>このブラウザは音声認識に対応していません。</p>
            ) : (
              <>
                <button onClick={isRecording ? stopRecording : startRecording} aria-label={isRecording ? '録音停止' : '録音開始'}
                  style={{
                    width: '80px', height: '80px', borderRadius: '50%', cursor: 'pointer',
                    border: isRecording ? '2px solid rgba(220,38,38,0.3)' : '1px solid rgba(0,0,0,0.1)',
                    background: isRecording ? 'rgba(254,226,226,0.6)' : '#f6f5f4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
                    boxShadow: isRecording ? '0 0 0 6px rgba(220,38,38,0.08)' : 'none',
                  }}>
                  {isRecording ? <MicOff size={28} color="#dc2626" /> : <Mic size={28} color="#615d59" />}
                </button>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.95)', margin: '0 0 4px' }}>
                  {isRecording ? '録音中… タップで停止' : '録音開始'}
                </p>
                <p style={{ fontSize: '12px', color: '#a39e98', margin: 0 }}>
                  例：「9時から10時まで国語の漢字ドリル、その後数学を30分」
                </p>
              </>
            )}
            {(transcript || interimText) && (
              <div style={{ marginTop: '16px', textAlign: 'left', background: '#f6f5f4', borderRadius: '6px', padding: '12px' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#a39e98', margin: '0 0 4px' }}>認識テキスト</p>
                <p style={{ fontSize: '14px', color: 'rgba(0,0,0,0.85)', margin: 0, lineHeight: 1.5 }}>
                  {transcript}
                  {interimText && <span style={{ color: '#a39e98' }}>{interimText}</span>}
                </p>
              </div>
            )}
            {transcript && !isRecording && (
              <button onClick={handleAnalyze} style={{
                marginTop: '14px', padding: '8px 24px', borderRadius: '4px',
                border: 'none', background: '#0075de', color: '#ffffff',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                解析する
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: '#fff5f5', border: '1px solid rgba(220,38,38,0.15)',
            borderRadius: '6px', padding: '12px 14px', marginBottom: '16px',
            fontSize: '13px', color: '#c0392b', display: 'flex', gap: '8px',
          }}>
            <span style={{ flexShrink: 0 }}>⚠</span>{error}
          </div>
        )}

        {/* Slots */}
        {(timeSlots.length > 0 || manualMode) && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(0,0,0,0.95)', margin: 0 }}>
                {manualMode ? '学習内容を入力' : '解析結果を確認・修正'}
              </h2>
              <button onClick={() => setTimeSlots(prev => [...prev, { startTime: '09:00', endTime: '10:00', category: '国語', isCustomCategory: false }])}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#0075de', fontFamily: 'inherit' }}>
                <Plus size={13} /> 追加
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {timeSlots.map((slot, i) => (
                <SlotCard key={i} index={i} slot={slot} customCats={customCats}
                  onChange={updated => setTimeSlots(prev => prev.map((s, j) => j === i ? updated : s))}
                  onDelete={() => setTimeSlots(prev => prev.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Save */}
        {timeSlots.length > 0 && (
          <button onClick={handleSave} disabled={saving || isSaved} aria-label="記録を保存する"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px', borderRadius: '6px', border: 'none',
              background: isSaved ? '#16a34a' : '#0075de',
              color: '#ffffff', fontSize: '15px', fontWeight: 600,
              cursor: saving || isSaved ? 'default' : 'pointer', fontFamily: 'inherit',
              transition: 'background 0.2s',
            }}>
            {saving ? (
              <><Loader2 size={18} className="animate-spin" /> 保存中...</>
            ) : isSaved ? (
              <><CheckCircle size={18} /> 保存しました！週間表に移動します...</>
            ) : (
              <><Save size={18} /> 保存する</>
            )}
          </button>
        )}
      </main>
    </div>
  );
}
