'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Tab = 'student' | 'parent';

type Step = {
  num: number;
  title: string;
  desc: string;
  sub?: string[];
  badge?: string;
  badgeColor?: string;
};

const studentSteps: Step[] = [
  {
    num: 1,
    title: 'アカウントを作る',
    desc: 'ログイン画面の「新規登録」タブを開き、名前・メールアドレス・パスワードを入力します。役割は「生徒」を選んでください。',
    sub: ['登録後、確認メールが届きます', 'メール内のリンクをクリックして認証完了'],
  },
  {
    num: 2,
    title: '週間表で学習を記録する',
    desc: '「週間表」画面を開きます。記録したい時間帯の空きセルをタップ（クリック）すると記録フォームが表示されます。',
    sub: ['開始・終了時刻を調整', '科目を選んで「記録する」'],
    badge: '毎日の記録がポイント',
    badgeColor: '#EFF6FF',
  },
  {
    num: 3,
    title: '科目を追加する',
    desc: '学校の授業以外（ピアノ・ダンスなど）の科目は「科目追加」ボタンから自由に追加できます。色も選べます。',
  },
  {
    num: 4,
    title: 'テスト結果を登録する',
    desc: '「成績」画面の「追加」ボタンからテスト結果を登録します。種別（日本人学校 / epis / 模試 / 検定 / その他）とテスト名を選んで得点を入力します。',
    sub: [
      '日本人学校：中間テスト、期末テスト、単元テスト、実力テスト',
      'epis：月例テスト、ハイレベルテスト、漢字テスト、英単語テスト',
      '検定：英検、漢検、TOEFL、IELTS、HSK',
    ],
  },
  {
    num: 5,
    title: '週間振返りを書く',
    desc: '「振返り」画面で、今週の学習を3つの観点でまとめます。自分で書いても、AIに下書きを作ってもらうこともできます。',
    sub: ['📊 今週の振返り', '💡 来週への改善案', '📝 テスト対策'],
    badge: 'AIが下書きを作成',
    badgeColor: '#F5F3FF',
  },
  {
    num: 6,
    title: 'PDFでダウンロードする',
    desc: '週間表の右上にある「PDF」ボタンを押すと、その週の学習記録をPDF形式で保存できます。',
  },
];

const parentSteps: Step[] = [
  {
    num: 1,
    title: 'アカウントを作る',
    desc: 'ログイン画面の「新規登録」タブを開き、名前・メールアドレス・パスワードを入力します。役割は「保護者」を選んでください。',
    sub: [
      '「お子さまのメールアドレス」欄にお子さまが登録したメールアドレスを入力すると自動で紐付けされます',
      'お子さまが先にアカウントを作成している必要があります',
    ],
  },
  {
    num: 2,
    title: '保護者ダッシュボードを開く',
    desc: 'ログイン後、ナビゲーションの「保護者」をタップします。お子さまの名前が表示されていれば正しく紐付けされています。',
    sub: ['保護者ダッシュボードは保護者アカウントのみ表示されます'],
  },
  {
    num: 3,
    title: '週間表でお子さまの学習を確認する',
    desc: '「週間表」タブで、お子さまがその週に記録した学習内容を確認できます。週ナビで過去の週も閲覧できます。',
    badge: '閲覧専用（編集はできません）',
    badgeColor: '#FFF7ED',
  },
  {
    num: 4,
    title: '成績を確認する',
    desc: '「成績」タブで、お子さまが登録したテスト結果の一覧を確認できます。種別・テスト名・得点・合否が表示されます。',
  },
  {
    num: 5,
    title: '振返りを確認する',
    desc: '「振返り」タブで、お子さまがその週に書いた振返り・改善案・テスト対策を確認できます。週ナビで過去の振返りも閲覧できます。',
    sub: ['📊 今週の振返り', '💡 来週への改善案', '📝 テスト対策'],
  },
];

function StepCard({ step, color }: { step: Step; color: string }) {
  return (
    <div style={{
      display: 'flex', gap: '20px', alignItems: 'flex-start',
      background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)',
      borderRadius: '12px', padding: '24px',
      boxShadow: 'rgba(0,0,0,0.03) 0px 2px 12px',
    }}>
      {/* Step number */}
      <div style={{
        flexShrink: 0, width: '36px', height: '36px', borderRadius: '50%',
        background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '15px', fontWeight: 700, color: '#ffffff',
      }}>
        {step.num}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', margin: 0, letterSpacing: '-0.2px' }}>
            {step.title}
          </h3>
          {step.badge && (
            <span style={{
              fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px',
              background: step.badgeColor, color: 'rgba(0,0,0,0.65)',
              border: '1px solid rgba(0,0,0,0.08)',
            }}>
              {step.badge}
            </span>
          )}
        </div>
        <p style={{ fontSize: '14px', color: '#3d3a38', lineHeight: 1.75, margin: 0 }}>
          {step.desc}
        </p>
        {step.sub && (
          <ul style={{ margin: '10px 0 0', padding: '0 0 0 18px' }}>
            {step.sub.map((s, i) => (
              <li key={i} style={{ fontSize: '13px', color: '#615d59', lineHeight: 1.65, marginBottom: '3px' }}>
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function GuidePage() {
  const [tab, setTab] = useState<Tab>('student');

  const isStudent = tab === 'student';
  const steps = isStudent ? studentSteps : parentSteps;
  const accentColor = isStudent ? '#0075de' : '#7C3AED';
  const accentLight = isStudent ? '#EFF6FF' : '#F5F3FF';
  const accentText  = isStudent ? '#1D4ED8' : '#5B21B6';

  return (
    <div style={{ minHeight: '100vh', background: '#f6f5f4' }}>
      {/* Header */}
      <div style={{
        background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.1)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{
          maxWidth: '720px', margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', height: '52px', gap: '12px',
        }}>
          <Link href="/login" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: 500, color: '#615d59',
            textDecoration: 'none',
          }}>
            <ArrowLeft size={14} />
            ログイン画面に戻る
          </Link>
          <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.12)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" fill="#0075de" />
              <rect x="7" y="8" width="10" height="1.5" rx="0.75" fill="white" />
              <rect x="7" y="11" width="7" height="1.5" rx="0.75" fill="white" />
              <rect x="7" y="14" width="8" height="1.5" rx="0.75" fill="white" />
            </svg>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(0,0,0,0.9)' }}>操作手順</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.5px', margin: '0 0 10px' }}>
            使い方ガイド
          </h1>
          <p style={{ fontSize: '14px', color: '#615d59', margin: 0, lineHeight: 1.7 }}>
            週間学習記録アプリの操作手順をご確認ください。
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', background: '#ffffff', borderRadius: '10px', padding: '4px',
          border: '1px solid rgba(0,0,0,0.1)', marginBottom: '32px',
          boxShadow: 'rgba(0,0,0,0.03) 0px 2px 8px',
        }}>
          {([['student', '👨‍🎓 生徒用'], ['parent', '👨‍👧 保護者用']] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '10px 16px', borderRadius: '7px', cursor: 'pointer',
              fontSize: '14px', fontWeight: tab === key ? 700 : 500, fontFamily: 'inherit',
              border: 'none',
              background: tab === key ? (key === 'student' ? '#0075de' : '#7C3AED') : 'transparent',
              color: tab === key ? '#ffffff' : '#615d59',
              transition: 'all 0.15s',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Role badge */}
        <div style={{
          background: accentLight, border: `1px solid ${accentColor}30`,
          borderRadius: '8px', padding: '14px 18px', marginBottom: '28px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '20px' }}>{isStudent ? '👨‍🎓' : '👨‍👧'}</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: accentText }}>
              {isStudent ? '生徒向けガイド' : '保護者向けガイド'}
            </div>
            <div style={{ fontSize: '12px', color: '#615d59', marginTop: '2px' }}>
              {isStudent
                ? '学習記録・成績登録・振返りの手順を説明します。'
                : 'お子さまの学習状況の確認手順を説明します。'}
            </div>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {steps.map(step => (
            <StepCard key={step.num} step={step} color={accentColor} />
          ))}
        </div>

        {/* Feature summary */}
        <div style={{
          marginTop: '40px', background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '24px',
        }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(0,0,0,0.9)', margin: '0 0 16px' }}>
            {isStudent ? '主な機能一覧' : '保護者ダッシュボードの機能'}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(isStudent ? [
              '📅 週間学習グリッド',
              '✏️ タップで記録',
              '🏷️ カスタム科目',
              '📊 成績登録',
              '💡 AI振返り支援',
              '📄 PDF出力',
              '⏱️ 時間・分表示切替',
            ] : [
              '📅 週間表の閲覧',
              '📊 成績の確認',
              '💡 振返りの確認',
              '📈 月間学習チャート',
              '🔒 閲覧専用',
            ]).map(f => (
              <span key={f} style={{
                padding: '5px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500,
                background: accentLight, color: accentText,
                border: `1px solid ${accentColor}20`,
              }}>{f}</span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 28px', borderRadius: '8px',
            background: accentColor, color: '#ffffff',
            fontSize: '15px', fontWeight: 600, textDecoration: 'none',
            boxShadow: `0 2px 12px ${accentColor}40`,
          }}>
            {isStudent ? 'さっそく始める →' : 'ログインして確認する →'}
          </Link>
        </div>

      </div>
    </div>
  );
}
