"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBot = void 0;
const config_1 = require("./config");
const search_1 = require("./search");
const ai_1 = require("./ai");
const line_1 = require("./line");
const history_1 = require("./history");
// Export for server usage
const runBot = async () => {
    console.log('🚀 Starting News Bot...');
    const config = (0, config_1.loadConfig)();
    const settings = config.globalSettings;
    // Use process.argv only if run directly, otherwise use all genres
    const targetGenreId = (require.main === module) ? process.argv[2] : undefined;
    const targetGenres = targetGenreId
        ? config.genres.filter(g => g.id === targetGenreId)
        : config.genres;
    if (targetGenres.length === 0) {
        console.error(`Unknown genre: ${targetGenreId}`);
        // Do not exit process if triggered by server
        if (require.main === module)
            process.exit(1);
        return;
    }
    const resultsSummary = [];
    for (const genre of targetGenres) {
        console.log(`\n--- Processing Genre: ${genre.name} ---`);
        // 1. Search
        console.log(`Searching for: ${genre.keywords.join(', ')}`);
        const rawResults = await (0, search_1.searchNews)(genre.keywords, settings.searchPeriod || 'd2');
        console.log(`Found ${rawResults.length} raw items.`);
        if (rawResults.length === 0) {
            console.log('No recent news found.');
            continue;
        }
        // 2. Filter Duplicates (Before AI)
        const newItemsRaw = rawResults.filter(item => {
            if ((0, history_1.isDuplicate)(item.link, item.title)) {
                return false;
            }
            return true;
        });
        console.log(`After deduplication: ${newItemsRaw.length} items remaining.`);
        if (newItemsRaw.length === 0) {
            console.log('All found news were already sent.');
            continue;
        }
        // 3. AI Curation
        console.log('Curating with AI...');
        const curatedNews = await (0, ai_1.curateNews)(newItemsRaw, genre.name, genre.maxItems);
        console.log(`Selected ${curatedNews.length} important items.`);
        if (curatedNews.length === 0) {
            console.log('AI filtered out all items.');
            continue;
        }
        // 4. Send to LINE
        if (settings.sendToLine) {
            console.log('Sending to LINE...');
            await (0, line_1.sendNewsReport)(genre.name, curatedNews);
            // 5. Save to History
            (0, history_1.addToHistory)(curatedNews.map(n => ({ url: n.url, title: n.title })));
            console.log('Saved to history.');
            resultsSummary.push(`${genre.name}: Sent ${curatedNews.length} items.`);
        }
        else {
            console.log('Skipping LINE send (disabled in config).');
            resultsSummary.push(`${genre.name}: Skipped (Dry Run) ${curatedNews.length} items.`);
        }
    }
    console.log('\n✅ All Done!');
    return resultsSummary;
};
exports.runBot = runBot;
// Check if run directly
if (require.main === module) {
    (0, exports.runBot)().catch(err => console.error(err));
}
