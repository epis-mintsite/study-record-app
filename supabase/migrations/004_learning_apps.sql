-- learning_apps: 外部の自作学習アプリ（例：今日の時事英語）を一覧・埋め込み表示するための登録データ
-- 生徒個人のデータではないため、閲覧は認証済み全員、登録・編集・削除は管理者APIのみ（service_role経由）。
CREATE TABLE IF NOT EXISTS learning_apps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  url          text NOT NULL,
  description  text,
  icon         text,
  is_available boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE learning_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_learning_apps" ON learning_apps FOR SELECT USING (auth.role() = 'authenticated');
-- INSERT/UPDATE/DELETEポリシーは作らない（/api/admin/learning-apps が service_role で書き込む）

INSERT INTO learning_apps (name, url, description, icon, sort_order) VALUES
  ('今日の時事英語', 'https://my-next-app-two-gilt.vercel.app/', '最新のニュースで英語を学ぼう', '📰', 1);
