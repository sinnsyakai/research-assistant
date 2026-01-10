"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bot_sdk_1 = require("@line/bot-sdk");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const main = async () => {
    console.log('Testing LINE Broadcast...');
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        console.error('❌ Error: LINE_CHANNEL_ACCESS_TOKEN is missing in .env');
        return;
    }
    const client = new bot_sdk_1.Client({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.LINE_CHANNEL_SECRET,
    });
    const message = {
        type: 'text',
        text: 'これはテスト送信です。\n届いていますか？'
    };
    try {
        console.log('Sending...');
        await client.broadcast([message]);
        console.log('✅ Broadcast API call successful.');
    }
    catch (error) {
        console.error('❌ Broadcast failed:', error.originalError?.message || error.message);
        console.error(JSON.stringify(error.originalError?.response?.data, null, 2));
    }
};
main();
