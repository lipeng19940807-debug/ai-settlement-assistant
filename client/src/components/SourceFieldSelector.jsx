import React, { useState, useMemo } from 'react';

export default function SourceFieldSelector({
    files,
    currentSourceId,
    onSelect,
    onClose
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSheet, setSelectedSheet] = useState('all');

    // 提取所有源字段
    const allSourceFields = useMemo(() => {
        return files.flatMap(f =>
            f.sheets?.flatMap(s => s.fields.map(field => ({
                ...field,
                fileId: f.id,
                fileName: f.name,
                sheetName: s.name,
                uniqueId: field.id
            }))) ?? []
        );
    }, [files]);

    // 获取所有 Sheet 名称
    const allSheets = useMemo(() => {
        const sheets = new Set();
        files.forEach(f => f.sheets?.forEach(s => sheets.add(s.name)));
        return ['all', ...Array.from(sheets)];
    }, [files]);

    // 过滤字段
    const filteredFields = useMemo(() => {
        return allSourceFields.filter(field => {
            const matchesSearch = !searchTerm ||
                field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                field.fileName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSheet = selectedSheet === 'all' || field.sheetName === selectedSheet;
            return matchesSearch && matchesSheet;
        });
    }, [allSourceFields, searchTerm, selectedSheet]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-2xl max-h-[70vh] bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">选择源字段</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Search & Filter */}
                <div className="px-6 py-3 border-b border-border-light dark:border-border-dark flex gap-4">
                    <div className="flex-1 relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                        <input
                            type="text"
                            placeholder="搜索字段名称..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                    <select
                        value={selectedSheet}
                        onChange={e => setSelectedSheet(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    >
                        {allSheets.map(sheet => (
                            <option key={sheet} value={sheet}>
                                {sheet === 'all' ? '所有 Sheet' : sheet}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 无映射选项 */}
                <div className="px-6 py-2 border-b border-border-light dark:border-border-dark">
                    <button
                        onClick={() => onSelect(null)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors
              ${!currentSourceId
                                ? 'bg-primary/10 border-2 border-primary'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-2 border-transparent'
                            }`}
                    >
                        <div className="h-8 w-8 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-500 text-lg">block</span>
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">不映射源字段</div>
                            <div className="text-xs text-slate-500">该目标字段将通过规则凭空生成</div>
                        </div>
                    </button>
                </div>

                {/* Field List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {filteredFields.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                            <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                            <span className="text-sm">未找到匹配的字段</span>
                        </div>
                    ) : (
                        filteredFields.map(field => (
                            <button
                                key={field.uniqueId}
                                onClick={() => onSelect(field)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left
                  ${currentSourceId === field.uniqueId
                                        ? 'bg-primary/10 border-2 border-primary'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-2 border-transparent'
                                    }`}
                            >
                                <div className="h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">text_fields</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{field.name}</div>
                                    <div className="text-xs text-slate-500 truncate">
                                        {field.fileName} → {field.sheetName}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                    {field.type}
                                </div>
                                {field.sample && (
                                    <div className="text-xs text-slate-500 max-w-[100px] truncate" title={field.sample}>
                                        "{field.sample}"
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50 text-center">
                    <p className="text-xs text-slate-500">共 {allSourceFields.length} 个源字段，显示 {filteredFields.length} 个</p>
                </div>
            </div>
        </div>
    );
}
