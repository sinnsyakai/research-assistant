"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCombinedNewsReport = exports.sendNewsReport = void 0;
const bot_sdk_1 = require("@line/bot-sdk");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const client = process.env.LINE_CHANNEL_ACCESS_TOKEN
    ? new bot_sdk_1.Client({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.LINE_CHANNEL_SECRET,
    })
    : null;
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
    // Build combined message
    let messageText = `📰 今日のニュースまとめ\n`;
    messageText += `━━━━━━━━━━━━━━━\n\n`;
    for (const genre of allResults) {
        if (genre.items.length === 0)
            continue;
        messageText += `【${genre.genreName}】\n`;
        for (const item of genre.items) {
            messageText += `・${item.title}\n`;
        }
        messageText += `\n`;
    }
    // Add URLs section at the bottom
    messageText += `━━━━━━━━━━━━━━━\n`;
    messageText += `📎 記事リンク\n\n`;
    let linkIndex = 1;
    for (const genre of allResults) {
        for (const item of genre.items) {
            messageText += `${linkIndex}. ${item.url}\n`;
            linkIndex++;
        }
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
