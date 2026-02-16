"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.curateNews = void 0;
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
dotenv_1.default.config();
const GEMINI_KEY = process.env.GOOGLE_GEMINI_KEY;
const curateNews = async (searchResults, genreName, maxItems = 3) => {
    if (!GEMINI_KEY || searchResults.length === 0)
        return [];
    const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    // Mark trusted sources in input data
    const inputData = JSON.stringify(searchResults.map(r => {
        let domain = '';
        try {
            domain = new URL(r.link).hostname;
        }
        catch (e) { }
        const trusted = config_1.TRUSTED_DOMAINS.some(d => domain.includes(d));
        return {
            title: r.title,
            url: r.link,
            snippet: r.snippet,
            trusted: trusted
        };
    }));
    const prompt = `
あなたは忙しいエグゼクティブのためのプロのニュースキュレーターです。
以下の検索結果から「${genreName}」に関する**最も重要なニュース記事**を最大${maxItems}件選んでください。

### 入力データ
${inputData}

### 絶対に除外するもの（これを含めたら失格）
- **行政・自治体の事務的なお知らせ**（学級閉鎖、入試情報、建設計画、条例案など）
- **PDFファイルや資料集**
- **カテゴリ一覧ページ、まとめページ、タグページ**
- **「〜とは？」「〜の方法」などの解説・ハウツー記事**
- **アフィリエイトブログ、SEO記事**（「2026年最新版」「おすすめ○選」等のタイトル）
- **プレスリリース（prtimes等）**
- **個人のSNS投稿、感想、レビュー**
- **アクセスできなさそうなURL（明らかに壊れたパス）**

### 選ぶべきニュース
- **大手メディア（NHK、日経、朝日、読売、毎日、TechCrunch、ITmedia等）の記事を最優先**
- trusted: true のソースを優先する
- **社会や業界に大きなインパクトを与えるニュース**のみ
  - 例：政府の重要政策発表、大企業の戦略転換、画期的な技術発表、社会問題の新展開
- **速報性のある最新ニュース**を重視
- 同じ話題が複数あれば、最も信頼性の高い1つだけを選ぶ

### 出力形式（JSON配列）
[
  {
    "title": "簡潔で客観的なタイトル（最大40文字）",
    "url": "元のURL",
    "summary": "なぜこのニュースが重要か（最大80文字）",
    "category": "${genreName}",
    "importance": 5
  }
]

重要度3未満のものは出力しないでください。
マークダウンのコードブロックは含めないでください。有効なJSONのみ返してください。
該当するニュースがない場合は空の配列 [] を返してください。
`;
    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        // Clean up markdown if present
        const cleanedText = responseText.replace(/```json|```/g, '').trim();
        const newsItems = JSON.parse(cleanedText);
        // Filter: only importance >= 3
        const filtered = newsItems.filter(item => item.importance >= 3);
        return filtered.sort((a, b) => b.importance - a.importance);
    }
    catch (error) {
        console.error('[Gemini AI Error]', error);
        return [];
    }
};
exports.curateNews = curateNews;
