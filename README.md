# 週間学習記録アプリ

音声入力で学習内容を記録し、科目別カラーの週間表を自動生成するWebアプリです。

## 機能

- **音声入力**: Web Speech API でブラウザ内録音し、ルールベースで時刻・科目・メモを解析
- **週間グリッド**: 08:00〜24:00 を30分刻みで縦軸、月〜日を横軸に配置した表
- **科目別カラー**: 国語・数学・英語・理科・社会のプリセット色と、カスタム科目の自由色
- **集計行**: 科目別の日毎合計・週間合計を表下部に表示（時間/分の切り替え可）
- **PDF出力**: 週間表をA4横向きPDFでダウンロード
- **保護者ダッシュボード**: 月間推移グラフと週間表の閲覧（編集不可）
- **Supabase Auth**: メール+パスワード認証、RLSによるデータ分離

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| 音声認識 | Web Speech API（ブラウザ標準） |
| 解析エンジン | ルールベース（正規表現 + 科目辞書） |
| バックエンド/DB | Supabase (Auth + Postgres + RLS) |
| PDF出力 | html2canvas + jsPDF |
| グラフ | Recharts |
| テスト | Vitest |
| ホスティング | Vercel（推奨） |

## セットアップ手順

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd study-record-app
npm install
```

### 2. Supabase の初期設定

1. [Supabase](https://supabase.com) でアカウントを作成し、新規プロジェクトを作成
2. ダッシュボードの **Project Settings → API** から以下をコピー:
   - `Project URL`
   - `anon public` キー
3. ダッシュボードの **SQL Editor** を開き、以下のマイグレーションファイルの内容をすべて実行:
   - `supabase/migrations/001_initial_schema.sql`

### 3. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を開き、Supabase の値を設定:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くと `/weekly` に自動リダイレクトされます。

## テストの実行

```bash
npm test
```

`lib/parseVoiceInput.ts` のユニットテスト（10ケース）を実行します。

## 画面一覧

| URL | 説明 |
|-----|------|
| `/login` | ログイン・新規登録（生徒/保護者の選択） |
| `/weekly` | 週間表メイン画面・PDF出力 |
| `/record` | 音声入力・手入力での学習記録 |
| `/parent` | 保護者ダッシュボード（閲覧専用） |

## Vercel へのデプロイ

1. GitHub にプッシュ
2. [Vercel](https://vercel.com) でプロジェクトをインポート
3. 環境変数 `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定
4. デプロイ

## ディレクトリ構成

```
study-record-app/
├── app/
│   ├── components/
│   │   ├── Navbar.tsx          # 共通ナビゲーション
│   │   └── WeeklyGrid.tsx      # 週間グリッド（メインコンポーネント）
│   ├── login/page.tsx          # ログイン・サインアップ
│   ├── weekly/page.tsx         # 週間表画面
│   ├── record/page.tsx         # 記録入力画面
│   └── parent/page.tsx         # 保護者ダッシュボード
├── lib/
│   ├── types.ts                # 型定義・カラーパレット
│   ├── parseVoiceInput.ts      # 音声→TimeSlot変換ロジック
│   ├── mockData.ts             # モックデータ・ユーティリティ
│   ├── supabase.ts             # クライアントサイドSupabaseクライアント
│   └── supabase-server.ts      # サーバーサイドSupabaseクライアント
├── supabase/migrations/
│   └── 001_initial_schema.sql  # テーブル定義・RLSポリシー
├── __tests__/
│   └── parseVoiceInput.test.ts # ユニットテスト（10ケース）
├── .env.example                # 環境変数テンプレート
└── README.md
```

## 音声入力の使い方

1. `/record` 画面を開く
2. 日付を選択
3. マイクボタンをタップして録音開始
4. 例: 「朝9時から10時まで国語の漢字ドリル、その後数学を30分」
5. 停止ボタンをタップ → 「解析する」をクリック
6. 解析結果を確認・修正して「保存する」

### 認識できる発話パターン

| 発話例 | 解釈 |
|--------|------|
| 朝9時から10時まで国語 | 09:00〜10:00 国語 |
| 夕方4時からピアノを1時間 | 16:00〜17:00 ピアノ |
| 9時から国語1時間、その後数学を30分 | 09:00〜10:00 国語 → 10:00〜10:30 数学 |
| 午後2時から英語を1時間半 | 14:00〜15:30 英語 |
