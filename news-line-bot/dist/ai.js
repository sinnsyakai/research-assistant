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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Gemini 2.0 Flash
    // Prepare prompt
    const inputData = JSON.stringify(searchResults.map(r => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet
    })));
    const prompt = `
You are an elite news editor for a busy executive who wants only the most impactful information.
Your task is to curate the top ${maxItems} news items from the provided search results for the genre "${genreName}".

### Input Data
${inputData}

### Filtering Rules (STRICT)
1. **Exclude Noise & Social Buzz**:
   - IGNORE individual opinions, X/Twitter posts, "summary of reactions", and "viral topics" unless it is a major societal phenomenon.
   - EXCLUDE "how-to" guides, affiliate blogs, game wikis, and minor app updates.
   - EXCLUDE press releases about minor partnerships or events.
2. **Prioritize High Impact**:
   - Focus on: Structural changes in industry/society, major government policies, significant tech breakthroughs, and leading company strategic moves.
   - If the news is "common knowledge" or "trivial daily update", skip it.
3. **Deduplicate**:
   - If multiple results cover the same story, pick ONLY the one with the most credible source and informative title. Do not output the same story twice.

### Output JSON Format
Return a JSON array of objects.
[
  {
    "title": "Clear, objective title (Japanese, max 40 chars)",
    "url": "Original URL",
    "summary": "Why this is important (max 80 chars)",
    "category": "${genreName}",
    "importance": 5 (Score 1-5. Only output items with score >= 3),
    "reason": "Brief reason why this was selected (for internal logic)"
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
