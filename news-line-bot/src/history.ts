import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '../data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

interface HistoryItem {
    url: string;
    title: string;
    date: string;
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Load history
const loadHistory = (): HistoryItem[] => {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    try {
        const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
        return JSON.parse(content);
    } catch (e) {
        return [];
    }
};

const saveHistory = (history: HistoryItem[]) => {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
};

export const isDuplicate = (url: string, title?: string): boolean => {
    const history = loadHistory();
    // Check URL exact match
    if (history.some(item => item.url === url)) return true;
    
    // Check Title exact match (if provided)
    if (title && history.some(item => item.title === title)) return true;
    
    return false;
};

export const addToHistory = (items: { url: string; title: string }[]) => {
    let history = loadHistory();
    const now = new Date().toISOString();

    const newItems = items.map(i => ({
        url: i.url,
        title: i.title,
        date: now
    }));

    history = [...newItems, ...history];

    // Keep only last 1000 items to prevent bloating
    if (history.length > 1000) {
        history = history.slice(0, 1000);
    }

    saveHistory(history);
};
