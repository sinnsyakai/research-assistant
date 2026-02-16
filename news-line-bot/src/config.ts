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

export const BLOCKED_PATTERNS = [
    /wikibooks/i,
    /pinterest/i,
    /oshiete\.goo/i,
    /detail\.chiebukuro/i,
    /q\.hatena/i,
    /colopl\.co\.jp/i,
    /game8\.jp/i,
    /wiki/i,
    /nicovideo\.jp/i,
    /amazon\.co\.jp/i,
    /rakuten\.co\.jp/i,
    /kakaku\.com/i,
    /togetter\.com/i,
    /5ch\.net/i,
    /2ch\.net/i,
    /komachi\.yomiuri/i,
    /hatsugen\./i,
    /niigatamom/i,
    /\/edua\/|\/adv\/|\/pr\/|\/sponsored\//i,
    /\/advertorial\/|\/native-ad\//i,
    /twitter\.com/i,
    /x\.com/i,
    /facebook\.com/i,
    /instagram\.com/i,
    /tiktok\.com/i,
    /youtube\.com/i,
    /linkedin\.com/i,
    /note\.com/i, // Often personal blogs, though some are good. User wants "News".
    /ameblo\.jp/i
];
