import React, { useState, useEffect, useMemo } from 'react';
import { getAiFieldMappings, saveTemplate } from '../api';
import SourceFieldSelector from './SourceFieldSelector';
import toast from 'react-hot-toast';

export default function FieldMapping({
    files,
    targetFields,
    targetTemplateName,
    fieldMappings,
    setFieldMappings,
    onNext,
    onBack,
    onEditMapping,
    onEditRule
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectorForMapping, setSelectorForMapping] = useState(null);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    // 使用 ref 追踪已经处理过的目标字段 ID，避免重复处理
    const processedTargetIdsRef = React.useRef(new Set());

    useEffect(() => {
        // 检查是否有需要映射的新字段
        checkAndMapNewFields();
    }, [targetFields]);

    // 检查并映射新增/修改的字段
    const checkAndMapNewFields = async () => {
        // 当前所有目标字段的 ID
        const currentTargetIds = new Set(targetFields.map(tf => tf.id));

        // 找出真正需要新映射的字段（不在已处理集合中，也不在当前映射中）
        const existingMappedIds = new Set(fieldMappings.map(m => m.targetFieldId));
        const newTargetFields = targetFields.filter(tf =>
            !processedTargetIdsRef.current.has(tf.id) && !existingMappedIds.has(tf.id)
        );

        // 清理已删除字段的映射
        const invalidMappings = fieldMappings.filter(m => !currentTargetIds.has(m.targetFieldId));
        if (invalidMappings.length > 0) {
            // 从已处理集合中移除已删除的字段
            invalidMappings.forEach(m => processedTargetIdsRef.current.delete(m.targetFieldId));
            // 更新映射，移除无效的
            setFieldMappings(prev => prev.filter(m => currentTargetIds.has(m.targetFieldId)));
        }

        // 如果没有新字段需要映射，直接返回
        if (newTargetFields.length === 0) {
            // 如果完全没有映射，进行初始化
            if (fieldMappings.length === 0 && targetFields.length > 0) {
                initMapping();
            }
            return;
        }

        // 标记这些字段为正在处理，防止重复触发
        newTargetFields.forEach(tf => processedTargetIdsRef.current.add(tf.id));

        // 对新增字段进行 AI 映射
        setIsLoading(true);
        try {
            // 收集所有源字段
            const allSourceFields = files.flatMap(f =>
                f.sheets?.flatMap(s => s.fields.map(field => ({
                    ...field,
                    fileId: f.id,
                    fileName: f.name,
                    sheetName: s.name,
                    uniqueId: field.id
                }))) ?? []
            );

            // 只对新字段调用 AI 映射
            const { mappings } = await getAiFieldMappings(allSourceFields, newTargetFields);

            // 补充完整信息
            const newMappings = mappings.map(m => {
                const sourceField = allSourceFields.find(sf => sf.uniqueId === m.sourceFieldId);
                return {
                    ...m,
                    sourceFileName: sourceField?.fileName,
                    sourceFieldName: sourceField?.name
                };
            });

            // 合并新映射到现有映射（使用 Map 去重，以 targetFieldId 为 key）
            setFieldMappings(prev => {
                const mappingMap = new Map();
                // 先添加现有映射
                prev.forEach(m => {
                    if (currentTargetIds.has(m.targetFieldId)) {
                        mappingMap.set(m.targetFieldId, m);
                    }
                });
                // 再添加新映射（不会覆盖已有的）
                newMappings.forEach(m => {
                    if (!mappingMap.has(m.targetFieldId)) {
                        mappingMap.set(m.targetFieldId, m);
                    }
                });
                return Array.from(mappingMap.values());
            });

            if (newTargetFields.length > 0) {
                toast.success(`已为 ${newTargetFields.length} 个新字段完成 AI 匹配`);
            }
        } catch (error) {
            console.error('AI 增量映射失败:', error);
            // Fallback: 为新字段创建空映射
            const fallbackMappings = newTargetFields.map(tf => ({
                targetFieldId: tf.id,
                sourceFieldId: null,
                matchConfidence: 0
            }));
            setFieldMappings(prev => {
                const mappingMap = new Map();
                prev.forEach(m => {
                    if (currentTargetIds.has(m.targetFieldId)) {
                        mappingMap.set(m.targetFieldId, m);
                    }
                });
                fallbackMappings.forEach(m => {
                    if (!mappingMap.has(m.targetFieldId)) {
                        mappingMap.set(m.targetFieldId, m);
                    }
                });
                return Array.from(mappingMap.values());
            });
        } finally {
            setIsLoading(false);
        }
    };

    const initMapping = async () => {
        setIsLoading(true);
        try {
            // 收集所有源字段
            const allSourceFields = files.flatMap(f =>
                f.sheets?.flatMap(s => s.fields.map(field => ({
                    ...field,
                    fileId: f.id,
                    fileName: f.name,
                    sheetName: s.name,
                    uniqueId: field.id // Ensure we have a unique ID for React keys
                }))) ?? []
            );

            // 调用 AI 接口
            const { mappings } = await getAiFieldMappings(allSourceFields, targetFields);

            // 补充完整信息
            const fullMappings = mappings.map(m => {
                const sourceField = allSourceFields.find(sf => sf.uniqueId === m.sourceFieldId);
                return {
                    ...m,
                    sourceFileName: sourceField?.fileName,
                    sourceFieldName: sourceField?.name
                };
            });

            setFieldMappings(fullMappings);
        } catch (error) {
            console.error('AI MAPPING FAILED', error);
            // Fallback: create empty mappings
            setFieldMappings(targetFields.map(tf => ({
                targetFieldId: tf.id,
                sourceFieldId: null,
                matchConfidence: 0
            })));
        } finally {
            setIsLoading(false);
        }
    };

    const getTargetField = (id) => targetFields.find(f => f.id === id);

    // 所有源字段的快速查找表
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

    // 处理源字段选择
    const handleSourceSelect = (sourceField) => {
        if (!selectorForMapping) return;

        setFieldMappings(prev => prev.map(m => {
            if (m.targetFieldId !== selectorForMapping.targetFieldId) return m;

            if (!sourceField) {
                // 选择了"不映射"
                return {
                    ...m,
                    sourceFieldId: null,
                    sourceFileName: null,
                    sourceFieldName: null,
                    matchConfidence: 0
                };
            }

            return {
                ...m,
                sourceFieldId: sourceField.uniqueId,
                sourceFileName: sourceField.fileName,
                sourceFieldName: sourceField.name,
                matchConfidence: 100 // 手动选择的置信度为 100%
            };
        }));

        setSelectorForMapping(null);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <header className="h-16 bg-white dark:bg-surface-dark border-b border-border-light dark:border-border-dark flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">AI 智能字段映射</h1>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                        <span className="text-xs font-medium text-primary">步骤 2/4</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
                        <p className="mt-4 text-sm font-medium">AI 正在分析并映射字段...</p>
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto w-full flex flex-col gap-4">
                        <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <div className="col-span-3">目标字段 (Target)</div>
                            <div className="col-span-4 pl-4">已映射源信息 (Mapped Source)</div>
                            <div className="col-span-2 text-center">AI 匹配度</div>
                            <div className="col-span-3 text-right pr-2">操作 (Action)</div>
                        </div>

                        {fieldMappings.map(mapping => {
                            const targetField = getTargetField(mapping.targetFieldId);
                            if (!targetField) return null;

                            return (
                                <div key={mapping.targetFieldId} className="group bg-white dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-md hover:border-primary/30 transition-all p-4 grid grid-cols-12 gap-4 items-center animate-fade-in">
                                    <div className="col-span-3 flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800">
                                            <span className="material-symbols-outlined text-[22px]">{targetField.icon}</span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{targetField.name}</div>
                                            <div className="text-xs font-mono text-slate-400 mt-0.5">{targetField.type}</div>
                                        </div>
                                    </div>

                                    <div className="col-span-4 flex items-center gap-3 pl-2">
                                        <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">arrow_right_alt</span>
                                        <div className="flex-1 min-w-0" onClick={() => setSelectorForMapping(mapping)}>
                                            {mapping.sourceFieldId ? (
                                                <div className={`bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors group/source
                                                    ${mapping.matchConfidence < 80 ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                                                            <span className="truncate max-w-[120px]">{mapping.sourceFileName}</span>
                                                        </div>
                                                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{mapping.sourceFieldName}</div>
                                                    </div>
                                                    <span className="material-symbols-outlined text-slate-400 text-sm group-hover/source:text-primary">expand_more</span>
                                                </div>
                                            ) : (
                                                <button className="w-full flex items-center justify-center px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary hover:text-primary transition-colors text-slate-400 gap-2 h-[58px]">
                                                    <span className="material-symbols-outlined text-sm">add_link</span>
                                                    <span className="text-sm">点击选择源字段</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-span-2 flex justify-center">
                                        {mapping.sourceFieldId && (
                                            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border 
                                                ${mapping.matchConfidence >= 80
                                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-700 dark:text-green-400'
                                                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-400'}`}>
                                                <span className="text-xs font-bold">{mapping.matchConfidence}% 匹配</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-span-3 flex justify-end">
                                        {mapping.processingRule ? (
                                            <div onClick={() => onEditRule(mapping)} className="w-full flex items-center justify-between gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-2.5 group/edit hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors cursor-pointer">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-indigo-900 dark:text-indigo-100 leading-relaxed truncate">
                                                        <span className="font-bold text-primary mr-1">[AI简述]</span>
                                                        {mapping.processingRule}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded hover:bg-white/50 dark:hover:bg-black/20 text-indigo-400 hover:text-primary transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">edit_square</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => onEditRule(mapping)}
                                                className="flex items-center justify-center gap-2 w-full max-w-[160px] h-10 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium shadow-sm shadow-blue-500/20 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">tune</span>
                                                <span>设置加工规则</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <footer className="h-16 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-sm border-t border-border-light dark:border-border-dark flex items-center justify-between px-8 shrink-0 z-20">
                <button
                    onClick={async () => {
                        if (!targetTemplateName) {
                            toast.error('请先在上一步设置模板名称');
                            return;
                        }
                        setIsSavingTemplate(true);
                        try {
                            await saveTemplate(targetTemplateName, targetFields, fieldMappings);
                            toast.success(`模板 "${targetTemplateName}" 保存成功`);
                        } catch (error) {
                            toast.error('保存模板失败');
                        } finally {
                            setIsSavingTemplate(false);
                        }
                    }}
                    disabled={isSavingTemplate}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary text-primary font-medium hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-lg">{isSavingTemplate ? 'progress_activity' : 'save'}</span>
                    <span>保存为模板</span>
                </button>
                <div className="flex gap-4">
                    <button onClick={onBack} className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-slate-700 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        返回上一步
                    </button>
                    <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold shadow-lg transition-all transform hover:scale-[1.02] active:scale-95">
                        <span>确认映射</span>
                        <span className="material-symbols-outlined text-sm">check</span>
                    </button>
                </div>
            </footer>

            {/* 源字段选择弹窗 */}
            {selectorForMapping && (
                <SourceFieldSelector
                    files={files}
                    currentSourceId={selectorForMapping.sourceFieldId}
                    onSelect={handleSourceSelect}
                    onClose={() => setSelectorForMapping(null)}
                />
            )}
        </div>
    );
}
