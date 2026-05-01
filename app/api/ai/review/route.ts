import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'AI機能が設定されていません。' }, { status: 503 });
  }

  const body = await req.json();
  const { section, studySummary, totalMin, weekLabel } = body as {
    section: 'review' | 'improvement' | 'testStrategy';
    studySummary: Record<string, number>;
    totalMin: number;
    weekLabel: string;
  };

  // 学習サマリーを文章に変換
  function fmtTime(min: number) {
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}時間${m > 0 ? m + '分' : ''}` : `${m}分`;
  }

  const summaryText = Object.entries(studySummary)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, min]) => `${cat}：${fmtTime(min)}`)
    .join('、');

  const prompts: Record<string, string> = {
    review: `あなたは小中学生の学習をサポートする家庭教師です。
以下の週間学習データをもとに、生徒が自分の振返りを書くための参考になる下書きを作成してください。

期間：${weekLabel}
合計学習時間：${fmtTime(totalMin)}
科目別：${summaryText || 'データなし'}

【条件】
- 200字以内で簡潔に
- 生徒自身が書いたような自然な日本語（ですます調）
- 頑張ったことと、もう少し取り組めたことを1つずつ触れる
- 箇条書きは使わず、自然な文章で

下書きのみを出力してください（タイトルや説明は不要）。`,

    improvement: `あなたは小中学生の学習をサポートする家庭教師です。
以下の週間学習データをもとに、来週の改善案の下書きを作成してください。

期間：${weekLabel}
合計学習時間：${fmtTime(totalMin)}
科目別：${summaryText || 'データなし'}

【条件】
- 3つの具体的な改善案を提案
- 番号付きリスト形式（1. 〜 2. 〜 3. 〜）
- 各項目は1〜2文で具体的に
- 実行可能で無理のない内容
- 生徒目線のですます調

下書きのみを出力してください（タイトルや説明は不要）。`,

    testStrategy: `あなたは小中学生の学習をサポートする家庭教師です。
以下の週間学習データをもとに、テスト対策の下書きを作成してください。

期間：${weekLabel}
合計学習時間：${fmtTime(totalMin)}
科目別：${summaryText || 'データなし'}

【条件】
- 学習時間が少ない科目を中心にテスト対策を提案
- 150字以内で具体的に
- 生徒目線のですます調
- 箇条書きは使わず自然な文章で

下書きのみを出力してください（タイトルや説明は不要）。`,
  };

  const prompt = prompts[section];
  if (!prompt) {
    return NextResponse.json({ error: '不正なセクションです。' }, { status: 400 });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return NextResponse.json({ text });
  } catch (e) {
    console.error('Gemini error:', e);
    return NextResponse.json({ error: 'AI生成に失敗しました。しばらくしてから再試行してください。' }, { status: 500 });
  }
}
