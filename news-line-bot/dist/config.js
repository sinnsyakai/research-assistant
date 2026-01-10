"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCKED_PATTERNS = exports.loadConfig = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const loadConfig = () => {
    try {
        const configPath = path_1.default.resolve(__dirname, '../config.json');
        const fileContent = fs_1.default.readFileSync(configPath, 'utf-8');
        return JSON.parse(fileContent);
    }
    catch (error) {
        console.error('Failed to load config.json', error);
        // Fallback or exit
        process.exit(1);
    }
};
exports.loadConfig = loadConfig;
exports.BLOCKED_PATTERNS = [
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
    /\/advertorial\/|\/native-ad\//i
];
