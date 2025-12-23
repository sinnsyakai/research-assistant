import { NextRequest, NextResponse } from 'next/server';

const OPENALEX_URL = 'https://api.openalex.org/works';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    let query = searchParams.get('query');
    const sort = searchParams.get('sort');
    const page = searchParams.get('page') || '1';
    const mode = searchParams.get('mode') || 'default';

    const searchApiKey = req.headers.get('x-google-search-key');
    const searchEngineId = req.headers.get('x-google-cse-id');

    console.log(`[API] Search - Mode: ${mode}, Query: ${query}, Page: ${page}`);

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        let allResults: any[] = [];
        const wantsPapers = mode === 'papers';
        const wantsWeb = mode === 'default' || mode === 'news' || mode === 'global';
        const isGlobalMode = mode === 'global';

        const apiKey = req.headers.get('x-gemini-key');

        // --- Smart Date: Detect News Intent from Keywords ---
        let isNewsIntent = mode === 'news';
        const newsKeywords = /ニュース|最新|最近|今|今週|今月|速報|アップデート|更新|news|latest|recent|update|today|this week|this month/i;
        if (newsKeywords.test(query)) {
            isNewsIntent = true;
            console.log('[Smart Date] News intent detected from keywords:', query);
        }

        // --- AI QUERY DISAMBIGUATION ---
        // Understand user intent and clarify ambiguous queries
        let clarifiedQuery = query;
        if (apiKey && !isGlobalMode) {
            try {
                const { GoogleGenerativeAI } = await import('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

                const disambiguationPrompt = `You are a search query optimizer. Analyze this Japanese search query and clarify any ambiguous terms.

Query: "${query}"

Rules:
1. If "マスク" appears with health/medical context, it means "face mask" (フェイスマスク), NOT "Elon Musk"
2. If "マスク" appears with tech/business context, it might mean "Elon Musk" (イーロン・マスク)
3. Add clarifying terms to make the search intent clear
4. Keep the query in Japanese
5. Return ONLY the clarified query, nothing else

Example: "マスク 効果" → "フェイスマスク 感染予防 効果"
Example: "マスク Twitter" → "イーロン・マスク Twitter"`;

                const result = await model.generateContent(disambiguationPrompt);
                const clarified = result.response.text().trim();
                if (clarified && clarified.length > 0 && clarified !== query) {
                    clarifiedQuery = clarified;
                    console.log(`[Query Disambiguation] "${query}" -> "${clarifiedQuery}"`);
                }
            } catch (e) {
                console.error('[Query Disambiguation] Failed:', e);
            }
        }

        // --- GLOBAL MODE: Translate Japanese query to English ---
        let searchQuery = clarifiedQuery;
        if (isGlobalMode && apiKey) {
            // Always translate for global mode
            try {
                const { GoogleGenerativeAI } = await import('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

                const translationPrompt = `You are translating a Japanese search query for US Google search.

RULES:
1. Translate the MEANING, not literally
2. Keep it SIMPLE - just a few key words, no complex syntax
3. DO NOT use quotes around phrases
4. DO NOT use OR operators
5. Expand abstract terms to 2-3 specific examples:
   - SNS → TikTok Instagram YouTube Twitter
   - スイーツ → desserts cake pastry
   - 睡眠障害 → sleep disorders insomnia
6. For news queries, add "news" or "latest"

Examples:
- "SNSの最新情報" → "TikTok Instagram YouTube Twitter latest news"
- "スイーツ トレンド" → "trending desserts pastry cakes 2024"
- "睡眠障害 治療" → "sleep disorders treatment insomnia"

Japanese Query: "${clarifiedQuery}"

Return ONLY simple English keywords (no quotes, no OR):`;

                const result = await model.generateContent(translationPrompt);
                const translated = result.response.text().trim();
                if (translated && translated.length > 0) {
                    searchQuery = translated;
                    console.log(`[Global] Translated query: "${clarifiedQuery}" -> "${searchQuery}"`);
                }
            } catch (e) {
                console.error('[Global] Translation failed:', e);
            }
        }

        // --- Google Custom Search ---
        if (wantsWeb && searchApiKey && searchEngineId) {
            const userDate = searchParams.get('date');
            let dateRestrict: string | undefined = 'y1'; // Default: 1 year

            // Smart Date Logic
            if (!userDate || userDate === 'all') {
                if (isNewsIntent) {
                    dateRestrict = 'm1'; // Force 1 month for news
                    console.log('[Smart Date] Applied m1 (1 month) filter');
                }
            } else {
                if (userDate === '1w') dateRestrict = 'w1';
                else if (userDate === '1m') dateRestrict = 'm1';
                else if (userDate === '1y') dateRestrict = 'y1';
                else if (userDate === '5y') dateRestrict = 'y5';
                else if (userDate === '6y+') dateRestrict = undefined;
            }

            const fetchGoogle = async (q: string, num: number, start: number, dateR?: string) => {
                const u = new URL('https://www.googleapis.com/customsearch/v1');
                u.searchParams.set('key', searchApiKey);
                u.searchParams.set('cx', searchEngineId);
                u.searchParams.set('q', q);
                u.searchParams.set('num', num.toString());
                u.searchParams.set('start', start.toString());
                if (dateR) u.searchParams.set('dateRestrict', dateR);

                if (isGlobalMode) {
                    u.searchParams.set('gl', 'us');
                    u.searchParams.set('hl', 'en');
                    // Don't use lr=lang_en - it's too restrictive
                } else {
                    // Japanese mode: Force Japanese language results
                    u.searchParams.set('gl', 'jp');
                    u.searchParams.set('hl', 'ja');
                    u.searchParams.set('lr', 'lang_ja');
                }

                const res = await fetch(u.toString());
                const data = await res.json();

                // Debug logging
                if (data.error) {
                    console.error('[Google API Error]', JSON.stringify(data.error));
                }
                if (!data.items) {
                    console.log('[Google API] No items returned. searchInformation:', JSON.stringify(data.searchInformation || {}));
                }

                return data;
            };

            const uiPage = parseInt(page) || 1;
            const baseStart = (uiPage - 1) * 10 + 1;

            // --- TRUSTED SOURCE WHITELIST ---
            const trustedSources = isGlobalMode
                ? 'site:reuters.com OR site:bbc.com OR site:nytimes.com OR site:theguardian.com OR site:washingtonpost.com OR site:cnn.com OR site:techcrunch.com OR site:wired.com OR site:theverge.com OR site:arstechnica.com OR site:forbes.com OR site:bloomberg.com'
                : 'site:nhk.or.jp OR site:asahi.com OR site:yomiuri.co.jp OR site:mainichi.jp OR site:sankei.com OR site:jiji.com OR site:businessinsider.jp OR site:itmedia.co.jp OR site:gigazine.net';

            // Phase 1: Search trusted sources first
            const trustedQuery = `${searchQuery} (${trustedSources})`;
            const [trustedRes, trustedRes2] = await Promise.all([
                fetchGoogle(trustedQuery, 10, 1, dateRestrict),
                fetchGoogle(trustedQuery, 10, 11, dateRestrict)
            ]);

            let trustedItems = [...(trustedRes.items || []), ...(trustedRes2.items || [])];
            console.log(`[Search] Trusted source items: ${trustedItems.length}`);

            // Phase 2: ALWAYS search general to ensure we have results
            const [webRes, webRes2, webRes3] = await Promise.all([
                fetchGoogle(searchQuery, 10, baseStart, dateRestrict),
                fetchGoogle(searchQuery, 10, baseStart + 10, dateRestrict),
                fetchGoogle(searchQuery, 10, baseStart + 20, dateRestrict)
            ]);
            let generalItems = [...(webRes.items || []), ...(webRes2.items || []), ...(webRes3.items || [])];
            console.log(`[Search] General items: ${generalItems.length}`);

            // YouTube (only for non-global)
            let ytItems: any[] = [];
            if (!isGlobalMode) {
                const ytRes = await fetchGoogle(`${query} site:youtube.com`, 10, 1, dateRestrict);
                ytItems = ytRes.items || [];
            }

            // Combine: trusted first, then general, then YouTube
            let allItems = [...trustedItems, ...generalItems, ...ytItems];

            console.log(`[Search] Raw items: ${allItems.length}`);

            // --- ARTICLE-ONLY FILTER (Whitelist Approach) ---
            // Only ALLOW URLs that look like individual articles
            const isArticlePage = (url: string): boolean => {
                if (!url) return false;
                const lowerUrl = url.toLowerCase();

                // YouTube: Only allow video watch pages
                if (lowerUrl.includes('youtube.com')) {
                    return lowerUrl.includes('/watch?v=');
                }

                const pathMatch = url.match(/^https?:\/\/[^\/]+(\/.*)$/);
                const path = pathMatch ? pathMatch[1] : '/';

                // Skip homepage
                if (path === '/' || path === '') return false;

                // === ARTICLE DETECTION (must match at least one) ===

                // 1. Has date in URL (most reliable indicator of article)
                const hasDateInUrl = /\/\d{4}\/\d{2}\/\d{2}\//.test(path) ||
                    /\/\d{4}-\d{2}-\d{2}\//.test(path) ||
                    /\/\d{4}\/\d{2}\//.test(path) ||
                    /\/\d{8}\//.test(path);

                // 2. Has article ID pattern
                const hasArticleId = /\/articles?\/\d+/.test(path) ||
                    /\/news\/\d+/.test(path) ||
                    /\/story\/\d+/.test(path) ||
                    /\/\d{5,}/.test(path) ||  // 5+ digit ID
                    /\/(sp|sph|amp)\/.*\d+/.test(path);

                // 3. Has slug-like pattern (word-word-word)
                const hasSlug = /\/[a-z0-9]+-[a-z0-9]+-[a-z0-9]+/.test(path);

                // 4. NHK/specific patterns
                const isNhkArticle = lowerUrl.includes('nhk.or.jp') && /\/news\/html\/\d+/.test(path);
                const isYahooNews = lowerUrl.includes('news.yahoo.co.jp') && /\/articles\//.test(path);

                const isLikelyArticle = hasDateInUrl || hasArticleId || hasSlug || isNhkArticle || isYahooNews;

                if (!isLikelyArticle) {
                    console.log(`[Filter] Not article (no pattern match): ${url}`);
                    return false;
                }

                // === Detect product/shopping intent ===
                const productKeywords = /商品|製品|レビュー|比較|スペック|性能|価格|購入|買う|おすすめ|ランキング|product|review|comparison|specs|price|buy|best|vs\b/i;
                const wantsProductInfo = productKeywords.test(query);

                // === STILL BLOCK THESE EVEN IF LOOKS LIKE ARTICLE ===
                const blockedPatterns: RegExp[] = [
                    // Q&A sites
                    /chiebukuro|oshiete|okwave|quora|stackoverflow/i,
                    /発言小町|komachi\.yomiuri/i,  // 発言小町
                    /hatsugen\./i,
                    // Personal/promotional blogs & low-quality sites
                    /ameblo|note\.com|hatena|livedoor|seesaa|jugem|fc2\.com|blogspot/i,
                    /niigatamom|ママブログ|子育てブログ/i,  // Personal mom blogs
                    // PR/Advertorial sections
                    /\/edua\/|\/adv\/|\/pr\/|\/sponsored\//i,
                    /\/advertorial\/|\/native-ad\//i,
                    // Dictionary/reference
                    /wikipedia|weblio|kotobank|goo\.ne\.jp\/word/i,
                    // Bulletin boards / Forums
                    /5ch\.net|5chan|2ch\.net|2chan|2ちゃんねる|5ちゃんねる/i,
                    /reddit\.com|4chan|8chan|8kun/i,
                    /bakusai\.com|爆サイ/i,
                    /machi\.to|したらば|jbbs\.shitaraba/i,
                    /\/bbs\//i,
                    /\/thread\//i,
                    /\/forum\//i,
                    // Spam/suspicious domains
                    /\.sk\/|\.ru\/|\.xyz\/|\.top\/|\.pw\//i,
                    /washapp\.|mature|adult|xxx/i,
                    // Specific list page patterns
                    /\/tag\/[^\/]+\/?$/i,
                    /\/keyword\/[^\/]+\/?$/i,
                    /\/list\/?$/i,
                    /\/archive\/?$/i,
                    /\/pl\/news-nwa-topic/i,
                    /\/newsweb\/pl\//i,
                    // Section landing pages (short paths like /food, /business, /trends)
                    /\/(food|business|trends|politics|world|tech|technology|entertainment|sports|lifestyle|international|opinion)\/?\s*$/i,
                    /\/(section|rubric|channel)\/[^\/]+\/?$/i,
                ];

                // Only block shopping/product sites if NOT product search
                if (!wantsProductInfo) {
                    blockedPatterns.push(
                        /amazon|rakuten|mercari|yahoo\.co\.jp\/shopping|aliexpress|ebay/i,
                        /kakaku\.com|価格\.com/i,
                        /\/books?\//i,
                        /\/product\//i,
                        /\/shop\//i,
                        /\/store\//i,
                        /\/ranking/i,
                        /best-.*-review|top-\d+-/i,
                        /affiliate|sponsored/i,
                    );
                }

                for (const pattern of blockedPatterns) {
                    if (pattern.test(lowerUrl)) {
                        console.log(`[Filter] Blocked pattern: ${url}`);
                        return false;
                    }
                }

                // --- SMART LIST PAGE DETECTION ---
                // Block topic/spotlight/category pages ONLY if they look like list pages (not articles)
                const pathSegments = new URL(url).pathname.split('/').filter(Boolean);
                const listPagePatterns = /\/(topics|topic|spotlight|category|section|news\/topics)\//i;

                if (listPagePatterns.test(url)) {
                    // Check if it's an article page (has date pattern or long article ID)
                    const hasDatePattern = /\/\d{4}\/\d{2}\/|\/\d{4}-\d{2}-|\/\d{8}\//.test(url);
                    const hasArticleId = /\/[a-z0-9]{20,}|\/\d{6,}|\/article\//.test(lowerUrl);
                    const hasLongPath = pathSegments.length >= 4;

                    // If it looks like an article, allow it
                    if (hasDatePattern || hasArticleId || hasLongPath) {
                        console.log(`[Filter] Allowed article in list section: ${url}`);
                        return true;
                    }

                    // Otherwise it's a list page, block it
                    console.log(`[Filter] Blocked list page: ${url}`);
                    return false;
                }

                return true;
            };

            // Global mode: Filter out Japanese sites (but allow Chinese, Korean, etc.)
            if (isGlobalMode) {
                allItems = allItems.filter((item: any) => {
                    const url = item.link?.toLowerCase() || '';
                    const title = item.title || '';
                    const path = new URL(item.link || 'http://x').pathname;

                    // Skip homepage
                    if (path === '/' || path === '') return false;

                    // Block Japanese domains and Japanese sections of international sites
                    if (url.includes('.jp/') ||
                        url.includes('.co.jp') ||
                        url.includes('/japanese/') ||       // BBC Japanese, etc.
                        url.includes('/ja/') ||             // Japanese language sections
                        url.includes('nippon') ||
                        url.includes('nikkei') ||
                        url.includes('nhk.or') ||
                        url.includes('asahi.com') ||
                        url.includes('yomiuri')) {
                        console.log(`[Global Filter] Blocked JP site: ${url}`);
                        return false;
                    }

                    // Block if title contains JAPANESE-SPECIFIC characters (hiragana/katakana only)
                    // Do NOT block CJK characters (漢字) as they're shared with Chinese
                    const hasHiragana = /[\u3040-\u309F]/.test(title);  // ひらがな
                    const hasKatakana = /[\u30A0-\u30FF]/.test(title);  // カタカナ
                    if (hasHiragana || hasKatakana) {
                        console.log(`[Global Filter] Blocked JP title: ${title}`);
                        return false;
                    }

                    return true;
                });
                console.log(`[Global] After JP filter: ${allItems.length} items`);
            } else {
                allItems = allItems.filter((item: any) => isArticlePage(item.link));
            }

            // --- DEDUPLICATION (URL + Title) ---
            const seenUrls = new Set<string>();
            const seenTitleKeys = new Set<string>();

            // Normalize URL for comparison
            const normalizeUrl = (url: string): string => {
                try {
                    const u = new URL(url);
                    let path = u.pathname.replace(/\/$/, '');
                    u.searchParams.delete('utm_source');
                    u.searchParams.delete('utm_medium');
                    u.searchParams.delete('utm_campaign');
                    u.searchParams.delete('ref');
                    u.searchParams.delete('from');
                    return `${u.hostname}${path}`;
                } catch {
                    return url;
                }
            };

            // Normalize title - extract core content
            const normalizeTitle = (title: string): string => {
                return title
                    .replace(/\s*[-–—|｜:：]\s*[^-–—|｜:：]+$/, '')
                    .replace(/【.*?】/g, '')
                    .replace(/\[.*?\]/g, '')
                    .replace(/\s+/g, '')
                    .toLowerCase()
                    .substring(0, 40);
            };

            allItems = allItems.filter((item: any) => {
                const normalizedUrl = normalizeUrl(item.link || '');
                const normalizedTitle = normalizeTitle(item.title || '');

                if (seenUrls.has(normalizedUrl)) {
                    console.log(`[Dedup] Skipping duplicate URL: ${item.link}`);
                    return false;
                }
                seenUrls.add(normalizedUrl);

                if (normalizedTitle.length > 10 && seenTitleKeys.has(normalizedTitle)) {
                    console.log(`[Dedup] Skipping duplicate title: ${item.title}`);
                    return false;
                }
                if (normalizedTitle.length > 10) {
                    seenTitleKeys.add(normalizedTitle);
                }

                return true;
            });

            console.log(`[Filter] After dedup: ${allItems.length} items`);

            // --- Simple URL-based Filtering (No AI) ---
            const govKeywords = /官公庁|行政|政府|省庁|自治体|市役所|区役所|町役場|村役場|都道府県|北海道|青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|東京|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|京都|大阪|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄|文部科学省|スポーツ庁|厚生労働省|経済産業省|総務省|国土交通省|環境省|農林水産省|法務省|外務省|財務省|防衛省|内閣府/;
            const wantsGovInfo = govKeywords.test(query);

            let finalItems = allItems;

            if (!wantsGovInfo) {
                finalItems = allItems.filter((item: any) => {
                    const url = item.link?.toLowerCase() || '';
                    if (url.includes('.go.jp') || url.includes('.lg.jp')) return false;
                    return true;
                });
            }

            finalItems = finalItems.slice(0, 20);
            console.log(`[Filter] Final items: ${finalItems.length}`);

            // Format results with comprehensive date extraction
            const newsResults = finalItems.map((item: any) => {
                const isYt = item.displayLink?.includes('youtube.com');
                const metatags = item.pagemap?.metatags?.[0] || {};

                // === COMPREHENSIVE DATE EXTRACTION ===
                let pubDate: string | undefined;

                const dateFields = [
                    metatags['article:published_time'],
                    metatags['article:modified_time'],
                    metatags['date'],
                    metatags['pubdate'],
                    metatags['datepublished'],
                    metatags['datePublished'],
                    metatags['uploadDate'],
                    metatags['og:updated_time'],
                    metatags['og:article:published_time'],
                    metatags['og:video:release_date'],
                    metatags['dcterms.date'],
                    metatags['sailthru.date'],
                    item.pagemap?.newsarticle?.[0]?.datepublished,
                    item.pagemap?.article?.[0]?.datepublished,
                    item.pagemap?.videoobject?.[0]?.uploaddate
                ];

                for (const dateField of dateFields) {
                    if (dateField) {
                        try {
                            const d = new Date(dateField);
                            if (!isNaN(d.getTime())) {
                                pubDate = d.toISOString().split('T')[0];
                                break;
                            }
                        } catch { }
                    }
                }

                // Fallback: Extract from URL patterns
                if (!pubDate) {
                    const urlPatterns = [
                        /\/(\d{4})\/(\d{2})\/(\d{2})\//,
                        /\/(\d{4})-(\d{2})-(\d{2})\//,
                        /\/(\d{4})(\d{2})(\d{2})\//,
                        /[?&]date=(\d{4})-?(\d{2})-?(\d{2})/
                    ];
                    for (const pattern of urlPatterns) {
                        const match = item.link?.match(pattern);
                        if (match) {
                            pubDate = `${match[1]}-${match[2]}-${match[3]}`;
                            break;
                        }
                    }
                }

                // Fallback: Extract from snippet (Japanese/English formats)
                if (!pubDate && item.snippet) {
                    const snippetPatterns = [
                        { re: /(\d{4})年(\d{1,2})月(\d{1,2})日/, fn: (m: RegExpMatchArray) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` },
                        { re: /(\d{4})\/(\d{1,2})\/(\d{1,2})/, fn: (m: RegExpMatchArray) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` },
                        { re: /(\d{4})-(\d{1,2})-(\d{1,2})/, fn: (m: RegExpMatchArray) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` },
                        {
                            re: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i, fn: (m: RegExpMatchArray) => {
                                const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
                                return `${m[3]}-${months[m[1].toLowerCase()]}-${m[2].padStart(2, '0')}`;
                            }
                        },
                        { re: /(\d{1,2})月(\d{1,2})日/, fn: (m: RegExpMatchArray) => `2024-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` }
                    ];
                    for (const { re, fn } of snippetPatterns) {
                        const match = item.snippet.match(re);
                        if (match) {
                            pubDate = fn(match);
                            break;
                        }
                    }
                }

                // Fallback: Relative dates (3日前, 1週間前, etc.)
                if (!pubDate && item.snippet) {
                    const relativePatterns = [
                        { re: /(\d+)\s*日前/, fn: (d: number) => { const n = new Date(); n.setDate(n.getDate() - d); return n; } },
                        { re: /(\d+)\s*時間前/, fn: (h: number) => { const n = new Date(); n.setHours(n.getHours() - h); return n; } },
                        { re: /(\d+)\s*週間?前/, fn: (w: number) => { const n = new Date(); n.setDate(n.getDate() - w * 7); return n; } },
                        { re: /(\d+)\s*か?月前/, fn: (m: number) => { const n = new Date(); n.setMonth(n.getMonth() - m); return n; } }
                    ];
                    for (const { re, fn } of relativePatterns) {
                        const match = item.snippet.match(re);
                        if (match) {
                            const date = fn(parseInt(match[1]));
                            pubDate = date.toISOString().split('T')[0];
                            break;
                        }
                    }
                }

                return {
                    paperId: item.cacheId || item.link,
                    title: item.title,
                    abstract: item.snippet,
                    url: item.link,
                    year: pubDate?.substring(0, 4),
                    publicationDate: pubDate,
                    authors: [{ name: item.displayLink }],
                    venue: isYt ? 'YouTube' : item.displayLink,
                    country: isGlobalMode ? 'US' : 'JP'
                };
            });

            // --- AI POST-SEARCH RELEVANCE FILTER ---
            // Ask AI to identify which results are actually relevant to the query
            if (apiKey && newsResults.length > 0) {
                try {
                    const { GoogleGenerativeAI } = await import('@google/generative-ai');
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

                    const itemsForReview = newsResults.slice(0, 15);
                    const reviewList = itemsForReview.map((r: any, i: number) =>
                        `${i + 1}. ${r.title}`
                    ).join('\n');

                    const relevancePrompt = `You are a search result quality filter.

User Query: "${query}"

Search Results:
${reviewList}

Task: Identify which results are RELEVANT to the user's query.
- Return ONLY the numbers of RELEVANT results as a JSON array
- A result is relevant if it directly relates to the query topic
- Generic section pages (like "Food Section", "Business News") are NOT relevant
- Results about unrelated topics are NOT relevant

Example: If query is "スイーツ" and result 3 and 5 are about desserts, return: [3, 5]

Return ONLY the JSON array of numbers, nothing else:`;

                    const result = await model.generateContent(relevancePrompt);
                    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
                    const relevantIndices = JSON.parse(text);

                    if (Array.isArray(relevantIndices) && relevantIndices.length > 0) {
                        const relevantSet = new Set(relevantIndices.map((n: number) => n - 1)); // Convert to 0-indexed
                        const filteredResults = newsResults.filter((_: any, i: number) =>
                            i >= 15 || relevantSet.has(i) // Keep items beyond 15 and relevant ones
                        );
                        console.log(`[AI Relevance] Kept ${relevantSet.size} of ${itemsForReview.length} results as relevant`);
                        newsResults.splice(0, newsResults.length, ...filteredResults);
                    }
                } catch (e) {
                    console.error('[AI Relevance] Filter failed:', e);
                    // Continue with unfiltered results if AI fails
                }
            }

            // --- TRANSLATE GLOBAL RESULTS TO JAPANESE ---
            if (isGlobalMode && apiKey && newsResults.length > 0) {
                try {
                    const { GoogleGenerativeAI } = await import('@google/generative-ai');
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

                    // Translate ALL results (up to 20)
                    const itemsToTranslate = newsResults.slice(0, 20);
                    const textToTranslate = itemsToTranslate.map((r: any, i: number) =>
                        `${i + 1}. TITLE: ${r.title}\nABSTRACT: ${r.abstract || ''}`
                    ).join('\n\n');

                    const prompt = `Translate the following search results to Japanese. Keep the format exactly the same.
Return ONLY the translations in JSON format like: [{"title": "日本語タイトル", "abstract": "日本語要約"}, ...]

${textToTranslate}`;

                    const result = await model.generateContent(prompt);
                    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
                    const translations = JSON.parse(text);

                    if (Array.isArray(translations)) {
                        translations.forEach((trans: any, i: number) => {
                            if (newsResults[i] && trans.title) {
                                newsResults[i].title = trans.title;
                                if (trans.abstract) newsResults[i].abstract = trans.abstract;
                            }
                        });
                        console.log(`[Global] Translated ${translations.length} results to Japanese`);
                    }
                } catch (e) {
                    console.error('[Global] Translation failed:', e);
                    // Continue with English results if translation fails
                }
            }

            allResults.push(...newsResults);
            console.log(`[Search] Final results: ${newsResults.length}`);
        } else if (wantsWeb) {
            allResults.push({
                paperId: 'sys-err',
                title: '⚠️ 設定が必要です',
                abstract: 'Google Search API KeyとEngine IDを設定してください。',
                url: '#', authors: [{ name: 'System' }], venue: 'System', country: 'JP'
            });
        }

        // --- OpenAlex (Papers) ---
        if (wantsPapers) {
            // Translate query to English for better OpenAlex results
            let paperQuery = query;
            if (apiKey) {
                const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(query);
                if (isJapanese) {
                    try {
                        const { GoogleGenerativeAI } = await import('@google/generative-ai');
                        const genAI = new GoogleGenerativeAI(apiKey);
                        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

                        const paperTranslationPrompt = `You are translating a Japanese search query for academic paper search (OpenAlex API).

CRITICAL INSTRUCTIONS:
1. Translate to proper English ACADEMIC terminology
2. For umbrella terms, EXPAND to include specific subtypes:
   - 睡眠障害 → "sleep disorders" OR insomnia OR "sleep apnea" OR narcolepsy
   - SNS → "social media" OR TikTok OR Instagram OR Twitter
   - Use OR to include related terms for broader results

3. For multi-word concepts, use quotes for PHRASE SEARCH:
   - 睡眠障害 → "sleep disorders" (not: sleep disorders)
   - 性機能 → "sexual function" (not: sexual function)

4. Format: Use quotes for phrases, OR for alternatives
   Example: "sleep disorders" OR insomnia OR "sleep apnea"

Japanese Query: "${query}"

Return ONLY the optimized English search query:`;

                        const result = await model.generateContent(paperTranslationPrompt);
                        const translated = result.response.text().trim();
                        if (translated && translated.length > 0) {
                            paperQuery = translated;
                            console.log(`[Papers] Translated query: "${query}" -> "${paperQuery}"`);
                        }
                    } catch (e) {
                        console.error('[Papers] Query translation failed:', e);
                    }
                }
            }

            const url = new URL(OPENALEX_URL);
            url.searchParams.set('search', paperQuery);
            url.searchParams.set('per_page', '30');
            url.searchParams.set('page', page);
            // Filter: has abstract, published in last 5 years (2020+)
            const currentYear = new Date().getFullYear();
            url.searchParams.set('filter', `has_abstract:true,publication_year:>${currentYear - 5}`);
            // Sort by publication year first, then relevance
            if (sort === 'publication_year') {
                url.searchParams.set('sort', 'publication_year:desc');
            } else {
                // Even for relevance, prioritize recent papers
                url.searchParams.set('sort', 'publication_year:desc,relevance_score:desc');
            }

            try {
                const res = await fetch(url.toString(), {
                    headers: { 'User-Agent': 'ResearchAssistant/1.0' }
                });
                if (res.ok) {
                    const data = await res.json();
                    const currentYear = new Date().getFullYear();

                    let papers = data.results
                        .filter((work: any) => {
                            // Filter out papers with invalid/future dates
                            const year = work.publication_year;
                            if (!year || year > currentYear) return false;
                            return true;
                        })
                        .map((work: any) => ({
                            paperId: work.id,
                            title: work.display_name,
                            abstract: reconstructAbstract(work.abstract_inverted_index) || '',
                            url: work.primary_location?.landing_page_url || work.id,
                            year: work.publication_year,
                            publicationDate: work.publication_date,
                            authors: work.authorships?.slice(0, 3).map((a: any) => ({ name: a.author.display_name })) || [],
                            venue: work.primary_location?.source?.display_name || 'Unknown',
                            country: work.primary_location?.source?.country_code?.toUpperCase()
                        }));

                    // If no JP results, retry without country filter
                    if (papers.length < 5) {
                        const url2 = new URL(OPENALEX_URL);
                        url2.searchParams.set('search', query);
                        url2.searchParams.set('per_page', '30');
                        url2.searchParams.set('page', page);
                        url2.searchParams.set('filter', 'has_abstract:true');
                        url2.searchParams.set('sort', 'relevance_score:desc');

                        const res2 = await fetch(url2.toString(), {
                            headers: { 'User-Agent': 'ResearchAssistant/1.0' }
                        });
                        if (res2.ok) {
                            const data2 = await res2.json();
                            const additionalPapers = data2.results.map((work: any) => ({
                                paperId: work.id,
                                title: work.display_name,
                                abstract: reconstructAbstract(work.abstract_inverted_index) || '',
                                url: work.primary_location?.landing_page_url || work.id,
                                year: work.publication_year,
                                publicationDate: work.publication_date,
                                authors: work.authorships?.slice(0, 3).map((a: any) => ({ name: a.author.display_name })) || [],
                                venue: work.primary_location?.source?.display_name || 'Unknown',
                                country: work.primary_location?.source?.country_code?.toUpperCase()
                            }));
                            papers = [...papers, ...additionalPapers];
                        }
                    }

                    // Translate English titles AND abstracts to Japanese
                    if (apiKey && papers.length > 0) {
                        const englishPapers = papers.filter((p: any) => !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(p.title));
                        if (englishPapers.length > 0) {
                            try {
                                const { GoogleGenerativeAI } = await import('@google/generative-ai');
                                const genAI = new GoogleGenerativeAI(apiKey);
                                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

                                const papersToTranslate = englishPapers.slice(0, 30);
                                const dataToTranslate = papersToTranslate.map((p: any, i: number) =>
                                    `${i + 1}. TITLE: ${p.title}\nABSTRACT: ${(p.abstract || '').substring(0, 300)}`
                                ).join('\n\n');

                                const prompt = `Translate these academic paper titles and abstracts to Japanese.
Return ONLY a JSON array with objects containing "title" and "abstract" in order.

${dataToTranslate}

Return format: [{"title": "翻訳タイトル", "abstract": "翻訳要約"}, ...]`;

                                const result = await model.generateContent(prompt);
                                const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
                                const translations = JSON.parse(text);

                                if (Array.isArray(translations)) {
                                    papersToTranslate.forEach((paper: any, i: number) => {
                                        if (translations[i]) {
                                            if (translations[i].title) paper.title = translations[i].title;
                                            if (translations[i].abstract) paper.abstract = translations[i].abstract;
                                        }
                                    });
                                    console.log(`[Papers] Translated ${translations.length} titles+abstracts to Japanese`);
                                }
                            } catch (e) {
                                console.error('[Papers] Translation failed:', e);
                            }
                        }
                    }

                    allResults.push(...papers);
                }
            } catch (e) {
                console.error('OpenAlex failed', e);
            }
        }

        return NextResponse.json({ data: allResults });

    } catch (error: any) {
        console.error('Search Error:', error);
        return NextResponse.json({ error: 'Search failed', details: error.message }, { status: 500 });
    }
}

function reconstructAbstract(invertedIndex: Record<string, number[]> | null): string | null {
    if (!invertedIndex) return null;
    try {
        const maxIndex = Math.max(...Object.values(invertedIndex).flat());
        const words = new Array(maxIndex + 1).fill('');
        Object.entries(invertedIndex).forEach(([word, positions]) => {
            positions.forEach(pos => { words[pos] = word; });
        });
        return words.join(' ');
    } catch { return null; }
}
