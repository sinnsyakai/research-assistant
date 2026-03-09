"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCombinedNewsReport = exports.sendNewsReport = exports.sendToGroup = exports.lineMiddleware = void 0;
const bot_sdk_1 = require("@line/bot-sdk");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const lineConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};
const client = process.env.LINE_CHANNEL_ACCESS_TOKEN
    ? new bot_sdk_1.Client(lineConfig)
    : null;
// LINE Webhook middleware（署名検証付き）
exports.lineMiddleware = (0, bot_sdk_1.middleware)(lineConfig);
// ── グループへのプッシュ通知 ─────────────────────────────
/**
 * 特定のLINEグループにメッセージを送信する
 * @param groupId  グループID（Webhookイベントから取得した C000... の文字列）
 * @param text     送信するテキスト（5000文字以内）
 */
const sendToGroup = async (groupId, text) => {
    if (!client) {
        console.error('[LINE] Client not initialized');
        return false;
    }
    if (!groupId) {
        console.error('[LINE] groupId が未設定です。先にBotをグループに追加してください。');
        return false;
    }
    // 5000文字制限
    const safeText = text.length > 4900 ? text.substring(0, 4900) + '\n...(省略)' : text;
    const message = { type: 'text', text: safeText };
    try {
        await client.pushMessage(groupId, [message]);
        console.log(`[LINE] Group push sent to ${groupId}`);
        return true;
    }
    catch (error) {
        console.error(`[LINE Group Error] ${error.originalError?.message || error.message}`);
        return false;
    }
};
exports.sendToGroup = sendToGroup;
// Old function kept for compatibility but not used
const sendNewsReport = async (genreName, newsList) => {
    if (!client) {
        console.error('LINE Client not initialized');
        return;
    }
    let messageText = `【${genreName}】最新ニュース\n\n`;
    messageText += newsList.map((item) => {
        return `・${item.title}\n${item.url}`;
    }).join('\n\n');
    messageText += `\n\n(以上 ${newsList.length}件)`;
    const message = {
        type: 'text',
        text: messageText
    };
    try {
        await client.broadcast([message]);
        console.log(`[LINE] Broadcast sent for ${genreName}`);
    }
    catch (error) {
        console.error(`[LINE Error] ${error.originalError?.message || error.message}`);
    }
};
exports.sendNewsReport = sendNewsReport;
// New function: Send all genres combined in one message
const sendCombinedNewsReport = async (allResults) => {
    if (!client) {
        console.error('LINE Client not initialized');
        return;
    }
    const now = new Date();
    const dateLabel = `${now.getMonth() + 1}/${now.getDate()}`;
    const GENRE_EMOJI = {
        '教育ニュース': '🏫',
        'AI・テック': '🤖',
        'SNSトレンド': '📱',
    };
    let messageText = `📰 ${dateLabel} 今日のニュース\n`;
    messageText += `━━━━━━━━━━━━━━━\n`;
    for (const genre of allResults) {
        if (genre.items.length === 0)
            continue;
        const emoji = GENRE_EMOJI[genre.genreName] || '📌';
        messageText += `\n${emoji} ${genre.genreName}\n\n`;
        genre.items.forEach((item, i) => {
            messageText += `${i + 1}. ${item.title}\n`;
            if (item.summary) {
                messageText += `→ ${item.summary}\n`;
            }
            messageText += `${item.url}\n\n`;
        });
    }
    // LINE message limit is 5000 chars
    if (messageText.length > 4900) {
        messageText = messageText.substring(0, 4900) + '\n...(省略)';
    }
    const message = {
        type: 'text',
        text: messageText
    };
    try {
        await client.broadcast([message]);
        console.log(`[LINE] Combined broadcast sent (${allResults.reduce((sum, g) => sum + g.items.length, 0)} items)`);
    }
    catch (error) {
        console.error(`[LINE Error] ${error.originalError?.message || error.message}`);
    }
};
exports.sendCombinedNewsReport = sendCombinedNewsReport;
