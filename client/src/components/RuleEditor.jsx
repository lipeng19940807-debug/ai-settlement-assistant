import React, { useState } from 'react';
import { generateCode } from '../api';
import toast from 'react-hot-toast';

export default function RuleEditor({
    mapping,
    targetField,
    files,
    onSave,
    onCancel
}) {
    const [description, setDescription] = useState(mapping?.processingRule || '');
    const [generatedCode, setGeneratedCode] = useState(mapping?.generatedCode || '');
    const [isGenerating, setIsGenerating] = useState(false);

    // 获取所有源文件的字段作为参考
    const allSourceFields = files.flatMap(f =>
        f.sheets?.flatMap(s => s.fields.map(field => ({
            ...field,
            fileName: f.name,
            sheetName: s.name
        }))) ?? []
    );

    const handleGenerate = async () => {
        if (!description.trim()) return;
        setIsGenerating(true);
        try {
            const { code } = await generateCode(description, allSourceFields);
            setGeneratedCode(code);
            toast.success('代码生成成功');
        } catch (error) {
            toast.error('代码生成失败');
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = () => {
        onSave({
            ...mapping,
            processingRule: description,
            generatedCode: generatedCode
        });
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-50 dark:bg-[#0b1121]">
            <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-surface-light/80 dark:bg-background-dark/80 backdrop-blur px-6 flex items-center justify-between shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onCancel} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">字段加工逻辑配置</h1>
                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                        Target: {targetField?.name}
                    </span>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* 左侧：源数据参考 */}
                <aside className="w-72 xl:w-80 bg-surface-light dark:bg-surface-dark border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0">
                    <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between h-14 shrink-0">
                        <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-lg">dataset</span>
                            源数据参考
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                        {allSourceFields.map(field => (
                            <div key={field.id} className="group relative">
                                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                    <span className="font-medium group-hover:text-primary transition-colors">{field.name}</span>
                                    <span className="text-[10px] bg-slate-50 dark:bg-white/5 px-1 rounded">{field.type}</span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono text-slate-700 dark:text-slate-300 break-all group-hover:border-primary/50 group-hover:bg-primary/5 transition-all">
                                    {field.sample || '(空)'}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* 中间：编辑区 */}
                <main className="flex-1 flex flex-col min-w-0 bg-gray-50/50 dark:bg-black/10">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-xl filled">auto_awesome</span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">AI 规则交互</span>
                                </div>
                                <span className="text-xs text-slate-400">支持自然语言描述</span>
                            </div>
                            <div className="p-4">
                                <textarea
                                    className="w-full bg-slate-50/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:ring-0 focus:border-transparent transition-all resize-none h-24 placeholder:text-slate-400 dark:text-white leading-relaxed outline-none"
                                    placeholder="请描述如何加工当前字段... &#10;例如：将运单号(Tracking No)和子单号用横杠连接，并转为大写。"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                                <div className="flex justify-end items-center mt-3">
                                    <button
                                        className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-lg shadow-primary/20 flex items-center gap-2 disabled:bg-slate-400 disabled:shadow-none"
                                        disabled={isGenerating || !description.trim()}
                                        onClick={handleGenerate}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                                                <span>生成中...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-lg">send</span>
                                                <span>生成代码</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {generatedCode && (
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col flex-1 min-h-[250px] animate-fade-in">
                                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-slate-50/50 dark:bg-white/5 rounded-t-xl">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-purple-500 text-lg">code</span>
                                        生成的 JavaScript 逻辑
                                    </span>
                                </div>
                                <div className="flex-1 bg-[#1e1e1e] p-5 font-mono text-sm text-slate-300 overflow-auto custom-scrollbar relative">
                                    <pre><code>{generatedCode}</code></pre>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark flex items-center justify-between shrink-0 z-10">
                        <div className="text-xs text-slate-400">
                            <span className="font-medium text-slate-600 dark:text-slate-300">Tips:</span> 此操作仅保存当前字段的配置，不会立即执行全量数据。
                        </div>
                        <div className="flex gap-3">
                            <button onClick={onCancel} className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                                取消
                            </button>
                            <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-lg shadow-primary/25 transition-all flex items-center gap-2 active:scale-95">
                                <span className="material-symbols-outlined text-lg">save_as</span>
                                保存当前字段逻辑
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
