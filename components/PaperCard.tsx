import { Paper } from '@/types';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface PaperCardProps {
    paper: Paper;
    isSelected: boolean;
    onToggle: (paper: Paper) => void;
    disabled: boolean; // true if max selection reached and not selected
}

export default function PaperCard({ paper, isSelected, onToggle, disabled }: PaperCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
        relative p-6 rounded-xl border transition-all duration-200
        ${isSelected
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                    : 'border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:border-blue-300 dark:hover:border-blue-700'
                }
        glass
      `}
        >
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    <h3 className="text-lg font-bold leading-tight mb-2 text-gray-900 dark:text-gray-100">
                        {paper.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        {paper.year} • {paper.venue || 'Unknown Venue'} • {paper.authors.map(a => a.name).slice(0, 3).join(', ')}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                        {paper.abstract || 'No abstract available.'}
                    </p>
                </div>

                <button
                    onClick={() => onToggle(paper)}
                    disabled={!isSelected && disabled}
                    className={`
            flex items-center justify-center w-6 h-6 rounded-full border transition-colors
            ${isSelected
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                        }
            ${(!isSelected && disabled) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
          `}
                >
                    {isSelected && <Check size={14} />}
                </button>
            </div>

            <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
                View Source
            </a>
        </motion.div>
    );
}
