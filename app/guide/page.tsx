'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Tab = 'student' | 'parent' | 'admin';

// ---- 型定義 ----
type Section = {
  heading: string;
  emoji: string;
  steps: Step[];
};

type Step = {
  title: string;
  desc: string;
  sub?: string[];
  badge?: string;
  badgeColor?: string;
  badgeTextColor?: string;
  note?: string;
};

// ---- 生徒用 ----
const studentSections: Section[] = [
  {
    heading: 'ログイン・初期設定',
    emoji: '🔑',
    steps: [
      {
        title: 'ログインする',
        desc: 'ログイン画面でエピスミントサイトと同じ「ユーザーID」と「パスワード」を入力して「ログイン」を押します。',
        sub: [
          'ユーザーIDはアルファベット・数字のみ（スペース不可）',
          'パスワードはエピスミントサイトと共通です',
        ],
      },
      {
        title: '初回ログイン時：名前を設定する',
        desc: '初めてログインすると設定画面が表示されます。呼び名（例：山家）を入力して「設定を保存する」を押してください。',
        badge: '初回のみ',
        badgeColor: '#EFF6FF',
        badgeTextColor: '#1D4ED8',
      },
    ],
  },
  {
    heading: '学習を記録する',
    emoji: '📅',
    steps: [
      {
        title: '週間表に記録する',
        desc: 'ナビの「週間表」を開きます。記録したい時間帯の空きセルをタップすると記録フォームが表示されます。開始・終了時刻を調整して科目を選び「保存」を押します。',
        sub: ['前後の週は画面上部の「＜　＞」ボタンで移動できます'],
        badge: '毎日の記録がポイント',
        badgeColor: '#F0FDF4',
        badgeTextColor: '#15803D',
      },
      {
        title: '音声で記録する',
        desc: 'ナビの「記録する」を開きます。マイクボタンを押してから「数学を1時間30分勉強した」のように話すと、自動で週間表に反映されます。',
        sub: [
          '「○○を△時間△分やった」の形で話すとスムーズです',
          'マイクの使用許可が必要です（初回のみ）',
        ],
        badge: 'AI音声認識',
        badgeColor: '#F5F3FF',
        badgeTextColor: '#6D28D9',
      },
      {
        title: 'カスタム科目を追加する',
        desc: '週間表画面の「＋ 科目を追加」から、学校の授業以外の科目（ピアノ・ダンスなど）を自由に追加できます。名前と色を設定できます。',
      },
    ],
  },
  {
    heading: '成績を管理する',
    emoji: '📊',
    steps: [
      {
        title: 'テスト結果を登録する',
        desc: 'ナビの「成績」を開き「＋ 追加」ボタンを押します。種別・テスト名・実施日・各科目の得点を入力して保存します。',
        sub: [
          '【日本人学校】中間テスト、期末テスト、単元テスト、実力テスト',
          '【epis】月例テスト、ハイレベルテスト、漢字テスト、英単語テスト',
          '【模試】各種模擬試験',
          '【検定】英検、漢検、TOEFL、IELTS、HSK など',
        ],
      },
      {
        title: '過去の成績を確認する',
        desc: '「成績」画面に登録済みのテスト結果が新しい順に一覧表示されます。得点・合否・パーセンテージも確認できます。',
      },
    ],
  },
  {
    heading: '週間振返りを書く',
    emoji: '💡',
    steps: [
      {
        title: '振返りを記入する',
        desc: 'ナビの「振返り」を開きます。今週の学習を3つの観点でまとめます。手動で入力することも、「AIに下書きを作ってもらう」ボタンで自動作成することもできます。',
        sub: [
          '📊 今週の振返り：何を・どれくらい学習したか',
          '💡 来週への改善案：次週に向けた目標',
          '📝 テスト対策：直近テストへの準備状況',
        ],
        badge: 'AI下書き支援あり',
        badgeColor: '#F5F3FF',
        badgeTextColor: '#6D28D9',
      },
    ],
  },
  {
    heading: 'ランキングと通知',
    emoji: '🏆',
    steps: [
      {
        title: 'ランキングを確認する',
        desc: 'ナビの「ランキング」を開きます。「今週」と「昨日」タブで学習時間のランキングを確認できます。自分の順位は画面上部に青いバナーで表示されます。',
        sub: [
          '🥇🥈🥉 上位3名にはメダルバッジが表示されます',
          '「あなた」バッジで自分の位置が一目でわかります',
        ],
      },
      {
        title: '毎朝の通知を設定する',
        desc: '「ランキング」画面右上の「朝7時の通知を受け取る」ボタンを押し、ブラウザの許可ダイアログで「許可」を選ぶと、毎朝7時に昨日のランキングが通知されます。',
        sub: [
          '「通知をオフにする」ボタンでいつでも解除できます',
        ],
        badge: 'iOSの場合',
        badgeColor: '#FFF7ED',
        badgeTextColor: '#C2410C',
        note: 'iOSはSafariで開いて「共有 → ホーム画面に追加」してからホーム画面のアイコンで起動すると通知が使えるようになります（iOS 16.4以降）。',
      },
    ],
  },
];

// ---- 保護者用 ----
const parentSections: Section[] = [
  {
    heading: 'ログイン',
    emoji: '🔑',
    steps: [
      {
        title: 'ログインする',
        desc: 'ログイン画面でエピスミントサイトと同じ「ユーザーID」と「パスワード」を入力して「ログイン」を押します。',
      },
      {
        title: '初回ログイン時：お子さまのIDを設定する',
        desc: '初めてログインすると設定画面が表示されます。「保護者」を選び、名前とお子さまのエピスミントサイトIDを入力して保存してください。',
        sub: [
          'お子さまが先にログインしていることが必要です',
          'IDを正しく入力すると自動でお子さまと紐付けられます',
        ],
        badge: '初回のみ',
        badgeColor: '#EFF6FF',
        badgeTextColor: '#1D4ED8',
      },
    ],
  },
  {
    heading: 'お子さまの学習を確認する',
    emoji: '📅',
    steps: [
      {
        title: '保護者ダッシュボードを開く',
        desc: 'ナビの「保護者」を開きます。お子さまの名前が表示されていれば正しく紐付けされています。月間学習チャートで4週間の学習傾向が一目でわかります。',
        badge: '閲覧専用（編集不可）',
        badgeColor: '#FFF7ED',
        badgeTextColor: '#C2410C',
      },
      {
        title: '週間表を確認する',
        desc: '「週間表」タブで、お子さまがその週に記録した学習内容を確認できます。上部の「＜　＞」で過去の週も閲覧できます。',
      },
      {
        title: '成績を確認する',
        desc: '「成績」タブで、お子さまが登録したテスト結果を確認できます。科目別の得点・合否・パーセンテージが表示されます。',
      },
      {
        title: '振返りを確認する',
        desc: '「振返り」タブで、お子さまがその週に書いた振返り・改善案・テスト対策を確認できます。',
        sub: ['📊 今週の振返り', '💡 来週への改善案', '📝 テスト対策'],
      },
    ],
  },
  {
    heading: 'ランキングと通知',
    emoji: '🏆',
    steps: [
      {
        title: 'ランキングを確認する',
        desc: 'ナビの「ランキング」を開きます。生徒全員の学習時間ランキングを「今週」「昨日」別に確認できます。',
      },
      {
        title: '毎朝の通知を設定する',
        desc: '「ランキング」画面右上の「朝7時の通知を受け取る」を押して許可すると、毎朝7時に昨日のランキングが通知されます。',
        badge: 'iOSはホーム画面追加が必要',
        badgeColor: '#FFF7ED',
        badgeTextColor: '#C2410C',
      },
    ],
  },
];

// ---- 管理者用 ----
const adminSections: Section[] = [
  {
    heading: 'ログイン',
    emoji: '🔑',
    steps: [
      {
        title: '管理者としてログインする',
        desc: 'ログイン画面でエピスミントサイトの「Teacher（先生）」アカウントのIDとパスワードを入力してログインします。自動的に管理者ダッシュボードに移動します。',
        badge: 'Teacherアカウント限定',
        badgeColor: '#ECFDF5',
        badgeTextColor: '#065F46',
      },
    ],
  },
  {
    heading: '管理者ダッシュボード',
    emoji: '🛠️',
    steps: [
      {
        title: 'ユーザー一覧を確認する',
        desc: '管理者ダッシュボード下部に登録ユーザーの一覧が表示されます。名前・役割（生徒 / 保護者 / 管理者）・登録日が確認できます。',
        sub: [
          '生徒数・保護者数・管理者数がサマリーカードで確認できます',
        ],
      },
      {
        title: '生徒の学習状況を閲覧する',
        desc: 'ユーザー一覧の生徒名（青いリンク）をタップすると、その生徒の学習記録ページに移動できます。週間表・成績・振返りを管理者として閲覧できます。',
        badge: '管理者閲覧（緑バッジ）',
        badgeColor: '#ECFDF5',
        badgeTextColor: '#065F46',
      },
      {
        title: 'Slack日報を手動送信する',
        desc: '「Slack日報を今すぐ送信」ボタンを押すと、昨日の学習記録まとめをSlackに即時送信できます。通常は毎朝7時に自動送信されます。',
        sub: [
          '送信時にCRON_SECRETの入力が必要です（管理者のみ把握）',
        ],
      },
      {
        title: 'デモアカウントを作成する',
        desc: 'ダッシュボードの「デモアカウントを作成」パネルを開き、必要事項を入力して「アカウントを作成」を押します。エピスIDに依存しない体験用アカウントを即時発行できます。',
        sub: [
          'ユーザーID：アルファベット・数字のみ（例：demo01）',
          'パスワード：6文字以上（ログイン時に使用）',
          '表示名：省略可。省略した場合は初回ログイン後のセットアップ画面で設定',
          '役割：生徒 または 保護者 を選択',
          '作成後はログイン画面から同じID・パスワードでログイン可能',
          '同じIDはすでに存在する場合はエラーが表示されます',
        ],
        badge: '管理者専用',
        badgeColor: '#ECFDF5',
        badgeTextColor: '#065F46',
      },
    ],
  },
  {
    heading: 'Slack自動日報',
    emoji: '📨',
    steps: [
      {
        title: '自動日報の内容',
        desc: '毎朝7時に前日の学習記録がSlackの指定チャンネルに自動送信されます。生徒ごとの合計学習時間・科目別内訳がまとめて確認できます。',
        sub: [
          '学習記録がある生徒のみ表示されます',
          '学習時間の多い順に並びます',
        ],
      },
    ],
  },
  {
    heading: 'ランキングと通知',
    emoji: '🏆',
    steps: [
      {
        title: 'ランキングページ',
        desc: 'ナビの「ランキング」では全生徒の学習時間ランキングを「今週」「昨日」別に確認できます。',
      },
      {
        title: 'Web Push通知',
        desc: '「ランキング」画面の「朝7時の通知を受け取る」を設定すると、毎朝7時に昨日のランキング上位3名がブラウザ通知で届きます。',
      },
    ],
  },
];

// ---- コンポーネント ----
function StepCard({ step, accent }: { step: Step; accent: string }) {
  return (
    <div style={{
      background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: '12px', padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', margin: 0 }}>
          {step.title}
        </h3>
        {step.badge && (
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px',
            background: step.badgeColor, color: step.badgeTextColor ?? 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>
            {step.badge}
          </span>
        )}
      </div>
      <p style={{ fontSize: '14px', color: '#3d3a38', lineHeight: 1.8, margin: 0 }}>
        {step.desc}
      </p>
      {step.sub && (
        <ul style={{ margin: '10px 0 0', padding: '0 0 0 18px' }}>
          {step.sub.map((s, i) => (
            <li key={i} style={{ fontSize: '13px', color: '#615d59', lineHeight: 1.7, marginBottom: '3px' }}>
              {s}
            </li>
          ))}
        </ul>
      )}
      {step.note && (
        <div style={{
          marginTop: '12px', background: '#FFF7ED', borderRadius: '8px',
          padding: '10px 14px', fontSize: '12px', color: '#92400E', lineHeight: 1.7,
          borderLeft: '3px solid #F59E0B',
        }}>
          ⚠️ {step.note}
        </div>
      )}
    </div>
  );
}

function SectionBlock({ section, accent }: { section: Section; accent: string }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '14px',
      }}>
        <span style={{ fontSize: '18px' }}>{section.emoji}</span>
        <h2 style={{
          fontSize: '14px', fontWeight: 700, color: accent,
          margin: 0, letterSpacing: '-0.1px',
        }}>
          {section.heading}
        </h2>
        <div style={{ flex: 1, height: '1px', background: `${accent}30` }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {section.steps.map((step, i) => (
          <StepCard key={i} step={step} accent={accent} />
        ))}
      </div>
    </div>
  );
}

// ---- ページ本体 ----
export default function GuidePage() {
  const [tab, setTab] = useState<Tab>('student');

  const config: Record<Tab, {
    label: string;
    emoji: string;
    accent: string;
    accentLight: string;
    sections: Section[];
    features: string[];
  }> = {
    student: {
      label: '生徒',
      emoji: '👨‍🎓',
      accent: '#0075de',
      accentLight: '#EFF6FF',
      sections: studentSections,
      features: ['📅 週間学習グリッド', '🎙️ 音声記録', '🏷️ カスタム科目', '📊 成績登録', '💡 AI振返り支援', '🏆 学習ランキング', '🔔 朝7時の通知'],
    },
    parent: {
      label: '保護者',
      emoji: '👨‍👧',
      accent: '#7C3AED',
      accentLight: '#F5F3FF',
      sections: parentSections,
      features: ['📅 週間表の閲覧', '📊 成績の確認', '💡 振返りの確認', '📈 月間学習チャート', '🏆 ランキング閲覧', '🔒 閲覧専用'],
    },
    admin: {
      label: '管理者',
      emoji: '🛠️',
      accent: '#27ae60',
      accentLight: '#ECFDF5',
      sections: adminSections,
      features: ['👥 ユーザー一覧', '📋 生徒ページ閲覧', '📨 Slack日報（自動・手動）', '🏆 ランキング閲覧', '🔔 朝7時の通知', '👤 デモアカウント発行'],
    },
  };

  const c = config[tab];

  return (
    <div style={{ minHeight: '100vh', background: '#f6f5f4' }}>

      {/* 固定ヘッダー */}
      <div style={{
        background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.08)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{
          maxWidth: '760px', margin: '0 auto', padding: '0 20px',
          display: 'flex', alignItems: 'center', height: '52px', gap: '12px',
        }}>
          <Link href="/login" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: 500, color: '#615d59', textDecoration: 'none',
          }}>
            <ArrowLeft size={14} />
            ログインへ戻る
          </Link>
          <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.12)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" fill="#0075de" />
              <rect x="7" y="8" width="10" height="1.5" rx="0.75" fill="white" />
              <rect x="7" y="11" width="7" height="1.5" rx="0.75" fill="white" />
              <rect x="7" y="14" width="8" height="1.5" rx="0.75" fill="white" />
            </svg>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(0,0,0,0.9)' }}>操作手順書</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* タイトル */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.5px', margin: '0 0 8px' }}>
            操作手順書
          </h1>
          <p style={{ fontSize: '14px', color: '#615d59', margin: 0 }}>
            まなびログの各機能をご確認ください。
          </p>
        </div>

        {/* タブ切替 */}
        <div style={{
          display: 'flex', background: '#ffffff', borderRadius: '12px', padding: '4px',
          border: '1px solid rgba(0,0,0,0.09)', marginBottom: '28px',
          boxShadow: 'rgba(0,0,0,0.03) 0px 2px 8px',
        }}>
          {(['student', 'parent', 'admin'] as Tab[]).map(key => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '10px 8px', borderRadius: '9px', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px',
              fontWeight: tab === key ? 700 : 500,
              background: tab === key ? config[key].accent : 'transparent',
              color: tab === key ? '#ffffff' : '#615d59',
              transition: 'all 0.15s',
            }}>
              {config[key].emoji} {config[key].label}
            </button>
          ))}
        </div>

        {/* 機能一覧チップ */}
        <div style={{
          background: c.accentLight, borderRadius: '10px', padding: '16px 18px',
          marginBottom: '28px', border: `1px solid ${c.accent}25`,
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: c.accent, marginBottom: '10px' }}>
            {c.emoji} {c.label}向け機能一覧
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {c.features.map(f => (
              <span key={f} style={{
                padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500,
                background: '#ffffff', color: 'rgba(0,0,0,0.75)',
                border: '1px solid rgba(0,0,0,0.1)',
              }}>{f}</span>
            ))}
          </div>
        </div>

        {/* 各セクション */}
        {c.sections.map((section, i) => (
          <SectionBlock key={i} section={section} accent={c.accent} />
        ))}

        {/* ログインCTA */}
        <div style={{
          marginTop: '16px', textAlign: 'center',
          borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '32px',
        }}>
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 32px', borderRadius: '8px',
            background: c.accent, color: '#ffffff',
            fontSize: '15px', fontWeight: 600, textDecoration: 'none',
          }}>
            ログイン画面へ →
          </Link>
        </div>

      </div>
    </div>
  );
}
