import axios from 'axios';
import dotenv from 'dotenv';
import { BLOCKED_PATTERNS } from './config';

dotenv.config();

const GOOGLE_KEY = process.env.GOOGLE_CUSTOM_SEARCH_KEY;
const CSE_ID = process.env.GOOGLE_CSE_ID;

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    pagemap?: any;
    pubDate?: string;
}

const fetchGoogle = async (query: string, dateRestrict: string = 'd1'): Promise<SearchResult[]> => {
    if (!GOOGLE_KEY || !CSE_ID) {
        console.error('ERROR: Missing Google API Keys');
        return [];
    }

    const url = 'https://www.googleapis.com/customsearch/v1';
    // Exclude social media and non-news sites at query level
    const exclusion = '-site:twitter.com -site:x.com -site:facebook.com -site:instagram.com -site:tiktok.com -site:youtube.com -site:note.com -site:ameblo.jp -filetype:pdf';
    // Add "ニュース" to bias towards news articles
    const finalQuery = `${query} ニュース ${exclusion}`;

    const params = {
        key: GOOGLE_KEY,
        cx: CSE_ID,
        q: finalQuery,
        num: 10,
        dateRestrict: dateRestrict,
        gl: 'jp',
        hl: 'ja',
        lr: 'lang_ja'
    };

    try {
        console.log(`[Search] Fetching: "${query}" (dateRestrict: ${dateRestrict})`);
        const res = await axios.get(url, { params });
        const items = res.data.items || [];
        console.log(`[Search] Raw results for "${query}": ${items.length} items`);

        // Filter Logic
        const filtered = items.filter((item: any) => {
            const itemUrl = item.link;
            const title = item.title;
            const snippet = item.snippet;

            // Blocked Patterns (URL)
            for (const pattern of BLOCKED_PATTERNS) {
                if (pattern.test(itemUrl)) {
                    console.log(`[Search] Blocked: ${itemUrl}`);
                    return false;
                }
            }

            // Block PDFs (double check)
            if (itemUrl.toLowerCase().endsWith('.pdf')) {
                console.log(`[Search] Blocked PDF: ${itemUrl}`);
                return false;
            }

            // Must contain Japanese characters
            if (!/[\u3040-\u30FF\u4E00-\u9FAF]/.test(title + snippet)) {
                console.log(`[Search] No Japanese: ${title}`);
                return false;
            }

            // Block category / index pages (URL pattern)
            if (/\/category\/|\/tag\/|\/tags\/|\/archive\//.test(itemUrl)) {
                console.log(`[Search] Blocked category page: ${itemUrl}`);
                return false;
            }

            // Block titles that look like site indexes / not articles
            if (/一覧|カテゴリ|トップページ|ホーム$/.test(title)) {
                console.log(`[Search] Blocked index page title: ${title}`);
                return false;
            }

            return true;
        });

        console.log(`[Search] After filtering: ${filtered.length} items`);

        return filtered.map((item: any) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            pagemap: item.pagemap
        }));

    } catch (error: any) {
        console.error('[Google Search Error]', error.response?.data?.error || error.message);
        return [];
    }
};

// Helper to normalize URL
const normalizeUrl = (link: string): string => {
    try {
        const u = new URL(link);
        return `${u.protocol}//${u.hostname}${u.pathname}`;
    } catch (e) {
        return link;
    }
};

export const searchNews = async (queries: string[], dateRestrict: string = 'd1'): Promise<SearchResult[]> => {
    let allResults: SearchResult[] = [];

    const promises = queries.map(q => fetchGoogle(q, dateRestrict));
    const results = await Promise.all(promises);

    results.forEach(res => {
        allResults = [...allResults, ...res];
    });

    // Dedup by Normalized Link
    const seen = new Set();
    const uniqueResults = allResults.filter(item => {
        const normalized = normalizeUrl(item.link);
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    });

    return uniqueResults;
};
