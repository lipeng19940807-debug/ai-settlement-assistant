import React, { useState, useEffect } from 'react';
import { processData, exportResult } from '../api';
import toast from 'react-hot-toast';

export default function Processing({
    files,
    targetTemplateName,
    targetFields,
    fieldMappings,
    onBack,
}) {
    const [progress, setProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        // 自动开始处理
        handleStartProcessing();
    }, []);

    const handleStartProcessing = async () => {
        setIsProcessing(true);
        setProgress(0);

        // 模拟进度条
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return prev;
                return prev + 5;
            });
        }, 200);

        try {
            const payload = {
                fileIds: files.map(f => f.id),
                mappings: fieldMappings,
                targetFields: targetFields
            };

            console.log('发送处理请求:', payload);

            const res = await processData(payload);

            clearInterval(interval);
            setProgress(100);
            setResults(res.data || []);
            setShowResults(true);
            setIsProcessing(false);

            if (res.data?.length > 0) {
                toast.success(`处理完成，共 ${res.count} 条数据`);
            } else {
                toast.error('处理结果为空，请检查字段映射');
            }
        } catch (error) {
            clearInterval(interval);
            console.error(error);
            toast.error(`处理失败: ${error.message}`);
            setIsProcessing(false);
        }
    };

    const handleExport = async () => {
        const toastId = toast.loading('正在导出...');
        try {
            const blob = await exportResult(results, targetTemplateName);

            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${targetTemplateName || '加工结果'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success('导出成功', { id: toastId });
        } catch (error) {
            console.error('导出失败:', error);
            toast.error('导出失败', { id: toastId });
        }
    };

    if (!showResults) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-full max-w-md p-6 bg-[#1d2630] rounded-xl border border-slate-700/50 mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-white">AI 智能加工进行中...</span>
                        <span className="text-lg font-bold text-primary">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
                        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-sm text-slate-400">正在处理 {files.length} 个文件，共 {files.reduce((a, b) => a + b.rowCount || 0, 0)} 行数据</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#0b1121] text-slate-300">
            <header className="h-16 flex items-center justify-between px-6 bg-[#111921]/80 backdrop-blur-sm border-b border-border-dark shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-1.5 rounded-full text-slate-300 hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </button>
                    <h1 className="text-xl font-bold text-white">AI 加工执行与结果预览</h1>
                </div>
                <div>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold shadow-md shadow-primary/20 transition-all">
                        <span className="material-symbols-outlined text-base">download</span>
                        <span>导出加工结果 (Excel)</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col overflow-hidden p-6 gap-6">
                <div className="flex-1 flex flex-col overflow-hidden rounded-xl bg-[#1d2630] border border-slate-700/50">
                    <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
                        <h3 className="font-bold text-white">加工结果预览 (Top 100)</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-[#1d2630]/80 backdrop-blur-sm">
                                <tr className="border-b border-slate-700/50 text-left">
                                    {Object.keys(results[0] || {}).map(key => (
                                        <th key={key} className="p-3 font-semibold text-slate-400">{key}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {results.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-700/20">
                                        {Object.values(row).map((val, j) => (
                                            <td key={j} className="p-3 text-slate-300">{val}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
