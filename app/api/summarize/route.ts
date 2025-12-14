import { NextRequest, NextResponse } from 'next/server';
import { Paper, SummaryStyle } from '@/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
    try {
        const { papers, style } = await req.json() as { papers: Paper[], style: SummaryStyle };
        const apiKey = req.headers.get('x-google-key') || process.env.GOOGLE_API_KEY;
        const modelId = req.headers.get('x-google-model') || 'gemini-2.5-pro';

        if (!apiKey) {
            return NextResponse.json({ error: 'Google API Key is required' }, { status: 401 });
        }

        if (!papers || papers.length === 0) {
            return NextResponse.json({ error: 'No papers provided' }, { status: 400 });
        }

        const prompt = generatePrompt(papers, style);

        console.log(`Sending request to Gemini (${modelId})...`);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelId });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const content = response.text();

        return NextResponse.json({ content });

    } catch (error: any) {
        console.error('Summarize API Error:', error.message);
        return NextResponse.json(
            { error: error.message || 'Failed to generate summary' },
            { status: 500 }
        );
    }
}

function generatePrompt(papers: Paper[], style: SummaryStyle): string {
    const papersText = papers.map((p, i) => `
[${i + 1}] Title: ${p.title}
Authors: ${p.authors?.map(a => a.name).join(', ') || 'Unknown'}
Year: ${p.year || 'Unknown'}
Venue: ${p.venue || 'Unknown'}
URL: ${p.url || 'N/A'}
Abstract: ${p.abstract || 'N/A'}
`).join('\n---\n');

    let instruction = '';

    // Modes: 'overview', 'article', 'detail'
    // Also mapping legacy styles carefully just in case
    switch (style) {
        case 'overview':
        case 'abstract': // legacy fallback
            instruction = `
            【目的】検索結果のリストから得られる全体像を把握する。
            【出力形式】
            ・全体で1000文字以内。読む負担を減らすため、簡潔に。
            ・**400文字程度ごとの「見出し」で区切る**（例：## 研究のトレンド、## 主な手法、## 結論）。
            ・論文個別の要約ではなく、トレンドや共通点、相違点を中心にまとめる。
            ・専門用語は控えめに、直感的にわかる言葉で。
            `;
            break;
        case 'article':
        case 'blog': // legacy fallback
        case 'youtube': // legacy fallback
        case 'review': // legacy fallback
            instruction = `
            【目的】一般読者向けの技術ブログ記事として楽しんでもらう。
            【出力形式】
            ・文字数：2000〜5000文字。
            ・**本文中に「XX大学のXX氏らの研究(2023)によると〜」のように自然な形で引用元を盛り込むこと**。
            ・構成：キャッチーなタイトル → 導入 → 本文（400文字ごとに見出し） → まとめ。
            ・専門用語は必ず噛み砕いて解説する。
            `;
            break;
        case 'detail':
            instruction = `
            【目的】論文の内容を詳細に学習する。
            【出力形式】
            ・文字数：5000文字以上。
            ・**本文中に「(Smith et al., 2024)」のような形式、あるいは「XX氏らの報告では〜」のように引用を頻繁に行うこと**。
            ・背景、手法、結果、考察、今後の展望を網羅的に解説する。
            `;
            break;
    }

    return `
あなたはプロのサイエンスライターです。
以下の論文情報を基に、指示された形式で日本語の記事を作成してください。

## 論文リスト
${papersText}

## 絶対厳守事項（AIとしての発言禁止）
1. **「はい、承知いたしました」「記事を作成します」「以下にまとめます」などのAIとしての応答や前置きは【完全に禁止】です。**
2. **出力は、必ず記事のタイトル（Markdownの#見出し）から開始してください。それ以外の文字で始めないでください。**
3. **マークダウン形式**: 見出しは \`##\` を使用。重要な語句は太字。
4. **出典の明記**:
   - **記事の最後（フッター）に必ず「## 参考文献」セクションを設け、使用した論文のタイトルとURLをリスト表示すること。**
   - 本文内でも、どの情報のソースかがわかるように自然に触れること。
5. **事実に基づく**: リストにある論文の情報のみを使用する。

## 個別指示
${instruction}
`;
}
