-- past_exam_records: 生徒が解いた志望校の過去問演習の記録
CREATE TABLE IF NOT EXISTS past_exam_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users NOT NULL,
  school_name   text NOT NULL,
  exam_category text NOT NULL CHECK (exam_category IN ('一般', '帰国')),
  exam_year     integer NOT NULL,
  attempt_date  date NOT NULL,
  scores        jsonb NOT NULL DEFAULT '[]',
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE past_exam_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_past_exam_records"    ON past_exam_records FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "parent_read_past_exams"   ON past_exam_records FOR SELECT USING (public.is_parent_of(user_id));

-- school_passing_scores: 学校×入試区分×年度×科目の合格最低点（参考値・全校で共有する参照データ）
-- 生徒個人のデータではないため、閲覧は認証済み全員、登録・編集・削除は管理者APIのみ（service_role経由）。
CREATE TABLE IF NOT EXISTS school_passing_scores (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name    text NOT NULL,
  exam_category  text NOT NULL CHECK (exam_category IN ('一般', '帰国')),
  exam_year      integer NOT NULL,
  subject        text NOT NULL,
  passing_score  numeric NOT NULL,
  max_score      numeric,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (school_name, exam_category, exam_year, subject)
);
ALTER TABLE school_passing_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_passing_scores" ON school_passing_scores FOR SELECT USING (auth.role() = 'authenticated');
-- INSERT/UPDATE/DELETEポリシーは作らない（/api/admin/passing-scores が service_role で書き込む）
