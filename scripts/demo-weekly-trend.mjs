// 週次学習トレンド（Slack日報への追記分）のデモ生成スクリプト（DBを一切使わない）。
// 2週間分の合成 daily_totals を lib/weekly-trend.ts と同じロジックで集計し、
// 同じプロンプトでClaudeに投げて、実際にSlackへ届く文面と同等のものをプレビューする。
// 使い方: node scripts/demo-weekly-trend.mjs  （ANTHROPIC_API_KEY 環境変数を使用）
import { writeFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY が環境変数にありません（例: ANTHROPIC_API_KEY=xxx node scripts/demo-weekly-trend.mjs）');
  process.exit(1);
}

const MIN_BASE_MINUTES = 30;
const NOTABLE_PCT = 25;

// ---- 合成データ：6名の生徒 × 2週間分の daily_totals（分） ----
// lastWeekSubjects / thisWeekSubjects は「1週間の科目別合計」に既に集計済みの体で書く（実DBでは日別→週合計に集計する）。
const students = [
  { name: '田中 凛', last: { 国語: 210, 数学: 300, 英語: 180, 理科: 90, 社会: 60 }, this: { 国語: 200, 数学: 320, 英語: 120, 理科: 100, 社会: 70 } }, // 英語 -33%
  { name: '鈴木 蒼', last: { 国語: 90, 数学: 150, 英語: 200, 理科: 60 }, this: { 国語: 100, 数学: 160, 英語: 130, 理科: 50 } }, // 英語 -35%
  { name: '佐藤 陽', last: { 英語: 240, 数学: 120 }, this: { 英語: 150, 数学: 130 } }, // 英語 -37.5%
  { name: '山本 結菜', last: { 数学: 180, 英語: 150, 理科: 90 }, this: { 数学: 220, 英語: 170, 理科: 180, 社会: 60 } }, // 理科に新規参入・全体増加
  { name: '中村 悠斗', last: { 国語: 120, 数学: 180, 英語: 100, 社会: 80 }, this: { 国語: 20, 数学: 30, 英語: 0, 社会: 0 } }, // 総時間が大きく減少（気になる生徒）
  { name: '小林 芽依', last: { 国語: 150, 数学: 150, 英語: 150 }, this: { 国語: 160, 数学: 155, 英語: 145 } }, // 横ばい・変化なし
];

function fmtMin(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}時間${m}分`;
  if (h > 0) return `${h}時間`;
  return `${m}分`;
}

function sum(obj) {
  return Object.values(obj).reduce((s, v) => s + v, 0);
}

// ---- lib/weekly-trend.ts と同じ抽出ロジック ----
const subjectChanges = [];
for (const s of students) {
  const subjects = new Set([...Object.keys(s.this), ...Object.keys(s.last)]);
  for (const subject of subjects) {
    const thisMin = s.this[subject] ?? 0;
    const lastMin = s.last[subject] ?? 0;
    if (lastMin === 0 && thisMin === 0) continue;
    if (lastMin === 0) {
      if (thisMin >= MIN_BASE_MINUTES) subjectChanges.push({ studentName: s.name, subject, thisWeekMin: thisMin, lastWeekMin: lastMin, pctChange: null, kind: 'started' });
      continue;
    }
    if (lastMin < MIN_BASE_MINUTES) continue;
    if (thisMin === 0) {
      subjectChanges.push({ studentName: s.name, subject, thisWeekMin: thisMin, lastWeekMin: lastMin, pctChange: -100, kind: 'stopped' });
      continue;
    }
    const pct = Math.round(((thisMin - lastMin) / lastMin) * 1000) / 10;
    if (Math.abs(pct) >= NOTABLE_PCT) {
      subjectChanges.push({ studentName: s.name, subject, thisWeekMin: thisMin, lastWeekMin: lastMin, pctChange: pct, kind: pct > 0 ? 'increase' : 'decrease' });
    }
  }
}
subjectChanges.sort((a, b) => (a.pctChange ?? -101) - (b.pctChange ?? -101));

const concerningStudents = [];
for (const s of students) {
  const lastTotal = sum(s.last);
  const thisTotal = sum(s.this);
  if (lastTotal < MIN_BASE_MINUTES) continue;
  const pct = thisTotal === 0 ? -100 : Math.round(((thisTotal - lastTotal) / lastTotal) * 1000) / 10;
  if (pct <= -NOTABLE_PCT) concerningStudents.push({ name: s.name, thisWeekMin: thisTotal, lastWeekMin: lastTotal, pctChange: pct });
}
concerningStudents.sort((a, b) => a.pctChange - b.pctChange);

const totalMinutesThisWeek = students.reduce((s, x) => s + sum(x.this), 0);
const totalMinutesLastWeek = students.reduce((s, x) => s + sum(x.last), 0);
const wowChangePct = Math.round(((totalMinutesThisWeek - totalMinutesLastWeek) / totalMinutesLastWeek) * 1000) / 10;

const stats = {
  weekStart: '2026-08-03',
  weekEnd: '2026-08-09',
  activeStudentsThisWeek: students.filter((s) => sum(s.this) > 0).length,
  activeStudentsLastWeek: students.filter((s) => sum(s.last) > 0).length,
  totalMinutesThisWeek,
  totalMinutesLastWeek,
  wowChangePct,
  subjectChanges,
  concerningStudents,
};

// ---- プロンプト（lib/weekly-trend.ts と同一） ----
function buildFactsText(stats) {
  const lines = [];
  lines.push(`# 週次学習トレンド集計（対象週: ${stats.weekStart}〜${stats.weekEnd}, 月〜日）`);
  lines.push(`- 今週学習した生徒数: ${stats.activeStudentsThisWeek}名 / 先週: ${stats.activeStudentsLastWeek}名`);
  lines.push(`- 合計学習時間: 今週${fmtMin(stats.totalMinutesThisWeek)} / 先週${fmtMin(stats.totalMinutesLastWeek)}`);
  lines.push(`- 全体の先週比: ${stats.wowChangePct > 0 ? '+' : ''}${stats.wowChangePct}%`);

  lines.push(`\n## 科目別の注目すべき変化（生徒×科目、先週比${NOTABLE_PCT}%以上の変化のみ抽出済み）`);
  if (stats.subjectChanges.length === 0) {
    lines.push('なし（すべての生徒が先週と同程度の学習ペース）');
  } else {
    for (const c of stats.subjectChanges) {
      if (c.kind === 'started') lines.push(`- ${c.studentName}：${c.subject}に新たに取り組み始めた（今週${fmtMin(c.thisWeekMin)}）`);
      else if (c.kind === 'stopped') lines.push(`- ${c.studentName}：${c.subject}の学習記録がなくなった（先週${fmtMin(c.lastWeekMin)}→今週0分）`);
      else lines.push(`- ${c.studentName}：${c.subject} 先週${fmtMin(c.lastWeekMin)}→今週${fmtMin(c.thisWeekMin)}（${c.pctChange > 0 ? '+' : ''}${c.pctChange}%）`);
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

function buildSystemPrompt() {
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

const client = new Anthropic({ apiKey });
const resp = await client.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 900,
  thinking: { type: 'disabled' },
  system: buildSystemPrompt(),
  messages: [{ role: 'user', content: buildFactsText(stats) }],
});
const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();

console.log('===== 週次学習トレンド（Slack日報への追記分・デモ） =====\n');
console.log(text);

// デイリー部分も添えたSlackブロック全体（月曜の日報を模擬）
const dailyStudents = [
  { name: '田中 凛', totalMin: 280, subjects: '数学：2時間20分　国語：1時間' },
  { name: '鈴木 蒼', totalMin: 190, subjects: '英語：1時間50分　理科：40分' },
  { name: '佐藤 陽', totalMin: 150, subjects: '英語：1時間30分　数学：20分' },
];
const blocks = [
  { type: 'header', text: { type: 'plain_text', text: '📚 学習記録日報　2026年8月10日（月）', emoji: true } },
  { type: 'divider' },
  ...dailyStudents.flatMap((r) => [
    { type: 'section', text: { type: 'mrkdwn', text: `*${r.name}*　合計：${fmtMin(r.totalMin)}\n${r.subjects}` } },
    { type: 'divider' },
  ]),
  { type: 'section', text: { type: 'mrkdwn', text } },
  { type: 'divider' },
  { type: 'context', elements: [{ type: 'mrkdwn', text: '週間学習記録アプリより自動送信 | study-record-app-six.vercel.app' }] },
];

writeFileSync('scripts/demo-weekly-trend.json', JSON.stringify({ stats, weeklyTrendText: text, slackBlocks: blocks }, null, 2));
console.log('\n（scripts/demo-weekly-trend.json に保存しました）');
