import React, { useState, useEffect } from 'react';
import { getFilePreview, getAiFileSummary } from '../api';

/**
 * 增强版源文件预览弹窗
 * 具有 AI 智能解读能力、Sheet 页签切换、核心字段提取
 */
export default function SourceFilePreviewModal({ file, onClose, onConfirm }) {
    const [previewData, setPreviewData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSheet, setActiveSheet] = useState(null);

    // AI 分析相关状态
    const [aiSummary, setAiSummary] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [coreFields, setCoreFields] = useState([]);

    useEffect(() => {
        if (file) {
            loadPreview();
        }
    }, [file, activeSheet]);

    // 加载预览数据
    const loadPreview = async () => {
        setIsLoading(true);
        try {
            const data = await getFilePreview(file.id, {
                sheet: activeSheet,
                limit: 50
            });
            setPreviewData(data);

            // 设置默认 Sheet
            if (!activeSheet && file.sheets?.length > 0) {
                setActiveSheet(file.sheets[0].name);
            }

            // 提取核心字段（从表头中智能识别）
            if (data.headers) {
                extractCoreFields(data.headers);
            }

            // 首次加载时触发 AI 分析
            if (!aiSummary && !isAnalyzing) {
                runAiAnalysis(data);
            }
        } catch (error) {
            console.error('加载预览失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // AI 智能分析
    const runAiAnalysis = async (data) => {
        setIsAnalyzing(true);
        try {
            const fileInfo = {
                name: file.name,
                size: file.size,
                rowCount: file.rowCount,
                sheets: file.sheets,
                headers: data?.headers?.map(h => h.label) || []
            };
            const sampleData = data?.data?.slice(0, 5) || [];
            const summary = await getAiFileSummary(fileInfo, sampleData);
            setAiSummary(summary);
        } catch (error) {
            console.error('AI 分析失败:', error);
            setAiSummary({
                provider: '分析失败',
                period: '-',
                currency: '-',
                anomalies: '无法完成自动分析'
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    // 从表头中提取核心字段
    const extractCoreFields = (headers) => {
        const coreKeywords = [
            { keywords: ['单号', '运单', '订单', '追踪', 'tracking', 'order'], label: '运单号', icon: 'receipt_long' },
            { keywords: ['日期', '时间', 'date', 'time'], label: '发货时间', icon: 'calendar_today' },
            { keywords: ['始发', '发件', '寄件', 'origin', '发货'], label: '始发地', icon: 'flight_takeoff' },
            { keywords: ['目的', '收件', '收货', 'dest', '到达'], label: '目的地', icon: 'flight_land' },
            { keywords: ['重量', 'weight', '计费重'], label: '计费重量', icon: 'scale' },
            { keywords: ['费用', '金额', '总价', 'amount', 'price', 'cost', '运费'], label: '总费用', icon: 'payments' },
            { keywords: ['收件人', '收货人', 'receiver', 'consignee'], label: '收件人', icon: 'person' },
        ];

        const detected = [];
        for (const header of headers) {
            const headerLower = (header.label || '').toLowerCase();
            for (const core of coreKeywords) {
                if (core.keywords.some(kw => headerLower.includes(kw))) {
                    if (!detected.find(d => d.label === core.label)) {
                        detected.push(core);
                    }
                    break;
                }
            }
        }
        setCoreFields(detected);
    };

    // 格式化数字
    const formatNumber = (num) => {
        return num?.toLocaleString() || '0';
    };

    if (!file) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-[1400px] h-[90vh] bg-[#111921] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in border border-slate-700/50"
                onClick={e => e.stopPropagation()}
            >
                {/* 顶部头栏 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-[#1a2332]">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                                <span className="material-symbols-outlined text-emerald-400 text-[24px]">description</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">{file.name}</h2>
                                <p className="text-xs text-slate-400">{file.size} · 解析完成</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 rounded-md bg-slate-700/60 text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                            EXCEL SOURCE
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">
                            <span className="material-symbols-outlined text-[18px]">refresh</span>
                            重新上传
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* 主内容区 */}
                <div className="flex-1 flex overflow-hidden">
                    {/* 左侧边栏 */}
                    <div className="w-[220px] shrink-0 border-r border-slate-700/60 bg-[#141c26] flex flex-col">
                        {/* 解析摘要 */}
                        <div className="p-4 border-b border-slate-700/60">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">解析摘要</h3>
                            <div className="flex gap-3">
                                <div className="flex-1 bg-[#1a2332] rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-white">{formatNumber(file.rowCount)}</div>
                                    <div className="text-[11px] text-slate-400 mt-1">总行数</div>
                                </div>
                                <div className="flex-1 bg-[#1a2332] rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-emerald-400">{previewData?.headers?.length || 0}</div>
                                    <div className="text-[11px] text-slate-400 mt-1">有效列</div>
                                </div>
                            </div>
                        </div>

                        {/* Sheet 页签 */}
                        <div className="p-4 border-b border-slate-700/60">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">SHEET 页签</h3>
                            <div className="space-y-1.5">
                                {file.sheets?.map((sheet, idx) => (
                                    <button
                                        key={sheet.name}
                                        onClick={() => setActiveSheet(sheet.name)}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                                            ${activeSheet === sheet.name
                                                ? 'bg-primary/15 text-primary border border-primary/30'
                                                : 'bg-[#1a2332] text-slate-300 hover:bg-slate-700/50 border border-transparent'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">table_chart</span>
                                        <span className="flex-1 text-left truncate">{sheet.name}</span>
                                        {activeSheet === sheet.name && (
                                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* AI 提取核心字段 */}
                        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-[16px] text-purple-400">auto_awesome</span>
                                <h3 className="text-xs font-semibold text-slate-400 uppercase">AI 提取核心字段</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {coreFields.length > 0 ? (
                                    coreFields.map((field, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-700/60 text-slate-200 text-xs font-medium"
                                        >
                                            <span className="material-symbols-outlined text-[14px] text-primary">{field.icon}</span>
                                            {field.label}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-slate-500">正在识别...</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 中间数据表格区 */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-[#111921]">
                        {isLoading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-3">
                                    <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
                                    <span className="text-sm text-slate-400">加载数据中...</span>
                                </div>
                            </div>
                        ) : previewData ? (
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-sm border-collapse min-w-max">
                                    <thead className="sticky top-0 bg-[#1a2433] z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 border-b border-slate-700/50 w-12">#</th>
                                            {previewData.headers?.map(h => (
                                                <th
                                                    key={h.key}
                                                    className="px-4 py-3 text-left text-xs font-semibold text-slate-300 border-b border-slate-700/50 whitespace-nowrap"
                                                >
                                                    {h.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.data?.map((row, rowIndex) => (
                                            <tr
                                                key={rowIndex}
                                                className={`hover:bg-primary/5 transition-colors ${rowIndex % 2 === 0 ? 'bg-[#141c26]' : 'bg-[#111921]'
                                                    }`}
                                            >
                                                <td className="px-4 py-2.5 text-xs text-slate-500 border-b border-slate-800/50">{row.index}</td>
                                                {previewData.headers?.map(h => (
                                                    <td
                                                        key={h.key}
                                                        className="px-4 py-2.5 text-slate-300 border-b border-slate-800/50 max-w-[200px] truncate"
                                                    >
                                                        {row[h.key] ?? ''}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-500">
                                无法加载预览数据
                            </div>
                        )}
                    </div>

                    {/* 右侧 AI 智能解读面板 */}
                    <div className="w-[280px] shrink-0 border-l border-slate-700/60 bg-[#141c26] flex flex-col overflow-hidden">
                        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                            {/* AI 智能解读标题 */}
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[14px] text-emerald-400">psychology</span>
                                </div>
                                <h3 className="text-sm font-bold text-emerald-400">AI 智能解读</h3>
                            </div>

                            {isAnalyzing ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-3">
                                    <div className="relative">
                                        <span className="material-symbols-outlined text-3xl text-primary animate-pulse">auto_awesome</span>
                                    </div>
                                    <span className="text-sm text-slate-400">AI 正在分析...</span>
                                </div>
                            ) : aiSummary ? (
                                <div className="space-y-5">
                                    {/* 分析结果描述 */}
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        系统已分析 <span className="text-white font-semibold">{formatNumber(file.rowCount)}</span> 条数据记录。这文件为
                                        <span className="text-primary font-semibold"> {aiSummary.provider || '未知供应商'} </span>
                                        提供的标准对账单。
                                    </p>

                                    {/* 账单周期 */}
                                    <div className="flex gap-3">
                                        <span className="material-symbols-outlined text-[20px] text-slate-500">date_range</span>
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">账单周期</div>
                                            <div className="text-sm font-semibold text-white">{aiSummary.period || '未识别'}</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">完整自然月数据</div>
                                        </div>
                                    </div>

                                    {/* 结算币种 */}
                                    <div className="flex gap-3">
                                        <span className="material-symbols-outlined text-[20px] text-slate-500">currency_exchange</span>
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">结算币种</div>
                                            <div className="text-sm font-semibold text-white">{aiSummary.currency || '未识别'}</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">主汇率转换同步</div>
                                        </div>
                                    </div>

                                    {/* 潜在异常提示 */}
                                    {aiSummary.anomalies && aiSummary.anomalies !== '无' && (
                                        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="material-symbols-outlined text-[18px] text-amber-400">warning</span>
                                                <span className="text-sm font-semibold text-amber-400">潜在异常提示</span>
                                            </div>
                                            <p className="text-xs text-amber-200/80 leading-relaxed">{aiSummary.anomalies}</p>
                                            <button className="mt-2 text-xs text-primary hover:underline">查看异常行 →</button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-sm text-slate-500">暂无分析结果</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 底部操作栏 */}
                <div className="px-6 py-4 border-t border-slate-700/60 bg-[#1a2332] flex justify-between items-center">
                    <p className="text-xs text-slate-500">
                        显示前 {previewData?.data?.length || 0} 条数据 · 共 {formatNumber(file.rowCount)} 条
                    </p>
                    <button
                        onClick={() => {
                            onConfirm?.(file);
                            onClose();
                        }}
                        className="px-6 py-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg"
                    >
                        <span>确认使用此文件</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
