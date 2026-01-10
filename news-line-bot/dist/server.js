"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const node_cron_1 = __importDefault(require("node-cron"));
const index_1 = require("./index");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.set('view engine', 'ejs');
// Fix views path to be absolute or relative to execution
app.set('views', path_1.default.join(__dirname, '../views'));
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json());
const CONFIG_PATH = path_1.default.resolve(__dirname, '../config.json');
// --- Helper Functions ---
const loadConfig = () => {
    try {
        return JSON.parse(fs_1.default.readFileSync(CONFIG_PATH, 'utf-8'));
    }
    catch (e) {
        return { schedule: '0 8 * * *', genres: [], globalSettings: {} };
    }
};
const saveConfig = (config) => {
    fs_1.default.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
};
// --- Cron Management ---
let currentTask = null;
const setupCron = () => {
    const config = loadConfig();
    const schedule = config.schedule || '0 8 * * *';
    if (currentTask) {
        currentTask.stop();
    }
    if (node_cron_1.default.validate(schedule)) {
        console.log(`[Scheduler] Setting up cron: ${schedule}`);
        currentTask = node_cron_1.default.schedule(schedule, () => {
            console.log('[Scheduler] Triggering bot...');
            (0, index_1.runBot)().catch(err => console.error('[Scheduler Error]', err));
        }, {
            timezone: "Asia/Tokyo"
        });
    }
    else {
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
        const newConfig = JSON.parse(req.body.config);
        // Preserve schedule if not in newConfig (or strictly take from newConfig)
        // Let's assume the user edits the full JSON, so we save what they give.
        saveConfig(newConfig);
        setupCron(); // Refresh cron if schedule changed inside JSON
        res.render('index', {
            config: newConfig,
            schedule: newConfig.schedule,
            message: '設定を保存しました✅'
        });
    }
    catch (e) {
        const config = loadConfig();
        res.render('index', {
            config,
            schedule: config.schedule,
            message: '❌ エラー: JSON形式が正しくありません'
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
        const result = await (0, index_1.runBot)();
        res.render('index', {
            config,
            schedule: config.schedule,
            message: `実行完了しました✅\n${JSON.stringify(result)}`
        });
    }
    catch (e) {
        res.render('index', {
            config,
            schedule: config.schedule,
            message: `❌ 実行エラー: ${e.message}`
        });
    }
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
