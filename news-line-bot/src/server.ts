import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import cron, { ScheduledTask } from 'node-cron';
import { runBot } from './index';

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
    const schedule = config.schedule || '0 8 * * *';

    if (currentTask) {
        currentTask.stop();
    }

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

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
