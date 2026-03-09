import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import cron, { ScheduledTask } from 'node-cron';
import { runBot } from './index';
import { lineMiddleware, sendToGroup } from './line';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
// Fix views path to be absolute or relative to execution
app.set('views', path.join(__dirname, '../views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const CONFIG_PATH = path.resolve(__dirname, '../config.json');

// --- Helper Functions ---
const loadConfig = () => {
    try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch (e) {
        return { schedule: '0 8 * * *', genres: [], globalSettings: {} };
    }
};

const saveConfig = (config: any) => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
};

// --- Cron Management ---
let currentTask: ScheduledTask | null = null;

const setupCron = () => {
    const config = loadConfig();

    // Stop existing task if any
    if (currentTask) {
        currentTask.stop();
        currentTask = null;
    }

    // Check if auto-schedule is enabled
    if (!config.autoScheduleEnabled) {
        console.log('[Scheduler] Auto-schedule is disabled. Manual trigger only.');
        return;
    }

    const schedule = config.schedule || '0 8 * * *';

    if (cron.validate(schedule)) {
        console.log(`[Scheduler] Setting up cron: ${schedule}`);
        currentTask = cron.schedule(schedule, () => {
            console.log('[Scheduler] Triggering bot...');
            runBot().catch(err => console.error('[Scheduler Error]', err));
        }, {
            timezone: "Asia/Tokyo"
        });
    } else {
        console.error(`[Scheduler] Invalid cron expression: ${schedule}`);
    }
};

// Start cron on server start
setupCron();

// --- Routes ---
app.get('/', (req, res) => {
    const config = loadConfig();
    res.render('index', {
        config: config,
        schedule: config.schedule,
        message: null
    });
});

app.post('/config', (req, res) => {
    try {
        const config = loadConfig();

        // Update auto-schedule toggle (checkbox: present = true, absent = false)
        config.autoScheduleEnabled = req.body.autoScheduleEnabled === 'true';

        // Update schedule from hour dropdown
        const scheduleHour = req.body.scheduleHour || '8';
        config.schedule = `0 ${scheduleHour} * * *`;

        // Update search period
        if (req.body.searchPeriod) {
            config.globalSettings = config.globalSettings || {};
            config.globalSettings.searchPeriod = req.body.searchPeriod;
        }

        // Update genres from form fields
        const genreCount = parseInt(req.body.genreCount) || 0;
        for (let i = 0; i < genreCount; i++) {
            const genreId = req.body[`genreId_${i}`];
            const genreName = req.body[`genreName_${i}`];
            const maxItems = parseInt(req.body[`maxItems_${i}`]) || 5;
            const keywordsText = req.body[`keywords_${i}`] || '';
            const keywords = keywordsText.split('\n')
                .map((k: string) => k.trim())
                .filter((k: string) => k.length > 0);

            // Find and update the genre
            const genre = config.genres.find((g: any) => g.id === genreId);
            if (genre) {
                genre.name = genreName;
                genre.maxItems = maxItems;
                genre.keywords = keywords;
            }
        }

        saveConfig(config);
        setupCron();

        res.render('index', {
            config,
            schedule: config.schedule,
            message: '✅ 設定を保存しました'
        });
    } catch (e: any) {
        const config = loadConfig();
        res.render('index', {
            config,
            schedule: config.schedule,
            message: `❌ エラー: ${e.message}`
        });
    }
});

app.post('/schedule', (req, res) => {
    const newSchedule = req.body.schedule;
    const config = loadConfig();
    config.schedule = newSchedule;
    saveConfig(config);
    setupCron();

    res.render('index', {
        config,
        schedule: config.schedule,
        message: `スケジュールを「${newSchedule}」に更新しました✅`
    });
});

app.post('/run', async (req, res) => {
    console.log('[Manual Run] Triggered via Dashboard');
    const config = loadConfig();

    // We run async but wait for it? 
    // If it takes too long, browser might timeout.
    // Better to run async and tell user "Started". 
    // OR wait if it is usually < 30s. The news bot is < 30s usually.
    // Let's await to give result.

    try {
        const result = await runBot();
        res.render('index', {
            config,
            schedule: config.schedule,
            message: `実行完了しました✅\n${JSON.stringify(result)}`
        });
    } catch (e: any) {
        res.render('index', {
            config,
            schedule: config.schedule,
            message: `❌ 実行エラー: ${e.message}`
        });
    }
});

// =====================================================
// LINE Webhook エンドポイント
// LINE Developers コンソールで Webhook URL を
// https://[your-domain]/webhook に設定してください
// =====================================================
app.post('/webhook', lineMiddleware, async (req, res) => {
    res.status(200).end(); // LINE は200を期待している

    const events = req.body.events || [];
    for (const event of events) {
        const source = event.source || {};

        // グループIDを自動キャプチャ
        if (source.type === 'group' && source.groupId) {
            const config = loadConfig();
            const existingId = config.groupNotification?.groupId;

            if (!existingId) {
                // 初回: グループIDを保存
                config.groupNotification = config.groupNotification || {};
                config.groupNotification.groupId = source.groupId;
                config.groupNotification.enabled = true;
                saveConfig(config);
                console.log(`[Webhook] Group ID を自動保存: ${source.groupId}`);
            }
        }
    }
});

// =====================================================
// グループ通知: 手動メッセージ送信
// POST /group-notify { message: "..." }
// =====================================================
app.post('/group-notify', async (req, res) => {
    const config = loadConfig();
    const groupId = config.groupNotification?.groupId;
    const enabled = config.groupNotification?.enabled;
    const message = req.body.message || '';

    if (!enabled) {
        res.json({ success: false, error: 'グループ通知が無効です (enabled: false)' });
        return;
    }
    if (!groupId) {
        res.json({ success: false, error: 'groupId 未設定。先にBotをグループに追加してください。' });
        return;
    }
    if (!message.trim()) {
        res.json({ success: false, error: 'message が空です' });
        return;
    }

    const success = await sendToGroup(groupId, message);
    res.json({ success, groupId, messageLength: message.length });
});

// =====================================================
// グループ通知: ON/OFF 切り替え
// POST /group-notify-toggle { enabled: true/false }
// =====================================================
app.post('/group-notify-toggle', (req, res) => {
    const config = loadConfig();
    config.groupNotification = config.groupNotification || {};
    config.groupNotification.enabled = req.body.enabled === 'true' || req.body.enabled === true;
    saveConfig(config);

    const state = config.groupNotification.enabled ? '✅ 有効' : '⛔ 無効';
    console.log(`[Group Notify] ${state}`);
    res.json({ success: true, enabled: config.groupNotification.enabled });
});

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`LINE Webhook URL: https://[your-domain]/webhook`);
    console.log(`Group Notify:     POST /group-notify { message: "..." }`);
    console.log(`Toggle ON/OFF:    POST /group-notify-toggle { enabled: true/false }`);
});
