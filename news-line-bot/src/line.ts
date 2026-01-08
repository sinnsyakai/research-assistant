import { messagingApi } from '@line/bot-sdk';
import dotenv from 'dotenv';
import { CuratedNews } from './ai';

dotenv.config();

const { MessagingApiClient } = messagingApi;

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const client = new MessagingApiClient({
    channelAccessToken: CHANNEL_ACCESS_TOKEN || ''
});

export const sendNewsReport = async (genre: string, news: CuratedNews[]) => {
    if (!CHANNEL_ACCESS_TOKEN) {
        console.error('ERROR: LINE Configuration missing');
        return;
    }
    if (news.length === 0) return;

    // Construct Flex Message
    const bubbles: messagingApi.FlexBubble[] = news.map(item => ({
        type: 'bubble',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: item.title,
                    weight: 'bold',
                    size: 'sm',
                    wrap: true,
                    color: '#1DB446'
                }
            ]
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: item.summary,
                    size: 'xs',
                    color: '#666666',
                    wrap: true,
                    maxLines: 3
                },
                {
                    type: 'separator',
                    margin: 'md'
                }
            ]
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'button',
                    style: 'link',
                    height: 'sm',
                    action: {
                        type: 'uri',
                        label: '記事を読む',
                        uri: item.url
                    }
                }
            ]
        }
    }));

    // Header Bubble
    const headerBubble: messagingApi.FlexBubble = {
        type: 'bubble',
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: `📰 ${genre} News Check`,
                    weight: 'bold',
                    size: 'xl'
                },
                {
                    type: 'text',
                    text: `${new Date().toLocaleDateString('ja-JP')} の注目ニュース`,
                    size: 'xs',
                    color: '#aaaaaa'
                }
            ]
        }
    };

    const carousel: messagingApi.FlexCarousel = {
        type: 'carousel',
        contents: [headerBubble, ...bubbles]
    };

    try {
        await client.broadcast({
            messages: [
                {
                    type: 'flex',
                    altText: `${genre}の最新ニュースが届きました`,
                    contents: carousel
                }
            ]
        });
        console.log(`[LINE] Broadcast sent for ${genre}`);
    } catch (error: any) {
        console.error('[LINE Error]', error.originalError?.response?.data || error);
    }
};
