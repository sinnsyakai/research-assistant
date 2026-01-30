import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { SearchResult } from './search';

dotenv.config();

const GEMINI_KEY = process.env.GOOGLE_GEMINI_KEY;

export interface CuratedNews {
    title: string;
    url: string;
    summary: string;
    category: string;
    importance: number; // 1-5
}

export const curateNews = async (
    searchResults: SearchResult[],
    genreName: string,
    maxItems: number = 3
): Promise<CuratedNews[]> => {
    if (!GEMINI_KEY || searchResults.length === 0) return [];

    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Gemini 2.0 Flash

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
        const newsItems: CuratedNews[] = JSON.parse(cleanedText);

        return newsItems.sort((a, b) => b.importance - a.importance);

    } catch (error) {
        console.error('[Gemini AI Error]', error);
        return [];
    }
};
