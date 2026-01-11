import { loadConfig } from './config';
import { searchNews } from './search';
import { curateNews } from './ai';
import { sendCombinedNewsReport } from './line';
import { isDuplicate, addToHistory } from './history';

// Export for server usage
export const runBot = async () => {
    console.log('🚀 Starting News Bot...');

    const config = loadConfig();
    const settings = config.globalSettings;

    // Use process.argv only if run directly, otherwise use all genres
    const targetGenreId = (require.main === module) ? process.argv[2] : undefined;

    const targetGenres = targetGenreId
        ? config.genres.filter(g => g.id === targetGenreId)
        : config.genres;

    if (targetGenres.length === 0) {
        console.error(`Unknown genre: ${targetGenreId}`);
        if (require.main === module) process.exit(1);
        return;
    }

    // Collect all results first
    const allResults: { genreName: string; items: any[] }[] = [];
    const allItemsForHistory: { url: string; title: string }[] = [];

    for (const genre of targetGenres) {
        console.log(`\n--- Processing Genre: ${genre.name} ---`);

        // 1. Search
        console.log(`Searching for: ${genre.keywords.join(', ')}`);
        const rawResults = await searchNews(genre.keywords, settings.searchPeriod || 'd2');
        console.log(`Found ${rawResults.length} raw items.`);

        if (rawResults.length === 0) {
            console.log('No recent news found.');
            continue;
        }

        // 2. Filter Duplicates (Before AI)
        const newItemsRaw = rawResults.filter(item => {
            if (isDuplicate(item.link, item.title)) {
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
        const curatedNews = await curateNews(newItemsRaw, genre.name, genre.maxItems);
        console.log(`Selected ${curatedNews.length} important items.`);

        if (curatedNews.length === 0) {
            console.log('AI filtered out all items.');
            continue;
        }

        // Collect results for combined sending
        allResults.push({
            genreName: genre.name,
            items: curatedNews
        });

        // Collect for history
        allItemsForHistory.push(...curatedNews.map(n => ({ url: n.url, title: n.title })));
    }

    // 4. Send all genres in ONE message
    if (settings.sendToLine && allResults.length > 0) {
        console.log('\nSending combined message to LINE...');
        await sendCombinedNewsReport(allResults);

        // 5. Save all to History
        addToHistory(allItemsForHistory);
        console.log('Saved to history.');
    } else if (allResults.length === 0) {
        console.log('\nNo new news to send.');
    } else {
        console.log('\nSkipping LINE send (disabled in config).');
    }

    console.log('\n✅ All Done!');

    // Return summary
    const totalItems = allResults.reduce((sum, g) => sum + g.items.length, 0);
    return `${totalItems}件のニュースを1通で送信しました`;
};

// Check if run directly
if (require.main === module) {
    runBot().catch(err => console.error(err));
}
