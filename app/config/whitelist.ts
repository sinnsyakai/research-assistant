export const SOURCE_WHITELIST = {
    news_jp: [
        'nhk.or.jp',
        'nikkei.com', // Root domain to catch all sections
        'asahi.com',  // Root domain (digital.asahi.com etc.)
        'yomiuri.co.jp', // Root domain
        'mainichi.jp',
        'jp.reuters.com',
        'news.yahoo.co.jp',
        'jiji.com',
        '47news.jp',
        'sankei.com',
        // Major Regional Papers (Block Papers)
        'at-s.com',          // Shizuoka
        'chunichi.co.jp',    // Tokai/Hokuriku
        'nishinippon.co.jp', // Kyushu
        'hokkaido-np.co.jp', // Hokkaido
        'kahoku.news',       // Tohoku
        'kobe-np.co.jp',     // Hyogo
        'kyoto-np.co.jp',    // Kyoto
        'chugoku-np.co.jp',  // Chugoku
        'news.tv-asahi.co.jp', // ANN
        'news.tbs.co.jp',      // TBS
        'fnn.jp',              // FNN
        'news.ntv.co.jp'       // Nippon TV
    ],
    news_global: [
        'reuters.com',
        'bloomberg.com',
        'nytimes.com',
        'wsj.com',
        'bbc.com',
        'cnn.com'
    ],
    media_jp: [
        'newspicks.com',
        'businessinsider.jp',
        'jbpress.ismedia.jp',
        'gendai.media',
        'diamond.jp',
        'toyokeizai.net',
        'president.jp',
        'itmedia.co.jp',
        'zenn.dev',
        'qiita.com',
        'note.com',
        'youtube.com/@NewsPicks',
        'youtube.com/@pivot00', // PIVOT
        'youtube.com/@rehacq',  // ReHacQ
        'prtimes.jp'
    ],
    media_global: [
        'techcrunch.com',
        'theverge.com',
        'wired.com',
        'medium.com',
        'arxiv.org'
    ]
};

export const CURIATION_PROMPT_TEMPLATE = `
You are an expert Research Curator.
Your goal is to select the most relevant high-quality information from the provided search results based on the user's intent.

User Intent: {{intent}}
Keywords: {{keywords}}

Selection Criteria:
1. Trustworthiness (Must be from trusted sources).
2. Relevance (Must directly answer the intent).
3. Freshness (Prioritize recent information for news).

Please analyze the results and return only the best items.
`;
