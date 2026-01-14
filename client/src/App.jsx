import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import FieldMapping from './components/FieldMapping';
import RuleEditor from './components/RuleEditor';
import Processing from './components/Processing';

function App() {
    const [step, setStep] = useState('upload'); // upload, mapping, ruleEditor, processing

    // State
    const [files, setFiles] = useState([]);
    const [targetTemplateName, setTargetTemplateName] = useState('XX承运商对账模版');
    const [targetFields, setTargetFields] = useState([
        { id: 'target-1', name: '发票号码', type: 'String', description: '物流商提供的唯一发票号', icon: 'numbers' },
        { id: 'target-2', name: '发货日期', type: 'Date', description: '格式: YYYY-MM-DD', icon: 'calendar_month' },
        { id: 'target-3', name: '总费用', type: 'Currency', description: '含税费用', icon: 'attach_money' },
    ]);

    const [fieldMappings, setFieldMappings] = useState([]);
    const [editingMapping, setEditingMapping] = useState(null);

    // Navigation handlers
    const handleUploadNext = () => setStep('mapping');
    const handleMappingBack = () => setStep('upload');
    const handleMappingNext = () => setStep('processing');

    const handleEditRule = (mapping) => {
        setEditingMapping(mapping);
        setStep('ruleEditor');
    };

    const handleRuleEditorSave = (updatedMapping) => {
        setFieldMappings(prev => prev.map(m =>
            m.targetFieldId === updatedMapping.targetFieldId ? updatedMapping : m
        ));
        setStep('mapping');
        setEditingMapping(null);
    };

    const handleRuleEditorCancel = () => {
        setStep('mapping');
        setEditingMapping(null);
    };

    const handleProcessingBack = () => setStep('mapping');

    // Render
    return (
        <div className="flex h-screen w-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
            {/* Sidebar - Simplified */}
            <aside className="w-64 bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark flex flex-col shrink-0 z-20">
                <div className="h-16 flex items-center px-6 border-b border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-2 text-primary">
                        <span className="material-symbols-outlined text-[28px] filled">local_shipping</span>
                        <span className="text-lg font-bold tracking-tight">智运结算 AI</span>
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    <div onClick={() => setStep('upload')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer ${step === 'upload' ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <span className="material-symbols-outlined text-[20px]">upload_file</span>
                        <span className="text-sm">源文件接入</span>
                    </div>
                    <div onClick={() => setStep('mapping')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer ${step === 'mapping' || step === 'ruleEditor' ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <span className="material-symbols-outlined text-[20px]">hub</span>
                        <span className="text-sm">AI 字段映射</span>
                    </div>
                    <div onClick={() => setStep('processing')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer ${step === 'processing' ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <span className="material-symbols-outlined text-[20px]">play_circle</span>
                        <span className="text-sm">对账执行</span>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50 dark:bg-[#0b1121]">
                {step === 'upload' && (
                    <FileUpload
                        files={files}
                        setFiles={setFiles}
                        targetTemplateName={targetTemplateName}
                        setTargetTemplateName={setTargetTemplateName}
                        targetFields={targetFields}
                        setTargetFields={setTargetFields}
                        setFieldMappings={setFieldMappings}
                        onNext={handleUploadNext}
                        readyToNext={files.length > 0 && targetFields.length > 0}
                    />
                )}

                {step === 'mapping' && (
                    <FieldMapping
                        files={files}
                        targetFields={targetFields}
                        targetTemplateName={targetTemplateName}
                        fieldMappings={fieldMappings}
                        setFieldMappings={setFieldMappings}
                        onNext={handleMappingNext}
                        onBack={handleMappingBack}
                        onEditRule={handleEditRule}
                        onEditMapping={() => { }}
                    />
                )}

                {step === 'ruleEditor' && editingMapping && (
                    <RuleEditor
                        mapping={editingMapping}
                        targetField={targetFields.find(f => f.id === editingMapping.targetFieldId)}
                        files={files}
                        onSave={handleRuleEditorSave}
                        onCancel={handleRuleEditorCancel}
                    />
                )}

                {step === 'processing' && (
                    <Processing
                        files={files}
                        fieldMappings={fieldMappings}
                        targetFields={targetFields}
                        targetTemplateName={targetTemplateName}
                        onBack={handleProcessingBack}
                    />
                )}
            </div>
        </div>
    );
}

export default App;
