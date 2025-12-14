import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface SearchSectionProps {
    onSearch: (query: string) => void;
    isLoading: boolean;
    placeholder?: string;
}

export default function SearchSection({ onSearch, isLoading, placeholder }: SearchSectionProps) {
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto mb-10">
            <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder || "キーワードを入力してください (例: AI 教育 影響)"}
                    className="w-full px-6 py-4 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-32 text-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm transition-all dark:text-white placeholder:text-gray-400"
                />
                <button
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="
            absolute right-2 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-700 
            text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          "
                >
                    検索
                </button>
            </form>
        </div>
    );
}
