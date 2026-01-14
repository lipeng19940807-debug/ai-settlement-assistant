import React, { useState, useEffect } from 'react';
import { uploadFile, getFiles, getFilePreview, deleteFile, getTemplates, uploadAndParseTargetTemplate } from '../api';
import toast from 'react-hot-toast';
import SourceFilePreviewModal from './SourceFilePreviewModal';

export default function FileUpload({
    files,
    setFiles,
    targetTemplateName,
    setTargetTemplateName,
    targetFields,
    setTargetFields,
    setFieldMappings,
    onNext,
    readyToNext
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [templateSource, setTemplateSource] = useState('new');
    const [previewFile, setPreviewFile] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [isParsingTemplate, setIsParsingTemplate] = useState(false);

    // 加载模板列表
    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const list = await getTemplates();
            setTemplates(list);
        } catch (error) {
            console.error('加载模板失败:', error);
        }
    };

    // 应用模板
    const handleApplyTemplate = (template) => {
        setTargetTemplateName(template.name);
        setTargetFields(template.targetFields || []);
        // 预填充字段映射（在 AI 映射阶段作为初始值使用）
        if (template.fieldMappings && setFieldMappings) {
            setFieldMappings(template.fieldMappings);
        }
        toast.success(`已应用模板: ${template.name}`);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        await uploadFiles(droppedFiles);
    };

    const handleFileSelect = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        await uploadFiles(selectedFiles);
    };

    const uploadFiles = async (fileList) => {
        for (const file of fileList) {
            const toastId = toast.loading(`正在上传 ${file.name}...`);
            try {
                const fileInfo = await uploadFile(file);
                setFiles(prev => [...prev, fileInfo]);
                toast.success(`${file.name} 上传成功解析`, { id: toastId });
            } catch (error) {
                console.error(error);
                toast.error(`${file.name} 上传失败: ${error.message}`, { id: toastId });
            }
        }
    };

    const handleDelete = async (fileId) => {
        try {
            await deleteFile(fileId);
            setFiles(prev => prev.filter(f => f.id !== fileId));
            toast.success('文件已删除');
        } catch (error) {
            toast.error('删除文件失败');
        }
    };

    const handleAddTargetField = () => {
        setTargetFields(prev => [
            ...prev,
            { id: `target-${Date.now()}`, name: '', type: 'String', description: '', icon: 'text_fields' }
        ]);
    };

    const handleRemoveTargetField = (id) => {
        setTargetFields(prev => prev.filter(f => f.id !== id));
    };

    const handleFieldChange = (id, key, value) => {
        setTargetFields(prev => prev.map(f =>
            f.id === id ? { ...f, [key]: value } : f
        ));
    };

    // 处理目标模板文件上传（AI 自动解析字段）
    const handleTemplateFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 重置 input 以便可以再次选择同一文件
        e.target.value = '';

        const toastId = toast.loading('正在 AI 解析模板字段...');
        setIsParsingTemplate(true);

        try {
            const result = await uploadAndParseTargetTemplate(file);

            // 设置模板名称
            if (result.templateName) {
                setTargetTemplateName(result.templateName);
            }

            // 设置解析出的字段
            if (result.fields && result.fields.length > 0) {
                setTargetFields(result.fields);
                toast.success(`成功解析出 ${result.fields.length} 个目标字段`, { id: toastId });
            } else {
                toast.error('未能解析出字段，请手动添加', { id: toastId });
            }
        } catch (error) {
            console.error('解析模板失败:', error);
            toast.error(`解析失败: ${error.message}`, { id: toastId });
        } finally {
            setIsParsingTemplate(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <header className="h-16 flex items-center justify-between px-8 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">上传源文件与配置目标模板</h1>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                        <span className="text-xs font-medium text-primary">步骤 1/4</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col overflow-y-auto p-6 lg:p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-8">
                    {/* 上传区域 */}
                    <section className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">1</span>
                                上传供应商源文件
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div
                                className={`lg:col-span-1 relative min-h-[200px] rounded-xl border-2 border-dashed transition-colors group cursor-pointer flex flex-col items-center justify-center p-6 text-center
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-primary/30 bg-surface-light dark:bg-surface-dark hover:border-primary/60'}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('file-input').click()}
                            >
                                <input id="file-input" type="file" multiple className="hidden" onChange={handleFileSelect} accept=".xlsx,.xls,.csv" />
                                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">点击或拖拽文件至此</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-[200px]">支持多文件同时上传，单文件最大 100MB</p>
                                <button className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                    选择文件
                                </button>
                            </div>

                            <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col h-full min-h-[280px] overflow-hidden shadow-sm">
                                <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">已上传文件列表 ({files.length})</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                    {files.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <span className="material-symbols-outlined text-4xl mb-2 text-slate-300 dark:text-slate-700">folder_open</span>
                                            <span className="text-sm">暂无文件</span>
                                        </div>
                                    )}
                                    {files.map(file => (
                                        <div
                                            key={file.id}
                                            className="relative flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-primary/30 hover:bg-white dark:hover:bg-slate-800 transition-all group cursor-pointer"
                                            onClick={() => setPreviewFile(file)}
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                                <span className="material-symbols-outlined text-[24px]">description</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.name}</h4>
                                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                    <span>{file.size}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                    <span>{file.rowCount?.toLocaleString()} 行</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                    <span>{file.sheets?.length || 0} 个 Sheet</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                                                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <hr className="border-border-light dark:border-border-dark" />

                    {/* 模板配置区域 */}
                    <section className="flex flex-col gap-4 flex-1 min-h-0">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">2</span>
                                目标模板配置
                            </h2>
                        </div>
                        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                            <div className="p-6">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <label className="flex-1 relative cursor-pointer group">
                                        <input className="peer sr-only" type="radio" checked={templateSource === 'new'} onChange={() => setTemplateSource('new')} />
                                        <div className="h-full p-4 rounded-xl border border-border-light dark:border-slate-700 bg-white dark:bg-slate-800 peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-slate-900 dark:text-white">新建加工模板</span>
                                                {templateSource === 'new' && (
                                                    <label
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer
                                                            ${isParsingTemplate
                                                                ? 'bg-primary/20 text-primary'
                                                                : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                                                            }`}
                                                    >
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept=".xlsx,.xls,.csv"
                                                            onChange={handleTemplateFileUpload}
                                                            disabled={isParsingTemplate}
                                                        />
                                                        <span className={`material-symbols-outlined text-[16px] ${isParsingTemplate ? 'animate-spin' : ''}`}>
                                                            {isParsingTemplate ? 'progress_activity' : 'auto_awesome'}
                                                        </span>
                                                        <span>{isParsingTemplate ? 'AI 解析中...' : '上传模板文件'}</span>
                                                    </label>
                                                )}
                                            </div>
                                            <input
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-primary focus:border-primary"
                                                placeholder="请输入新模板名称"
                                                value={targetTemplateName}
                                                onChange={(e) => setTargetTemplateName(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            {templateSource === 'new' && (
                                                <p className="mt-2 text-xs text-slate-400">
                                                    <span className="material-symbols-outlined text-[12px] align-middle mr-1">info</span>
                                                    可上传现有模板文件，AI 将自动解析字段
                                                </p>
                                            )}
                                        </div>
                                    </label>
                                    <label className="flex-1 relative cursor-pointer group">
                                        <input className="peer sr-only" type="radio" checked={templateSource === 'existing'} onChange={() => setTemplateSource('existing')} />
                                        <div className="h-full p-4 rounded-xl border border-border-light dark:border-slate-700 bg-white dark:bg-slate-800 peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary transition-all">
                                            <span className="font-bold text-slate-900 dark:text-white">选择已有模板</span>
                                            {templateSource === 'existing' && templates.length > 0 && (
                                                <div className="mt-2 space-y-1 max-h-[120px] overflow-y-auto">
                                                    {templates.map(t => (
                                                        <div
                                                            key={t.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedTemplateId(t.id);
                                                                handleApplyTemplate(t);
                                                            }}
                                                            className={`p-2 rounded-lg cursor-pointer text-sm transition-colors ${selectedTemplateId === t.id
                                                                ? 'bg-primary/10 border border-primary text-primary'
                                                                : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                                                                }`}
                                                        >
                                                            <div className="font-medium">{t.name}</div>
                                                            <div className="text-xs text-slate-500">{t.targetFields?.length || 0} 个字段</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {templateSource === 'existing' && templates.length === 0 && (
                                                <p className="mt-2 text-sm text-slate-500">暂无已保存的模板</p>
                                            )}
                                            {templateSource !== 'existing' && (
                                                <p className="mt-2 text-sm text-slate-500">{templates.length} 个可用模板</p>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="px-6 py-3 flex items-center justify-between border-y border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/30">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">字段列表 ({targetFields.length})</span>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="p-4 space-y-2">
                                    {targetFields.map(field => (
                                        <div key={field.id} className="grid grid-cols-12 gap-4 items-center bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <input
                                                value={field.name}
                                                onChange={(e) => handleFieldChange(field.id, 'name', e.target.value)}
                                                className="col-span-3 px-2 py-1 bg-transparent border-b border-transparent focus:border-primary outline-none text-sm font-bold"
                                                placeholder="字段名称"
                                            />
                                            <select
                                                value={field.type}
                                                onChange={(e) => handleFieldChange(field.id, 'type', e.target.value)}
                                                className="col-span-2 px-2 py-1 bg-transparent text-xs text-slate-500 focus:text-primary outline-none"
                                            >
                                                <option value="String">文本</option>
                                                <option value="Date">日期</option>
                                                <option value="Currency">金额</option>
                                                <option value="Number">数字</option>
                                            </select>
                                            <input
                                                value={field.description}
                                                onChange={(e) => handleFieldChange(field.id, 'description', e.target.value)}
                                                className="col-span-6 px-2 py-1 bg-transparent border-b border-transparent focus:border-primary outline-none text-sm text-slate-500"
                                                placeholder="描述"
                                            />
                                            <div className="col-span-1 text-right">
                                                <button onClick={() => handleRemoveTargetField(field.id)} className="text-slate-400 hover:text-red-500">
                                                    <span className="material-symbols-outlined text-[20px]">remove_circle</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleAddTargetField} className="w-full py-3 flex items-center justify-center gap-2 text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-sm font-medium">
                                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                    添加新字段
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <footer className="shrink-0 p-4 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-sm border-t border-border-light dark:border-border-dark flex items-center justify-end z-10">
                <button
                    className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-md shadow-primary/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!readyToNext}
                    onClick={onNext}
                >
                    <span>下一步：AI 智能关联</span>
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                </button>
            </footer>

            {/* 文件预览弹窗 */}
            {previewFile && (
                <SourceFilePreviewModal
                    file={previewFile}
                    onClose={() => setPreviewFile(null)}
                    onConfirm={(file) => {
                        toast.success(`已确认使用文件: ${file.name}`);
                    }}
                />
            )}
        </div>
    );
}
