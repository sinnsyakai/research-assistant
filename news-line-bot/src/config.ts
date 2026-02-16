import fs from 'fs';
import path from 'path';

export interface GenreConfig {
    id: string;
    name: string;
    keywords: string[];
    maxItems: number;
}

export interface AppConfig {
    genres: GenreConfig[];
    globalSettings: {
        searchPeriod: string; // 'd1', 'd3', 'w1'
        sendToLine: boolean;
    };
}

export const loadConfig = (): AppConfig => {
    try {
        const configPath = path.resolve(__dirname, '../config.json');
        const fileContent = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Failed to load config.json', error);
        // Fallback or exit
        process.exit(1);
    }
};

// ===== Blocked URL Patterns =====
// These URLs are always excluded from search results.
export const BLOCKED_PATTERNS = [
    // --- SNS / UGC ---
    /twitter\.com/i,
    /x\.com/i,
    /facebook\.com/i,
    /instagram\.com/i,
    /tiktok\.com/i,
    /youtube\.com/i,
    /linkedin\.com/i,
    /note\.com/i,
    /ameblo\.jp/i,
    /nicovideo\.jp/i,
    /togetter\.com/i,
    /5ch\.net/i,
    /2ch\.net/i,

    // --- Q&A / Forums ---
    /oshiete\.goo/i,
    /detail\.chiebukuro/i,
    /q\.hatena/i,
    /komachi\.yomiuri/i,
    /hatsugen\./i,

    // --- Shopping / Entertainment ---
    /amazon\.co\.jp/i,
    /rakuten\.co\.jp/i,
    /kakaku\.com/i,
    /pinterest/i,
    /wikibooks/i,
    /colopl\.co\.jp/i,
    /game8\.jp/i,

    // --- Government / Admin (NOT news) ---
    /\.lg\.jp/i,        // 市区町村の行政ページ
    /\.go\.jp/i,        // 中央省庁ページ (e-Gov, 各省庁)
    /pref\..+\.jp/i,    // 県庁ページ

    // --- File types (PDFs are not clickable news) ---
    /\.pdf$/i,
    /\.pdf\?/i,

    // --- Category / Index pages (not individual articles) ---
    /\/category\//i,
    /\/tag\//i,
    /\/tags\//i,

    // --- Wiki ---
    /wiki/i,

    // --- Ads / Sponsored ---
    /\/edua\/|\/adv\/|\/pr\/|\/sponsored\//i,
    /\/advertorial\/|\/native-ad\//i,
    /prtimes\.jp/i, // Press releases

    // --- Low-quality SEO blogs ---
    /niigatamom/i,
    /1onepiece\.jp/i,
    /koukoku\.jp/i,
];

// ===== Trusted News Sources (Whitelist for AI scoring boost) =====
// AI will be instructed to prefer these sources.
export const TRUSTED_DOMAINS = [
    'nikkei.com',
    'nhk.or.jp',
    'asahi.com',
    'yomiuri.co.jp',
    'mainichi.jp',
    'sankei.com',
    'reuters.com',
    'bloomberg.co.jp',
    'itmedia.co.jp',
    'impress.co.jp',
    'techcrunch.com',
    'cnet.com',
    'zdnet.com',
    'gigazine.net',
    'newspicks.com',
    'toyokeizai.net',
    'diamond.jp',
    'sbbit.jp',
    'publickey1.jp',
    'gizmodo.jp',
    'businessinsider.jp',
    'forbesjapan.com',
    'news.yahoo.co.jp',
    'kyodonews.net',
    'jiji.com',
    'edtechzine.jp',
    'kyobun.co.jp', // 教育新聞
    'resemom.jp',   // 教育メディア
    'univ-journal.jp', // 大学ジャーナル
];
