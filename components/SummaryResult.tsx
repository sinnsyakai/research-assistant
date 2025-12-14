import { X, Copy, Check, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';

interface SummaryResultProps {
    content: string;
    onClose: () => void;
}

export default function SummaryResult({ content, onClose }: SummaryResultProps) {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    if (!content) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-blue-100">生成結果</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 mr-2">
                                {content.length.toLocaleString()}文字
                            </span>
                            <button
                                onClick={() => {
                                    const w = window.open('', '_blank');
                                    if (w) {
                                        w.document.write(`
                                            <html>
                                                <head>
                                                    <title>AI要約結果</title>
                                                    <style>
                                                        body { font-family: sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6; color: #333; }
                                                        h1, h2, h3 { color: #1a202c; }
                                                        pre { background: #f1f5f9; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
                                                        code { font-family: monospace; background: #e2e8f0; padding: 0.2rem 0.4rem; border-radius: 0.25rem; }
                                                        ul, ol { padding-left: 1.5rem; }
                                                        a { color: #2563eb; text-decoration: none; }
                                                        a:hover { text-decoration: underline; }
                                                        blockquote { border-left: 4px solid #cbd5e1; padding-left: 1rem; color: #64748b; }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div id="content" style="white-space: pre-wrap">${content}</div>
                                                </body>
                                            </html>
                                        `);
                                        w.document.close();
                                    }
                                }}
                                className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 text-sm font-medium bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3"
                            >
                                <ExternalLink size={18} />
                                <span>別窓で開く</span>
                            </button>
                            <button
                                onClick={handleCopy}
                                className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 text-sm font-medium bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3"
                            >
                                {isCopied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                                <span>{isCopied ? 'コピー完了' : 'コピー'}</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 prose prose-blue dark:prose-invert max-w-none">
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
