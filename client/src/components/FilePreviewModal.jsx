import React, { useState, useEffect } from 'react';
import { getFilePreview } from '../api';

export default function FilePreviewModal({ file, onClose }) {
    const [previewData, setPreviewData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSheet, setActiveSheet] = useState(null);

    useEffect(() => {
        if (file) {
            loadPreview();
        }
    }, [file, activeSheet]);

    const loadPreview = async () => {
        setIsLoading(true);
        try {
            const data = await getFilePreview(file.id, {
                sheet: activeSheet,
                limit: 50
            });
            setPreviewData(data);
            if (!activeSheet && file.sheets?.length > 0) {
                setActiveSheet(file.sheets[0].name);
            }
        } catch (error) {
            console.error('加载预览失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!file) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-5xl max-h-[85vh] bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                            <span className="material-symbols-outlined">description</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{file.name}</h2>
                            <p className="text-xs text-slate-500">{file.size} · {file.rowCount} 行</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Sheet Tabs */}
                {file.sheets && file.sheets.length > 1 && (
                    <div className="px-6 py-2 border-b border-border-light dark:border-border-dark flex gap-2 overflow-x-auto">
                        {file.sheets.map(sheet => (
                            <button
                                key={sheet.name}
                                onClick={() => setActiveSheet(sheet.name)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                  ${activeSheet === sheet.name
                                        ? 'bg-primary text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {sheet.name} ({sheet.rowCount} 行)
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
                        </div>
                    ) : previewData ? (
                        <div className="min-w-max">
                            <table className="w-full text-sm border-collapse">
                                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">#</th>
                                        {previewData.headers?.map(h => (
                                            <th key={h.key} className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 max-w-[200px] truncate">
                                                {h.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {previewData.data?.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-3 py-2 text-xs text-slate-400">{row.index}</td>
                                            {previewData.headers?.map(h => (
                                                <td key={h.key} className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                                                    {row[h.key] ?? ''}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            无法加载预览数据
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <p className="text-xs text-slate-500">显示前 {previewData?.data?.length || 0} 条数据</p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
}
