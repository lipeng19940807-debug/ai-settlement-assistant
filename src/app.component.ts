import { Component, ChangeDetectionStrategy, signal, computed, effect, WritableSignal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';

type Step = 'upload' | 'mapping' | 'ruleEditor' | 'summary' | 'processing';
type TemplateSource = 'existing' | 'new';

interface SourceFile {
  id: string;
  name: string;
  size: string;
  status: 'parsing' | 'success' | 'error';
  rowCount: number;
  uploadTime: string;
  error?: string;
  sheets?: { name: string; fields: SourceField[] }[];
}

interface SourceField {
  id: string;
  name: string;
  type: 'String' | 'Integer' | 'Date' | 'Float';
  sample: string;
  column: string;
}

interface TargetField {
  id: string;
  name: string;
  type: 'String' | 'Date' | 'Currency' | 'Number';
  description: string;
  icon: string;
  regex?: string;
  required?: boolean;
  unique?: boolean;
  businessRule?: string;
}

interface FieldMapping {
    targetFieldId: string;
    sourceFileId: string | null;
    sourceFieldId: string | null;
    matchConfidence: number;
    processingRule?: string;
    generatedCode?: string;
}

interface ProcessResult {
  id: number;
  sourceId: string;
  standardDate: string;
  feeType: string;
  amount: number;
  status: 'PASS' | 'WARN' | 'ERR';
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
})
export class AppComponent {
  // --- STATE MANAGEMENT ---
  step: WritableSignal<Step> = signal('upload');
  activeMenu = computed(() => {
    const currentStep = this.step();
    if (['upload'].includes(currentStep)) return '源文件接入';
    if (['mapping', 'ruleEditor', 'summary'].includes(currentStep)) return 'AI 字段映射';
    if (['processing'].includes(currentStep)) return '对账执行';
    return '概览仪表盘';
  });

  // Step 1: Upload
  sourceFiles = signal<SourceFile[]>([
    { id: 'file-1', name: '物流明细_10月.xlsx', size: '1.2MB', status: 'success', rowCount: 12405, uploadTime: '10:23',
      sheets: [
        { name: 'Sheet1', fields: [
          { id: 'file-1-field-1', name: '发票号 (Invoice No)', type: 'String', sample: 'INV-2023-10-001', column: 'B' },
          { id: 'file-1-field-2', name: '单据编号 (Doc No)', type: 'String', sample: 'DOC-19341', column: 'A' },
          { id: 'file-1-field-3', name: '开票日期 (Date)', type: 'Date', sample: '2023-10-01', column: 'C' },
          { id: 'file-1-field-4', name: '购买方名称 (Buyer)', type: 'String', sample: '某某科技有限公司', column: 'D' },
        ]}
      ]
    },
    { id: 'file-2', name: '运输单据_A.csv', size: '840KB', status: 'success', rowCount: 8520, uploadTime: '10:25',
      sheets: [
        { name: 'Sheet1', fields: [
            { id: 'file-2-field-1', name: 'id', type: 'Integer', sample: '1001', column: 'A' },
            { id: 'file-2-field-2', name: 'amount', type: 'Float', sample: '199.99', column: 'B' },
        ]}
      ]
    },
    { id: 'file-3', name: '供应商主数据.xls', size: '2.4MB', status: 'success', rowCount: 1500, uploadTime: '10:21', 
        sheets: [
            { name: 'Sheet1', fields: [] }
        ]
    }
  ]);
  templateSource = signal<TemplateSource>('new');
  targetTemplateName = signal('XX承运商对账模版');
  targetFields = signal<TargetField[]>([
    { id: 'target-1', name: '发票号码', type: 'String', description: '物流商提供的唯一发票号', icon: 'numbers',
      regex: '^[A-Z0-9-]{5,20}$', required: true, unique: true, 
      businessRule: '该字段用于后续的财务对账主键，必须保证全局唯一。'
    },
    { id: 'target-2', name: '发货日期', type: 'Date', description: '格式: YYYY-MM-DD', icon: 'calendar_month', required: true },
    { id: 'target-3', name: '总费用(含税)', type: 'Currency', description: '保留2位小数', icon: 'attach_money', required: true },
  ]);

  // Modals
  showFilePreviewModal = signal(false);
  selectedFileForPreview = signal<SourceFile | null>(null);
  aiFileSummary = signal<{ provider: string; period: string; currency: string; anomalies: string; } | null>(null);
  isSummaryLoading = signal(false);
  previewTableHeaders = signal<{key: string; label: string}[]>([]);
  previewTableData = signal<any[]>([]);

  aiExtractedFields = signal([
    { name: '运单号', color: 'blue' },
    { name: '发货时间', color: 'blue' },
    { name: '始发地', color: 'blue' },
    { name: '目的地', color: 'blue' },
    { name: '计费重量', color: 'green' },
    { name: '总费用', color: 'green' },
    { name: '收件人', color: 'purple' },
  ]);
  
  // Step 2 & 3: Mapping & Rules
  isMappingLoading = signal(false);
  fieldMappings = signal<FieldMapping[]>([]);
  selectedMappingForRules: WritableSignal<FieldMapping | null> = signal(null);
  ruleDescription = signal('');
  rulePreviewResult = signal<string | null>(null);

  // Mapping Editor Modal State
  showMappingModal = signal(false);
  editingMapping = signal<FieldMapping | null>(null);
  modalSelectedFileId = signal<string | null>(null);
  modalSelectedFieldId = signal<string | null>(null);
  
  // Step 4 & 5: Summary & Processing
  processingProgress = signal(0);
  summaryConfirmed = signal(false);
  processingResults = signal<ProcessResult[]>([]);
  
  // Computed State
  readySourceFiles = computed(() => this.sourceFiles().filter(f => f.status === 'success'));
  readySourceFilesCount = computed(() => this.readySourceFiles().length);
  targetFieldsCount = computed(() => this.targetFields().length);
  mappedFieldsCount = computed(() => this.fieldMappings().filter(m => m.sourceFieldId).length);
  totalRowCount = computed(() => this.sourceFiles().reduce((acc, file) => acc + (file.status === 'success' ? file.rowCount : 0), 0));
  
  modalSourceFields = computed(() => {
    const selectedFile = this.sourceFiles().find(f => f.id === this.modalSelectedFileId());
    return selectedFile?.sheets ?? [];
  });

  // --- DEPENDENCY INJECTION ---
  constructor(public geminiService: GeminiService) {}

  // --- METHODS ---
  goToStep(newStep: Step) {
    if (newStep === 'summary') {
      this.summaryConfirmed.set(false);
    }
    this.step.set(newStep);
  }

  // Step 1 Methods
  addNewTargetField() {
    this.targetFields.update(fields => [
      ...fields,
      { id: `target-${Date.now()}`, name: '', type: 'String', description: '', icon: 'text_fields' }
    ]);
  }
  
  removeTargetField(id: string) {
    this.targetFields.update(fields => fields.filter(f => f.id !== id));
  }

  async startMapping() {
    this.isMappingLoading.set(true);
    this.step.set('mapping');
    const sourceFields = this.sourceFiles().flatMap(f => f.sheets?.flatMap(s => s.fields) ?? []);
    const mappings = await this.geminiService.getAiFieldMappings(sourceFields, this.targetFields());
    this.fieldMappings.set(mappings as FieldMapping[]);
    this.isMappingLoading.set(false);
  }

  async openFilePreview(file: SourceFile) {
    this.selectedFileForPreview.set(file);
    this.showFilePreviewModal.set(true);
    this.isSummaryLoading.set(true);
    this.aiFileSummary.set(null);

    const headers = [
      { key: 'index', label: '#' },
      { key: 'trackingNo', label: '运单号 (TRACKING NO)' },
      { key: 'date', label: '发货日期 (DATE)' },
      { key: 'origin', label: '始发城市 (ORIGIN)' },
      { key: 'dest', label: '目的城市 (DEST)' },
      { key: 'weight', label: '重量' },
    ];
    this.previewTableHeaders.set(headers);

    const mockData = Array.from({ length: 30 }, (_, i) => ({
      index: i + 1,
      trackingNo: `SF13049283${41 + i}`,
      date: `2023-10-${String(1 + Math.floor(i / 3)).padStart(2, '0')}`,
      origin: ['上海 (PVG)', '深圳 (SZX)'][i % 2],
      dest: ['北京 (PEK)', '成都 (CTU)'][i % 2],
      weight: (1.5 + Math.random() * 10).toFixed(2),
    }));
    this.previewTableData.set(mockData);

    const summary = await this.geminiService.getAiFileSummary();
    this.aiFileSummary.set(summary as any);
    this.isSummaryLoading.set(false);
  }

  closeFilePreviewModal() {
    this.showFilePreviewModal.set(false);
    setTimeout(() => {
        this.selectedFileForPreview.set(null);
        this.previewTableData.set([]);
    }, 300);
  }


  // Step 2 Methods
  getTargetField(id: string): TargetField | undefined {
    return this.targetFields().find(tf => tf.id === id);
  }

  getSourceFieldInfo(mapping: FieldMapping): { file: SourceFile; field: SourceField } | null {
    if (!mapping.sourceFileId || !mapping.sourceFieldId) return null;
    const file = this.sourceFiles().find(f => f.id === mapping.sourceFileId);
    if (!file) return null;
    const field = file.sheets?.flatMap(s => s.fields).find(f => f.id === mapping.sourceFieldId);
    if (!field) return null;
    return { file, field };
  }
  
  openRuleEditor(mapping: FieldMapping) {
    this.selectedMappingForRules.set(mapping);
    this.ruleDescription.set(mapping.processingRule || '');
    this.rulePreviewResult.set(null);
    this.step.set('ruleEditor');
  }

  openMappingEditor(mapping: FieldMapping) {
    this.editingMapping.set(mapping);
    this.modalSelectedFileId.set(mapping.sourceFileId ?? this.readySourceFiles()[0]?.id ?? null);
    this.modalSelectedFieldId.set(mapping.sourceFieldId);
    this.showMappingModal.set(true);
  }

  closeMappingEditor() {
    this.showMappingModal.set(false);
    setTimeout(() => {
        this.editingMapping.set(null);
        this.modalSelectedFileId.set(null);
        this.modalSelectedFieldId.set(null);
    }, 300);
  }

  saveMappingChanges() {
    const currentMapping = this.editingMapping();
    if (!currentMapping) return;

    this.fieldMappings.update(mappings => {
        const index = mappings.findIndex(m => m.targetFieldId === currentMapping.targetFieldId);
        if (index > -1) {
            mappings[index].sourceFileId = this.modalSelectedFileId();
            mappings[index].sourceFieldId = this.modalSelectedFieldId();
            mappings[index].matchConfidence = 100; // Manual selection is always 100%
        }
        return [...mappings];
    });

    this.closeMappingEditor();
  }

  // Step 3 Methods
  async generateCode() {
    const mapping = this.selectedMappingForRules();
    if (!mapping || !this.ruleDescription()) return;

    const sourceFile = this.sourceFiles().find(f => f.id === mapping.sourceFileId);
    const sampleFields = sourceFile?.sheets?.flatMap(s => s.fields) ?? [];
    if (sampleFields.length === 0) {
      console.error("No sample source fields available to generate code.");
      return;
    }
    
    const code = await this.geminiService.generatePythonCode(this.ruleDescription(), sampleFields);
    
    this.selectedMappingForRules.update(m => {
        if(m) {
            m.generatedCode = code;
        }
        return m;
    });

    if (this.ruleDescription().includes('连接')) {
        this.rulePreviewResult.set('SF1304928341-001');
    } else {
        this.rulePreviewResult.set('PREVIEW_RESULT');
    }
  }

  saveRule() {
    const rule = this.selectedMappingForRules();
    if (!rule) return;

    this.fieldMappings.update(mappings => {
      const index = mappings.findIndex(m => m.targetFieldId === rule.targetFieldId);
      if (index !== -1) {
        mappings[index].processingRule = this.ruleDescription();
        mappings[index].generatedCode = rule.generatedCode;
      }
      return [...mappings];
    });

    this.step.set('mapping');
    this.selectedMappingForRules.set(null);
  }
  
  // Step 5 Methods
  startProcessing() {
    this.step.set('processing');
    this.processingProgress.set(0);
    this.processingResults.set([]);
    
    const interval = setInterval(() => {
        this.processingProgress.update(p => {
            const newProgress = p + 5;
            if (newProgress >= 100) {
                clearInterval(interval);
                this.generateMockResults();
                return 100;
            }
            return newProgress;
        });
    }, 150);
  }

  generateMockResults() {
    const results: ProcessResult[] = [
      { id: 1, sourceId: 'SF1304928341', standardDate: '2023-10-01', feeType: '基础运费', amount: 35.00, status: 'PASS' },
      { id: 2, sourceId: 'SF1304928342', standardDate: '2023-10-02', feeType: '燃油附加费', amount: 12.50, status: 'PASS' },
      { id: 3, sourceId: 'SF1304928349', standardDate: '2023-10-05', feeType: '--', amount: 0.00, status: 'WARN' },
      { id: 4, sourceId: 'SF1304928350', standardDate: '2023-10-06', feeType: '基础运费', amount: 38.00, status: 'PASS' },
      { id: 5, sourceId: 'SF1304928355', standardDate: '--', feeType: '代收货款', amount: 200.00, status: 'ERR' },
      { id: 6, sourceId: 'SF1304928356', standardDate: '2023-10-06', feeType: '包装费', amount: 5.00, status: 'PASS' },
    ];
    this.processingResults.set(results);
  }
}