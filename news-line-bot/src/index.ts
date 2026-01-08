import { loadConfig } from './config';
import { searchNews } from './search';
import { curateNews } from './ai';
import { sendNewsReport } from './line';

const main = async () => {
    console.log('🚀 Starting News Bot...');

    const config = loadConfig();
    const settings = config.globalSettings;

    const targetGenreId = process.argv[2]; // Optional: npm start education
    const targetGenres = targetGenreId
        ? config.genres.filter(g => g.id === targetGenreId)
        : config.genres;

    if (targetGenres.length === 0) {
        console.error(`Unknown genre: ${targetGenreId}`);
        process.exit(1);
    }

    for (const genre of targetGenres) {
        console.log(`\n--- Processing Genre: ${genre.name} ---`);

        // 1. Search
        console.log(`Searching for: ${genre.keywords.join(', ')}`);
        // Use configured search period
        const searchResults = await searchNews(genre.keywords, settings.searchPeriod || 'd1');
        console.log(`Found ${searchResults.length} raw items.`);

        if (searchResults.length === 0) {
            console.log('No recent news found.');
            continue;
        }

        // 2. AI Curation
        console.log('Curating with AI...');
        // Pass maxItems from config
        const curatedNews = await curateNews(searchResults, genre.name, genre.maxItems);
        console.log(`Selected ${curatedNews.length} important items.`);

        if (curatedNews.length === 0) {
            console.log('AI filtered out all items (nothing important enough).');
            continue;
        }

        // 3. Send to LINE
        if (settings.sendToLine) {
            console.log('Sending to LINE...');
            await sendNewsReport(genre.name, curatedNews);
        } else {
            console.log('Skipping LINE send (disabled in config).');
            console.log(JSON.stringify(curatedNews, null, 2));
        }
    }

    console.log('\n✅ All Done!');
};

main().catch(err => console.error(err));
