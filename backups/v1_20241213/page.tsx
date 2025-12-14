'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Paper, SummaryStyle } from '@/types';
import SearchSection from '@/components/SearchSection';
import SummarizeBoard from '@/components/SummarizeBoard';
import SummaryResult from '@/components/SummaryResult';
import { Settings, Check, ArrowUpDown, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

export default function Home() {
    const [papers, setPapers] = useState<Paper[]>([]);
    const [selectedPapers, setSelectedPapers] = useState<Paper[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summaryResult, setSummaryResult] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [searchApiKey, setSearchApiKey] = useState(''); // Google Custom Search API Key
    const [searchEngineId, setSearchEngineId] = useState(''); // CX ID
    const [modelId, setModelId] = useState('gemini-2.0-flash-exp'); // Updated default
    const [showSettings, setShowSettings] = useState(false);
    const [lastQuery, setLastQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Search Mode State (Radio Switch)
    const [searchMode, setSearchMode] = useState<'default' | 'news' | 'papers' | 'global'>('default');

    // Filters
    const [dateFilter, setDateFilter] = useState('all');
    // Sorting: 'relevance' | 'cited_by_count' | 'publication_year'
    const [sortOption, setSortOption] = useState<string>('relevance');

    // Load API Key and Model ID from localStorage
    useEffect(() => {
        const storedKey = localStorage.getItem('google_api_key');
        if (storedKey) setApiKey(storedKey);

        const storedSearchKey = localStorage.getItem('google_search_api_key');
        if (storedSearchKey) setSearchApiKey(storedSearchKey);

        const storedCx = localStorage.getItem('google_search_engine_id');
        if (storedCx) setSearchEngineId(storedCx);

        const storedModel = localStorage.getItem('google_model_id');
        if (storedModel) setModelId(storedModel);
    }, []);

    const saveSettings = () => {
        localStorage.setItem('google_api_key', apiKey);
        localStorage.setItem('google_search_api_key', searchApiKey);
        localStorage.setItem('google_search_engine_id', searchEngineId);
        localStorage.setItem('google_model_id', modelId);
        setShowSettings(false);
    };

    const handleSort = (option: string) => {
        setSortOption(option);
        if (lastQuery) {
            handleSearch(lastQuery, option);
        }
    };

    const handleSearch = async (query: string, overrideSort?: string) => {
        if (!query.trim()) return;

        setIsSearching(true);
        setError(null);
        setPapers([]);
        setSelectedPapers([]);
        setPage(1);
        setHasMore(true);
        setLastQuery(query);

        try {
            const params: any = {
                query,
                sort: overrideSort || sortOption,
                mode: searchMode,
                date: dateFilter,
                page: '1'
            };

            const headers: any = {};
            if (apiKey) {
                headers['x-google-key'] = apiKey;
                headers['x-google-model'] = modelId;
            }
            if (searchApiKey && searchEngineId) {
                headers['x-google-search-key'] = searchApiKey;
                headers['x-google-cse-id'] = searchEngineId;
            }

            const { data } = await axios.get('/api/search', { params, headers });
            const newPapers = data.data || [];
            if (page === 1) {
                setPapers(newPapers);
            } else {
                setPapers(prev => [...prev, ...newPapers]);
            }

            // Smart limit logic
            const limit = searchMode === 'papers' ? 30 : 15;
            if (newPapers.length < limit) setHasMore(false);

        } catch (error: any) {
            console.error('Search failed', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.details || '検索中にエラーが発生しました';
            setError(errorMessage);
        } finally {
            setIsSearching(false);
        }
    };

    const handleLoadMore = async () => {
        if (!lastQuery || isSearching) return;

        const nextPage = page + 1;
        setIsSearching(true);

        try {
            const params: any = {
                query: lastQuery,
                sort: sortOption,
                mode: searchMode,
                date: dateFilter,
                page: nextPage
            };

            const headers: any = {};
            if (apiKey) {
                headers['x-google-key'] = apiKey;
                headers['x-google-model'] = modelId;
            }
            if (searchApiKey && searchEngineId) {
                headers['x-google-search-key'] = searchApiKey;
                headers['x-google-cse-id'] = searchEngineId;
            }

            const { data } = await axios.get('/api/search', { params, headers });
            const newPapers = data.data || [];

            setPapers(prev => [...prev, ...newPapers]);
            setPage(nextPage);

            const limit = searchMode === 'papers' ? 30 : 15;
            if (newPapers.length < limit) setHasMore(false);

        } catch (error) {
            console.error('Load more failed', error);
        } finally {
            setIsSearching(false);
        }
    };

    const togglePaperSelection = (paper: Paper) => {
        if (selectedPapers.find(p => p.paperId === paper.paperId)) {
            setSelectedPapers(selectedPapers.filter(p => p.paperId !== paper.paperId));
        } else {
            if (selectedPapers.length >= 5) {
                alert('一度に選択できるのは5件までです。');
                return;
            }
            setSelectedPapers([...selectedPapers, paper]);
        }
    };

    const handleSummarize = async (style: SummaryStyle) => {
        if (!apiKey) {
            alert('先に設定(Settings)からGoogle API Keyを設定してください。');
            setShowSettings(true);
            return;
        }

        setIsSummarizing(true);
        try {
            const response = await fetch('/api/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-google-key': apiKey
                },
                body: JSON.stringify({ papers: selectedPapers, style })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();
            setSummaryResult(data.content);

        } catch (error: any) {
            console.error(error);
            alert(`要約エラー: ${error.message}`);
        } finally {
            setIsSummarizing(false);
        }
    };

    const getSortButtonStyle = (option: string) => {
        return sortOption === option
            ? "bg-blue-100 text-blue-700 font-bold border-blue-300 ring-2 ring-blue-200"
            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50";
    };

    const handleReset = () => {
        setLastQuery('');
        setPapers([]);
        setDateFilter('all');
        setSearchMode('default');
        setSortOption('relevance');
        setError(null);
        setPage(1);
    };

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 pb-64 font-sans">

            {/* Header */}
            <header className="max-w-7xl mx-auto flex justify-between items-center mb-12">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        リサーチ＆要約アシスタント
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        AIが信頼できる情報をキュレーションし、要約までしてくれます
                    </p>
                </div>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                    title="設定"
                >
                    <Settings />
                </button>
            </header>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-slate-800">
                        <h3 className="text-lg font-bold mb-4">設定</h3>

                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-medium">Google API Key (Gemini)</label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="AIza..."
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-medium">モデルID (Model ID)</label>
                            <input
                                type="text"
                                value={modelId}
                                onChange={(e) => setModelId(e.target.value)}
                                className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="例: gemini-2.0-flash-exp"
                            />
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800 mb-6">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                ニュース検索設定 (任意)
                            </h4>
                            <div className="mb-3">
                                <label className="block mb-1 text-xs text-gray-500 flex justify-between">
                                    Custom Search API Key
                                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                                        取得はこちら (Google Cloud)
                                    </a>
                                </label>
                                <input
                                    type="password"
                                    value={searchApiKey}
                                    onChange={(e) => setSearchApiKey(e.target.value)}
                                    className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="AIza..."
                                />
                            </div>
                            <div className="mb-0">
                                <label className="block mb-1 text-xs text-gray-500 flex justify-between">
                                    Search Engine ID (CX)
                                    <a href="https://programmablesearchengine.google.com/controlpanel/create" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                                        作成・取得はこちら
                                    </a>
                                </label>
                                <input
                                    type="text"
                                    value={searchEngineId}
                                    onChange={(e) => setSearchEngineId(e.target.value)}
                                    className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="0123456789..."
                                />
                            </div>
                        </div>

                        <button
                            onClick={saveSettings}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                        >
                            保存して閉じる
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-6 mb-8 mt-6">
                <SearchSection
                    onSearch={(q) => handleSearch(q)}
                    isLoading={isSearching}
                    placeholder="何を知りたいですか？文章で教えてください"
                />

                {/* Search Mode Selection (Radio Group) */}
                <div className="max-w-5xl mx-auto">
                    <p className="text-xs font-bold text-gray-500 mb-2 ml-1">検索対象:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Default */}
                        <label className={`
                            relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                            ${searchMode === 'default' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'}
                        `}>
                            <input
                                type="radio"
                                name="searchMode"
                                value="default"
                                checked={searchMode === 'default'}
                                onChange={() => setSearchMode('default')}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                                <span className="font-bold text-sm text-gray-800 dark:text-gray-200 block">標準 (Default)</span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">Web + 動画 + AI厳選</span>
                            </div>
                        </label>

                        {/* News */}
                        <label className={`
                            relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                            ${searchMode === 'news' ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'}
                        `}>
                            <input
                                type="radio"
                                name="searchMode"
                                value="news"
                                checked={searchMode === 'news'}
                                onChange={() => setSearchMode('news')}
                                className="w-4 h-4 text-green-600 focus:ring-green-500"
                            />
                            <div>
                                <span className="font-bold text-sm text-gray-800 dark:text-gray-200 block">ニュースのみ</span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">信頼できるメディア・最新</span>
                            </div>
                        </label>

                        {/* Papers */}
                        <label className={`
                            relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                            ${searchMode === 'papers' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'}
                        `}>
                            <input
                                type="radio"
                                name="searchMode"
                                value="papers"
                                checked={searchMode === 'papers'}
                                onChange={() => setSearchMode('papers')}
                                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                                <span className="font-bold text-sm text-gray-800 dark:text-gray-200 block">論文のみ (Papers)</span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">OpenAlex 学術検索</span>
                            </div>
                        </label>

                        {/* Global */}
                        <label className={`
                            relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                            ${searchMode === 'global' ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'}
                        `}>
                            <input
                                type="radio"
                                name="searchMode"
                                value="global"
                                checked={searchMode === 'global'}
                                onChange={() => setSearchMode('global')}
                                className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                            />
                            <div>
                                <span className="font-bold text-sm text-gray-800 dark:text-gray-200 block">海外の情報 (Global)</span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">US Google・英語検索</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Combined Filter & Controls Row */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm max-w-4xl mx-auto flex flex-wrap items-center gap-6 justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-500">公開時期:</span>
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="all">指定なし (AI自動)</option>
                            <option value="1w">1週間以内</option>
                            <option value="1m">1ヶ月以内</option>
                            <option value="1y">1年以内</option>
                            <option value="5y">5年以内</option>
                            <option value="6y+">6年以上前</option>
                        </select>
                    </div>

                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <RotateCcw size={14} />
                        リセット
                    </button>
                </div>

                {/* Search Status Indicator */}
                {isSearching && (
                    <div className="text-center my-4 font-bold text-blue-600 animate-pulse">
                        AIが質問の意図を解釈し、最適な情報をキュレーション中です...
                    </div>
                )}

                {error && (
                    <div className="max-w-xl mx-auto p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-center text-sm">
                        {error}
                    </div>
                )}
            </div>

            {/* Results Table */}
            {papers.length > 0 ? (
                <div className="max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
                            <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 font-medium border-b border-gray-100 dark:border-slate-800">
                                <tr>
                                    <th className="p-4 w-16 text-center">選択</th>
                                    <th className="p-4 w-1/4 min-w-[200px]">タイトル / 著者</th>
                                    <th className="p-4 w-1/3 min-w-[300px]">要約 (抜粋)</th>
                                    <th className="p-4 w-28">発表日</th>
                                    <th className="p-4 w-16">国</th>
                                    <th className="p-4 w-32">掲載</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {papers.map((paper) => {
                                    const isSelected = !!selectedPapers.find(p => p.paperId === paper.paperId);
                                    // Truncate abstract
                                    const abstractPreview = paper.abstract
                                        ? (paper.abstract.length > 250 ? paper.abstract.substring(0, 250) + '...' : paper.abstract)
                                        : 'No abstract available';

                                    return (
                                        <tr
                                            key={paper.paperId}
                                            onClick={() => togglePaperSelection(paper)}
                                            className={`
                                        cursor-pointer transition-colors group
                                        ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-800/30'}
                                    `}
                                        >
                                            <td className="p-4 text-center">
                                                <div className={`
                                            mx-auto w-5 h-5 rounded border flex items-center justify-center transition-all
                                            ${isSelected ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/20' : 'border-gray-300 dark:border-gray-600 group-hover:border-blue-400'}
                                        `}>
                                                    {isSelected && <Check size={12} strokeWidth={3} />}
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className="font-bold text-base mb-1 text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-normal">
                                                    {/* Title Link */}
                                                    {paper.url ? (
                                                        <a
                                                            href={paper.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="hover:underline"
                                                        >
                                                            {paper.title} <span className="inline-block align-middle opacity-50"><ChevronUp size={12} className="rotate-45" /></span>
                                                        </a>
                                                    ) : (
                                                        paper.title
                                                    )}
                                                </div>
                                                <div className="text-gray-500 text-xs truncate max-w-[300px]">
                                                    {paper.authors.map(a => a.name).slice(0, 3).join(', ')}
                                                    {paper.authors.length > 3 && ' et al.'}
                                                </div>
                                            </td>
                                            <td className="p-4 align-top text-gray-600 dark:text-gray-400 text-xs leading-relaxed whitespace-normal">
                                                {abstractPreview}
                                            </td>
                                            <td className="p-4 align-top font-mono text-gray-500 text-xs whitespace-nowrap">
                                                {paper.publicationDate || paper.year}
                                            </td>
                                            <td className="p-4 align-top font-mono text-gray-500 text-xs">
                                                {paper.country || '-'}
                                            </td>
                                            <td className="p-4 align-top text-gray-500 text-xs whitespace-normal">
                                                {paper.venue || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Load More Button */}
                        {papers.length > 0 && (
                            <div className="p-4 flex justify-center border-t border-gray-100 dark:border-slate-800">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleLoadMore();
                                    }}
                                    disabled={isSearching}
                                    className="px-6 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                >
                                    {isSearching ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            読み込み中...
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown size={16} />
                                            もっと検索する
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                !isSearching && (
                    <div className="flex flex-col items-center justify-center text-center text-gray-400 mt-20 space-y-4">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2">
                            <Settings className="w-8 h-8 opacity-20" />
                        </div>
                        <p>上の検索ボックスから情報を検索してください。</p>
                    </div>
                )
            )}

            <SummarizeBoard
                selectedPapers={selectedPapers}
                onSummarize={handleSummarize}
                isGenerating={isSummarizing}
            />

            {summaryResult && (
                <SummaryResult
                    content={summaryResult}
                    onClose={() => setSummaryResult(null)}
                />
            )}
        </main>
    );
}
