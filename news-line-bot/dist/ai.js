"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.curateNews = void 0;
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const GEMINI_KEY = process.env.GOOGLE_GEMINI_KEY;
const curateNews = async (searchResults, genreName, maxItems = 3) => {
    if (!GEMINI_KEY || searchResults.length === 0)
        return [];
    const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' }); // Latest stable
    // Prepare prompt
    const inputData = JSON.stringify(searchResults.map(r => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet
    })));
    const prompt = `
You are a professional news editor for a busy executive.
Your task is to review the following search results about "${genreName}" and select the most important news.

### Input Data
${inputData}

### Filtering Rules
1. **Remove Noise**: Exclude PR times, press releases of minor updates, "how-to" guides, affiliate blogs, and generic forum discussions.
2. **Prioritize Impact**: Select news that indicates a trend shift, major industry move, structural change in society, or significant new technology.
3. **Freshness**: Focus on breaking news or recent analysis.

### Output JSON Format
Select top ${maxItems} news items. Return a JSON array.
[
  {
    "title": "Clear, catchy title in Japanese (max 40 chars)",
    "url": "Original URL",
    "summary": "Concise summary of WHY this matters (max 80 chars)",
    "category": "${genreName}",
    "importance": 5 (1-5 scale)
  }
]

Do not include markdown code blocks. Just valid JSON.
`;
    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        // Clean up markdown if present
        const cleanedText = responseText.replace(/```json|```/g, '').trim();
        const newsItems = JSON.parse(cleanedText);
        return newsItems.sort((a, b) => b.importance - a.importance);
    }
    catch (error) {
        console.error('[Gemini AI Error]', error);
        return [];
    }
};
exports.curateNews = curateNews;
