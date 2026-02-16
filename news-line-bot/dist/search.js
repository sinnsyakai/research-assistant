"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchNews = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
dotenv_1.default.config();
const GOOGLE_KEY = process.env.GOOGLE_CUSTOM_SEARCH_KEY;
const CSE_ID = process.env.GOOGLE_CSE_ID;
const fetchGoogle = async (query, dateRestrict = 'd1') => {
    if (!GOOGLE_KEY || !CSE_ID) {
        console.error('ERROR: Missing Google API Keys');
        return [];
    }
    const url = 'https://www.googleapis.com/customsearch/v1';
    const exclusion = '-site:twitter.com -site:x.com -site:facebook.com -site:instagram.com -site:tiktok.com -site:youtube.com -site:note.com';
    const finalQuery = `${query} ${exclusion}`;
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
        const res = await axios_1.default.get(url, { params });
        const items = res.data.items || [];
        console.log(`[Search] Raw results for "${query}": ${items.length} items`);
        // Filter Logic
        const filtered = items.filter((item) => {
            const url = item.link;
            const title = item.title;
            const snippet = item.snippet;
            // Blocked Patterns
            for (const pattern of config_1.BLOCKED_PATTERNS) {
                if (pattern.test(url)) {
                    console.log(`[Search] Blocked: ${url}`);
                    return false;
                }
            }
            // Must contain Japanese characters (Simple check)
            if (!/[\u3040-\u30FF\u4E00-\u9FAF]/.test(title + snippet)) {
                console.log(`[Search] No Japanese: ${title}`);
                return false;
            }
            return true;
        });
        console.log(`[Search] After filtering: ${filtered.length} items`);
        return filtered.map((item) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            pagemap: item.pagemap
        }));
    }
    catch (error) {
        console.error('[Google Search Error]', error.response?.data?.error || error.message);
        console.error('[Google Search Error] Full response:', JSON.stringify(error.response?.data || {}));
        return [];
    }
};
const searchNews = async (queries, dateRestrict = 'd1') => {
    let allResults = [];
    // Process queries in parallel but with limits to avoid rate limits if needed
    // For now, simple Promise.all is fine for small number of queries
    const promises = queries.map(q => fetchGoogle(q, dateRestrict));
    const results = await Promise.all(promises);
    results.forEach(res => {
        allResults = [...allResults, ...res];
    });
    // Dedup by Normalized Link
    const seen = new Set();
    const uniqueResults = allResults.filter(item => {
        try {
            const u = new URL(item.link);
            const normalized = `${u.protocol}//${u.hostname}${u.pathname}`; // Ignore Query Params
            if (seen.has(normalized))
                return false;
            seen.add(normalized);
            return true;
        }
        catch (e) {
            // Fallback to strict link if URL parse fails
            if (seen.has(item.link))
                return false;
            seen.add(item.link);
            return true;
        }
    });
    return uniqueResults;
};
exports.searchNews = searchNews;
