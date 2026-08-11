import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from './supabase-admin';

const DAY_MS = 86_400_000;
const MIN_BASE_MINUTES = 30; // これ未満の先週実績は変化率のノイズになるため対象外
const NOTABLE_PCT = 25; // これ以上の変化率を「注目すべき変化」とみなす

const THIS_WEEK_OFFSETS = [-7, -6, -5, -4, -3, -2, -1]; // 月〜日（昨日=日曜）
const LAST_WEEK_OFFSETS = [-14, -13, -12, -11, -10, -9, -8];

function jstDateStr(offsetDays: number): string {
  return new Date(Date.now() + 9 * 3_600_000 + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

/** 今日がJSTで月曜かどうか（週次トレンドは月曜の日報にのみ追記する）。 */
export function isMondayJST(): boolean {
  const jst = new Date(Date.now() + 9 * 3_600_000);
  return jst.getUTCDay() === 1;
}

function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}時間${m}分`;
  if (h > 0) return `${h}時間`;
  return `${m}分`;
}

type StudentWeekAgg = {
  name: string;
  thisWeekTotal: number;
  lastWeekTotal: number;
  thisWeekSubjects: Record<string, number>;
  lastWeekSubjects: Record<string, number>;
};

export type SubjectChange = {
  studentName: string;
  subject: string;
  thisWeekMin: number;
  lastWeekMin: number;
  pctChange: number | null; // 'started' は null（分母0のため）
  kind: 'increase' | 'decrease' | 'started' | 'stopped';
};

export type ConcerningStudent = {
  name: string;
  thisWeekMin: number;
  lastWeekMin: number;
  pctChange: number;
};

export type WeeklyTrendStats = {
  weekStart: string; // 今週の月曜（YYYY-MM-DD）
  weekEnd: string; // 今週の日曜（=昨日）
  activeStudentsThisWeek: number;
  activeStudentsLastWeek: number;
  totalMinutesThisWeek: number;
  totalMinutesLastWeek: number;
  wowChangePct: number | null;
  subjectChanges: SubjectChange[];
  concerningStudents: ConcerningStudent[];
};

/** 全生徒の直近2週間分の学習記録を集計し、週次トレンドの根拠データを作る。 */
export async function buildWeeklyTrendStats(): Promise<WeeklyTrendStats> {
  const supabase = createAdminClient();
  const thisWeekDates = THIS_WEEK_OFFSETS.map(jstDateStr);
  const lastWeekDates = LAST_WEEK_OFFSETS.map(jstDateStr);
  const thisWeekSet = new Set(thisWeekDates);
  const lastWeekSet = new Set(lastWeekDates);

  const { data: records, error } = await supabase
    .from('study_records')
    .select('date, daily_totals, users!study_records_user_id_fkey(id, name, role)')
    .in('date', [...lastWeekDates, ...thisWeekDates]);
  if (error) throw new Error(`週次トレンド集計のDB取得に失敗しました: ${error.message}`);

  type UserRow = { id: string; name: string; role: string };
  type RecordRow = { date: string; daily_totals: Record<string, number>; users: UserRow | UserRow[] | null };
  const normalize = (u: UserRow | UserRow[] | null): UserRow | null => (Array.isArray(u) ? (u[0] ?? null) : u);

  const perStudent = new Map<string, StudentWeekAgg>();
  for (const r of (records ?? []) as RecordRow[]) {
    const user = normalize(r.users);
    if (!user || user.role !== 'student') continue;
    if (!perStudent.has(user.id)) {
      perStudent.set(user.id, { name: user.name, thisWeekTotal: 0, lastWeekTotal: 0, thisWeekSubjects: {}, lastWeekSubjects: {} });
    }
    const agg = perStudent.get(user.id)!;
    const totals = r.daily_totals ?? {};
    const dayTotal = Object.values(totals).reduce((s, v) => s + (v ?? 0), 0);

    if (thisWeekSet.has(r.date)) {
      agg.thisWeekTotal += dayTotal;
      for (const [subj, min] of Object.entries(totals)) agg.thisWeekSubjects[subj] = (agg.thisWeekSubjects[subj] ?? 0) + (min ?? 0);
    } else if (lastWeekSet.has(r.date)) {
      agg.lastWeekTotal += dayTotal;
      for (const [subj, min] of Object.entries(totals)) agg.lastWeekSubjects[subj] = (agg.lastWeekSubjects[subj] ?? 0) + (min ?? 0);
    }
  }

  // 科目別の注目すべき変化（生徒 × 科目）
  const subjectChanges: SubjectChange[] = [];
  for (const agg of perStudent.values()) {
    const subjects = new Set([...Object.keys(agg.thisWeekSubjects), ...Object.keys(agg.lastWeekSubjects)]);
    for (const subject of subjects) {
      const thisMin = agg.thisWeekSubjects[subject] ?? 0;
      const lastMin = agg.lastWeekSubjects[subject] ?? 0;
      if (lastMin === 0 && thisMin === 0) continue;

      if (lastMin === 0) {
        if (thisMin >= MIN_BASE_MINUTES) {
          subjectChanges.push({ studentName: agg.name, subject, thisWeekMin: thisMin, lastWeekMin: lastMin, pctChange: null, kind: 'started' });
        }
        continue;
      }
      if (lastMin < MIN_BASE_MINUTES) continue;

      if (thisMin === 0) {
        subjectChanges.push({ studentName: agg.name, subject, thisWeekMin: thisMin, lastWeekMin: lastMin, pctChange: -100, kind: 'stopped' });
        continue;
      }

      const pct = Math.round(((thisMin - lastMin) / lastMin) * 1000) / 10;
      if (Math.abs(pct) >= NOTABLE_PCT) {
        subjectChanges.push({ studentName: agg.name, subject, thisWeekMin: thisMin, lastWeekMin: lastMin, pctChange: pct, kind: pct > 0 ? 'increase' : 'decrease' });
      }
    }
  }
  subjectChanges.sort((a, b) => (a.pctChange ?? -101) - (b.pctChange ?? -101));

  // 総学習時間が大きく落ちた生徒
  const concerningStudents: ConcerningStudent[] = [];
  for (const agg of perStudent.values()) {
    if (agg.lastWeekTotal < MIN_BASE_MINUTES) continue;
    const pct =
      agg.thisWeekTotal === 0 ? -100 : Math.round(((agg.thisWeekTotal - agg.lastWeekTotal) / agg.lastWeekTotal) * 1000) / 10;
    if (pct <= -NOTABLE_PCT) {
      concerningStudents.push({ name: agg.name, thisWeekMin: agg.thisWeekTotal, lastWeekMin: agg.lastWeekTotal, pctChange: pct });
    }
  }
  concerningStudents.sort((a, b) => a.pctChange - b.pctChange);

  const values = [...perStudent.values()];
  const totalMinutesThisWeek = values.reduce((s, a) => s + a.thisWeekTotal, 0);
  const totalMinutesLastWeek = values.reduce((s, a) => s + a.lastWeekTotal, 0);
  const wowChangePct =
    totalMinutesLastWeek > 0
      ? Math.round(((totalMinutesThisWeek - totalMinutesLastWeek) / totalMinutesLastWeek) * 1000) / 10
      : null;

  return {
    weekStart: thisWeekDates[0],
    weekEnd: thisWeekDates[6],
    activeStudentsThisWeek: values.filter((a) => a.thisWeekTotal > 0).length,
    activeStudentsLastWeek: values.filter((a) => a.lastWeekTotal > 0).length,
    totalMinutesThisWeek,
    totalMinutesLastWeek,
    wowChangePct,
    subjectChanges,
    concerningStudents,
  };
}

function buildFactsText(stats: WeeklyTrendStats): string {
  const lines: string[] = [];
  lines.push(`# 週次学習トレンド集計（対象週: ${stats.weekStart}〜${stats.weekEnd}, 月〜日）`);
  lines.push(`- 今週学習した生徒数: ${stats.activeStudentsThisWeek}名 / 先週: ${stats.activeStudentsLastWeek}名`);
  lines.push(`- 合計学習時間: 今週${fmtMin(stats.totalMinutesThisWeek)} / 先週${fmtMin(stats.totalMinutesLastWeek)}`);
  lines.push(
    `- 全体の先週比: ${stats.wowChangePct === null ? '先週データなし' : `${stats.wowChangePct > 0 ? '+' : ''}${stats.wowChangePct}%`}`
  );

  lines.push(`\n## 科目別の注目すべき変化（生徒×科目、先週比${NOTABLE_PCT}%以上の変化のみ抽出済み）`);
  if (stats.subjectChanges.length === 0) {
    lines.push('なし（すべての生徒が先週と同程度の学習ペース）');
  } else {
    for (const c of stats.subjectChanges) {
      if (c.kind === 'started') lines.push(`- ${c.studentName}：${c.subject}に新たに取り組み始めた（今週${fmtMin(c.thisWeekMin)}）`);
      else if (c.kind === 'stopped')
        lines.push(`- ${c.studentName}：${c.subject}の学習記録がなくなった（先週${fmtMin(c.lastWeekMin)}→今週0分）`);
      else
        lines.push(
          `- ${c.studentName}：${c.subject} 先週${fmtMin(c.lastWeekMin)}→今週${fmtMin(c.thisWeekMin)}（${c.pctChange! > 0 ? '+' : ''}${c.pctChange}%）`
        );
    }
  }

  lines.push(`\n## 総学習時間が大きく減少した生徒（先週比${NOTABLE_PCT}%以上減、先週の実績${MIN_BASE_MINUTES}分以上が対象）`);
  if (stats.concerningStudents.length === 0) {
    lines.push('なし');
  } else {
    for (const s of stats.concerningStudents) {
      lines.push(`- ${s.name}：先週${fmtMin(s.lastWeekMin)}→今週${fmtMin(s.thisWeekMin)}（${s.pctChange}%）`);
    }
  }

  return lines.join('\n');
}

function buildSystemPrompt(): string {
  return [
    'あなたは、学習塾・家庭教師サービスの運営者（先生・保護者）向けに「週次学習トレンド」のSlack通知文を書くアシスタントです。',
    '',
    '【最重要のルール】',
    '1. 数値・生徒名の捏造をしない。与えられた集計データに書かれていない事実を絶対に作り出さない。',
    '2. 同じ科目・同じ方向（増加/減少/開始/中止）の変化が複数の生徒にまたがる場合は、人数をまとめて1文にする（例：「英語の学習時間が先週比30%前後減少している生徒が3名います」）。個々の数値をすべて羅列しない。',
    '3. 断定しすぎない。データから読み取れる傾向は推測であることが分かる言い方にする。',
    '4. 個人を問題視しすぎる書き方を避ける。「気になる生徒」は、心配・声かけの候補として中立的に伝える。',
    '5. Slackのmrkdwn形式で出力する。太字は*で囲む。見出しは絵文字+太字（例：*📈 今週の傾向*）。前置き・断り書きは付けず本文のみ。',
    '6. 全体で400字程度、長くとも600字以内に収める。',
    '',
    '【構成】',
    '*📈 今週の傾向* — 全体の学習量・参加人数の変化を1〜2文で。',
    '*🔍 科目別の変化* — 科目別の注目すべき増減を、人数をまとめて1〜3文で（データがなければ「特に大きな変化はありませんでした」）。',
    '*💬 気になる生徒* — 総学習時間が大きく落ちた生徒がいれば中立的に触れる（いなければ「特になし」）。',
  ].join('\n');
}

/** 集計データから、Claudeが週次トレンドのSlack通知文（mrkdwn）を生成する。 */
export async function generateWeeklyTrendText(stats: WeeklyTrendStats): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が未設定です');
  const client = new Anthropic({ apiKey });

  const resp = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 900,
    thinking: { type: 'disabled' },
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildFactsText(stats) }],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  if (!text) throw new Error('AIの生成結果が空でした');
  return text;
}
