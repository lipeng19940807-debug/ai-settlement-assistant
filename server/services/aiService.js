import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

function getGenAI() {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY 环境变量未设置');
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

/**
 * AI 智能字段映射
 */
export async function getAiFieldMappings(sourceFields, targetFields) {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `你是一个数据字段映射专家。请分析以下源字段和目标字段，为每个目标字段推荐最匹配的源字段。

源字段列表：
${JSON.stringify(sourceFields, null, 2)}

目标字段列表：
${JSON.stringify(targetFields, null, 2)}

请返回 JSON 格式的映射结果，格式如下：
{
  "mappings": [
    {
      "targetFieldId": "目标字段ID",
      "sourceFieldId": "匹配的源字段ID或null",
      "matchConfidence": 0-100的匹配度
    }
  ]
}

仅返回 JSON，不要包含其他内容。`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // 提取 JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('无法解析 AI 返回结果');
    } catch (error) {
        console.error('AI 字段映射失败:', error);
        // 返回基于名称相似度的简单映射作为降级方案
        return fallbackFieldMapping(sourceFields, targetFields);
    }
}

/**
 * AI 生成数据处理 JavaScript 代码
 */
export async function generateProcessingCode(description, sourceFields) {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const sourceFieldExamples = sourceFields
        .map(f => `// row['${f.name}'] (示例值: '${f.sample || ''}')`)
        .join('\n    ');

    const prompt = `你是一个 JavaScript 数据处理专家。请根据用户需求生成数据转换函数体。

可用的源字段及示例值：
    ${sourceFieldExamples}

用户需求: "${description}"

要求：
1. 只返回函数体代码，不要 function 声明
2. 参数 row 是一个对象，包含源数据的一行，通过 row['字段名'] 获取值
3. 代码必须返回一个处理后的值（使用 return 语句）: 常为 String，也可以是 Number/Date 等
4. 使用简洁的代码，处理可能的 null/undefined 值
5. 不要使用外部库，只用原生 JavaScript
6. 只返回代码，不要 markdown 代码块标记
7. 如果需要处理日期，使用 new Date() 相关方法
8. 如果需要四则运算，确保转换为数字类型

示例输出（仅函数体）：
const value = row['金额'] || 0;
return parseFloat(value) * 1.13;`;

    try {
        const result = await model.generateContent(prompt);
        let code = result.response.text().trim();

        // 清理代码块标记
        if (code.startsWith('```javascript') || code.startsWith('```js')) {
            code = code.replace(/^```(?:javascript|js)\n?/, '');
        } else if (code.startsWith('```')) {
            code = code.slice(3);
        }
        if (code.endsWith('```')) {
            code = code.slice(0, -3);
        }

        return code.trim();
    } catch (error) {
        console.error('代码生成失败:', error);
        throw error;
    }
}

// 保留原函数名的兼容性导出
export const generatePythonCode = generateProcessingCode;

/**
 * AI 生成文件摘要
 */
export async function getAiFileSummary(fileInfo, sampleData) {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `分析以下 Excel 文件数据，生成结构化摘要。

文件信息：
${JSON.stringify(fileInfo, null, 2)}

数据样本（前 5 行）：
${JSON.stringify(sampleData, null, 2)}

请返回 JSON 格式：
{
  "provider": "推断的供应商/数据来源",
  "period": "推断的数据时间范围",
  "currency": "货币类型",
  "anomalies": "发现的异常或需要注意的点"
}

仅返回 JSON。`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('无法解析摘要结果');
    } catch (error) {
        console.error('文件摘要生成失败:', error);
        return {
            provider: '未知',
            period: '未知',
            currency: '未知',
            anomalies: '无法自动分析，请手动检查'
        };
    }
}

// 降级方案：基于名称相似度的简单映射
function fallbackFieldMapping(sourceFields, targetFields) {
    const mappings = targetFields.map(target => {
        let bestMatch = null;
        let bestScore = 0;

        for (const source of sourceFields) {
            const score = calculateSimilarity(
                target.name.toLowerCase(),
                source.name.toLowerCase()
            );
            if (score > bestScore) {
                bestScore = score;
                bestMatch = source;
            }
        }

        return {
            targetFieldId: target.id,
            sourceFieldId: bestScore > 0.3 ? bestMatch?.id : null,
            matchConfidence: Math.round(bestScore * 100)
        };
    });

    return { mappings };
}

function calculateSimilarity(str1, str2) {
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = [...set1].filter(x => set2.has(x)).length;
    const union = new Set([...set1, ...set2]).size;
    return union > 0 ? intersection / union : 0;
}

/**
 * AI 解析目标模板文件，提取字段定义
 * @param {Object} fileInfo - 文件信息（名称、Sheet等）
 * @param {Array} headers - 表头字段列表
 * @param {Array} sampleData - 样本数据
 * @returns {Promise<Array>} 解析出的目标字段列表
 */
export async function parseTargetTemplateFields(fileInfo, headers, sampleData) {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `你是一个数据分析专家。请分析以下 Excel 模板文件的表头和样本数据，提取出目标字段定义。

文件名：${fileInfo.name}

表头列表：
${JSON.stringify(headers, null, 2)}

样本数据（前3行）：
${JSON.stringify(sampleData?.slice(0, 3), null, 2)}

请分析每个表头字段，推断其：
1. 字段名称（使用中文）
2. 数据类型（String/Number/Date/Currency 四选一）
3. 字段描述（简短说明该字段的用途）
4. 合适的图标（从以下选项中选择：tag, numbers, calendar_today, payments, text_fields, person, location_on, receipt_long, scale, local_shipping）

请返回 JSON 格式：
{
  "fields": [
    {
      "name": "字段名称",
      "type": "数据类型",
      "description": "字段描述",
      "icon": "图标名称"
    }
  ],
  "templateName": "推荐的模板名称（基于文件名或内容推断）"
}

仅返回 JSON，不要包含其他内容。`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            // 为每个字段添加唯一 ID
            const fields = (parsed.fields || []).map((f, idx) => ({
                id: `target-${Date.now()}-${idx}`,
                name: f.name || '',
                type: f.type || 'String',
                description: f.description || '',
                icon: f.icon || 'text_fields'
            }));
            return {
                fields,
                templateName: parsed.templateName || fileInfo.name?.replace(/\.[^/.]+$/, '') || '新模板'
            };
        }
        throw new Error('无法解析 AI 返回结果');
    } catch (error) {
        console.error('解析目标模板失败:', error);
        // 降级方案：直接使用表头作为字段
        const fields = headers.map((h, idx) => ({
            id: `target-${Date.now()}-${idx}`,
            name: typeof h === 'string' ? h : (h.label || h.key || ''),
            type: 'String',
            description: '',
            icon: 'text_fields'
        }));
        return {
            fields,
            templateName: fileInfo.name?.replace(/\.[^/.]+$/, '') || '新模板'
        };
    }
}

