import { Client, TextMessage } from '@line/bot-sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = process.env.LINE_CHANNEL_ACCESS_TOKEN
    ? new Client({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.LINE_CHANNEL_SECRET,
    })
    : null;

export const sendNewsReport = async (genreName: string, newsList: any[]) => {
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

    const message: TextMessage = {
        type: 'text',
        text: messageText
    };

    try {
        await client.broadcast([message]);
        console.log(`[LINE] Broadcast sent for ${genreName}`);
    } catch (error: any) {
        console.error(`[LINE Error] ${error.originalError?.message || error.message}`);
    }
};
