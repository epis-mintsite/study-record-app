-- test_results
CREATE TABLE IF NOT EXISTS test_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users NOT NULL,
  date        date NOT NULL,
  test_type   text NOT NULL,
  test_name   text NOT NULL,
  scores      jsonb NOT NULL DEFAULT '[]',
  notes       text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_test_results"    ON test_results FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "parent_read_tests"   ON test_results FOR SELECT USING (is_parent_of(auth.uid(), user_id));

-- weekly_reviews
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users NOT NULL,
  week_start      date NOT NULL,
  study_snapshot  jsonb NOT NULL DEFAULT '{}',
  review_text     text NOT NULL DEFAULT '',
  improvement     text NOT NULL DEFAULT '',
  test_strategy   text NOT NULL DEFAULT '',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_weekly_reviews"   ON weekly_reviews FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "parent_read_reviews"  ON weekly_reviews FOR SELECT USING (is_parent_of(auth.uid(), user_id));
