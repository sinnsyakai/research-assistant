"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNewsReport = void 0;
const bot_sdk_1 = require("@line/bot-sdk");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const client = process.env.LINE_CHANNEL_ACCESS_TOKEN
    ? new bot_sdk_1.Client({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.LINE_CHANNEL_SECRET,
    })
    : null;
const sendNewsReport = async (genreName, newsList) => {
    if (!client) {
        console.error('LINE Client not initialized');
        return;
    }
    // Format as simple text list
    // Limit to 5000 chars (LINE limit), currently safe with 10 items
    let messageText = `【${genreName}】最新ニュース\n\n`;
    messageText += newsList.map((item, index) => {
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
