import { useState } from 'react';
import { Paper, SummaryStyle } from '@/types';
import { FileText, Video, PenTool, BookOpen, Sparkles, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SummarizeBoardProps {
    selectedPapers: Paper[];
    onSummarize: (style: SummaryStyle) => void;
    isGenerating: boolean;
}

export default function SummarizeBoard({ selectedPapers, onSummarize, isGenerating }: SummarizeBoardProps) {
    const [selectedStyle, setSelectedStyle] = useState<SummaryStyle>('overview');

    if (selectedPapers.length === 0) return null;

    const styles: { id: SummaryStyle; label: string; icon: any }[] = [
        { id: 'overview', label: '概要 (Overview)', icon: FileText },
        { id: 'article', label: '記事 (Article)', icon: PenTool },
        { id: 'detail', label: '詳細 (Detail)', icon: BookOpen },
    ];

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-0 left-0 right-0 p-4 z-40 pointer-events-none"
        >
            <div className="max-w-4xl mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 pointer-events-auto flex flex-col md:flex-row items-center justify-between gap-4">

                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                        {selectedPapers.map((paper, i) => (
                            <div key={paper.paperId} className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center border-2 border-white dark:border-slate-800 text-xs font-bold text-blue-600 dark:text-blue-300">
                                {i + 1}
                            </div>
                        ))}
                    </div>
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-200">
                        {selectedPapers.length} 件選択中
                    </span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                    {styles.map((style) => {
                        const Icon = style.icon;
                        const isSelected = selectedStyle === style.id;
                        return (
                            <button
                                key={style.id}
                                onClick={() => setSelectedStyle(style.id)}
                                className={`
                    flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all
                    ${isSelected
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 ring-2 ring-blue-500/50'
                                        : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300'}
                `}
                            >
                                <Icon size={16} />
                                <span className="hidden sm:inline">{style.label}</span>
                            </button>
                        );
                    })}

                    <div className="w-px h-8 bg-gray-200 dark:bg-slate-700 mx-1 hidden md:block" />

                    <button
                        onClick={() => onSummarize(selectedStyle)}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                        <span>生成する</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
