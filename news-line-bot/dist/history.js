"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToHistory = exports.isDuplicate = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.resolve(__dirname, '../data');
const HISTORY_FILE = path_1.default.join(DATA_DIR, 'history.json');
// Ensure data directory exists
if (!fs_1.default.existsSync(DATA_DIR)) {
    fs_1.default.mkdirSync(DATA_DIR);
}
// Load history
const loadHistory = () => {
    if (!fs_1.default.existsSync(HISTORY_FILE))
        return [];
    try {
        const content = fs_1.default.readFileSync(HISTORY_FILE, 'utf-8');
        return JSON.parse(content);
    }
    catch (e) {
        return [];
    }
};
const saveHistory = (history) => {
    fs_1.default.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
};
const isDuplicate = (url, title) => {
    const history = loadHistory();
    // Check URL exact match
    if (history.some(item => item.url === url))
        return true;
    // Check Title exact match (if provided)
    if (title && history.some(item => item.title === title))
        return true;
    return false;
};
exports.isDuplicate = isDuplicate;
const addToHistory = (items) => {
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
exports.addToHistory = addToHistory;
