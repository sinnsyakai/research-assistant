import { Client, TextMessage } from '@line/bot-sdk';
import dotenv from 'dotenv';

dotenv.config();

const main = async () => {
    console.log('Testing LINE Broadcast...');

    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        console.error('❌ Error: LINE_CHANNEL_ACCESS_TOKEN is missing in .env');
        return;
    }

    const client = new Client({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.LINE_CHANNEL_SECRET,
    });

    const message: TextMessage = {
        type: 'text',
        text: 'これはテスト送信です。\n届いていますか？'
    };

    try {
        console.log('Sending...');
        await client.broadcast([message]);
        console.log('✅ Broadcast API call successful.');
    } catch (error: any) {
        console.error('❌ Broadcast failed:', error.originalError?.message || error.message);
        console.error(JSON.stringify(error.originalError?.response?.data, null, 2));
    }
};

main();
