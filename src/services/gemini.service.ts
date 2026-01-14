import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

// Copied from app.component.ts for type safety in this service
interface FieldMapping {
    targetFieldId: string;
    sourceFileId: string | null;
    sourceFieldId: string | null;
    matchConfidence: number;
    processingRule?: string;
    generatedCode?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private genAI: GoogleGenAI | null = null;
  public isGenerating = signal(false);

  constructor() {
    // IMPORTANT: The API key is sourced from environment variables for security.
    // It is assumed to be set in the deployment environment.
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey });
    } else {
      console.error('Gemini API key not found in environment variables (process.env.API_KEY).');
    }
  }

  async generatePythonCode(description: string, sourceFields: { id: string; name: string; sample: string }[]): Promise<string> {
    if (!this.genAI) {
      const errorMessage = 'Gemini AI client is not initialized. Ensure API key is available.';
      console.error(errorMessage);
      return Promise.reject(errorMessage);
    }
    this.isGenerating.set(true);

    const sourceFieldExamples = sourceFields.map(f => `# record.get('${f.name}') (sample: '${f.sample}')`).join('\n    ');

    const prompt = `
      You are an expert Python developer writing a data transformation function.
      The function signature must be: def process_field_logic(record):
      - It accepts a single argument 'record', which is a dictionary representing a row of data from a source file.
      - The keys of the dictionary are the source column names.
      - The function must return the transformed value.

      Here are the available source fields and a sample value for each:
      ${sourceFieldExamples}

      Based on the user's request below, generate the complete Python function.
      - Include concise, helpful comments in the code.
      - The function should gracefully handle cases where keys might be missing in the 'record' dictionary by using record.get('key', default_value).
      - Do NOT include any explanatory text, markdown formatting, or anything else before or after the Python code block. Output only the raw Python code for the function.

      User Request: "${description}"
    `;

    try {
      const response: GenerateContentResponse = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      let pythonCode = response.text.trim();
      
      // Clean up the response to only get the python code block
      if (pythonCode.startsWith('```python')) {
        pythonCode = pythonCode.substring(9, pythonCode.length - 3).trim();
      } else if (pythonCode.startsWith('```')) {
        pythonCode = pythonCode.substring(3, pythonCode.length - 3).trim();
      }

      return pythonCode;
    } catch (error) {
      console.error('Error generating Python code with Gemini:', error);
      return Promise.reject('Failed to generate code. Please check your API key and network connection.');
    } finally {
        this.isGenerating.set(false);
    }
  }

  // Mocks for other AI features shown in the UI
  async getAiFileSummary() {
    return new Promise(resolve => setTimeout(() => resolve({
      provider: '顺丰速运',
      period: '2023年10月1日 - 10月31日',
      currency: '人民币 (CNY)',
      anomalies: '发现 3 条记录的状态标记为“异常”或“拒收”，建议在关联后优先核对。',
    }), 1000));
  }
  
  async getAiFieldMappings(sourceFields: any[], targetFields: any[]): Promise<FieldMapping[]> {
     return new Promise(resolve => setTimeout(() => {
        const mappings = targetFields.map(tf => {
          // Default to unmapped
          const mapping: FieldMapping = {
            targetFieldId: tf.id,
            sourceFileId: null,
            sourceFieldId: null,
            matchConfidence: 0
          };
  
          // Realistic mapping simulation based on mock data in app.component.ts
          if (tf.id === 'target-1') { // '发票号码'
            mapping.sourceFileId = 'file-1';
            mapping.sourceFieldId = 'file-1-field-1'; // '发票号 (Invoice No)'
            mapping.matchConfidence = 98; // High confidence
          } else if (tf.id === 'target-2') { // '发货日期'
            mapping.sourceFileId = 'file-1';
            mapping.sourceFieldId = 'file-1-field-3'; // '开票日期 (Date)'
            mapping.matchConfidence = 92; // High confidence
          } else if (tf.id === 'target-3') { // '总费用(含税)'
            mapping.sourceFileId = 'file-2';
            mapping.sourceFieldId = 'file-2-field-2'; // 'amount'
            mapping.matchConfidence = 65; // Low confidence, needs review
          }
  
          return mapping;
        });
        resolve(mappings);
    }, 1500));
  }
}