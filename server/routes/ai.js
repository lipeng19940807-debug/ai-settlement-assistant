import { Router } from 'express';
import { getAiFieldMappings, generatePythonCode, getAiFileSummary, parseTargetTemplateFields } from '../services/aiService.js';

const router = Router();

/**
 * AI 智能字段映射
 * POST /api/ai/field-mapping
 */
router.post('/field-mapping', async (req, res, next) => {
    try {
        const { sourceFields, targetFields } = req.body;

        console.log('=== AI 字段映射请求 ===');
        console.log('源字段数量:', sourceFields?.length || 0);
        console.log('目标字段数量:', targetFields?.length || 0);

        if (!sourceFields || !targetFields) {
            return res.status(400).json({ error: '缺少源字段或目标字段信息' });
        }

        console.log('开始调用 Gemini API...');
        const result = await getAiFieldMappings(sourceFields, targetFields);
        console.log('AI 映射结果:', JSON.stringify(result, null, 2));

        res.json(result);
    } catch (error) {
        console.error('AI 字段映射失败:', error);
        res.status(500).json({ error: `AI 映射失败: ${error.message}` });
    }
});

/**
 * 生成数据处理代码
 * POST /api/ai/generate-code
 */
router.post('/generate-code', async (req, res, next) => {
    try {
        const { description, sourceFields } = req.body;

        if (!description) {
            return res.status(400).json({ error: '请提供处理规则描述' });
        }

        const code = await generatePythonCode(description, sourceFields || []);
        res.json({ code });
    } catch (error) {
        next(error);
    }
});

/**
 * AI 文件摘要
 * POST /api/ai/file-summary
 */
router.post('/file-summary', async (req, res, next) => {
    try {
        const { fileInfo, sampleData } = req.body;

        if (!fileInfo) {
            return res.status(400).json({ error: '缺少文件信息' });
        }

        const summary = await getAiFileSummary(fileInfo, sampleData || []);
        res.json(summary);
    } catch (error) {
        next(error);
    }
});

/**
 * AI 解析目标模板字段
 * POST /api/ai/parse-template
 */
router.post('/parse-template', async (req, res, next) => {
    try {
        const { fileInfo, headers, sampleData } = req.body;

        console.log('=== AI 解析目标模板请求 ===');
        console.log('文件名:', fileInfo?.name);
        console.log('表头数量:', headers?.length || 0);

        if (!fileInfo || !headers) {
            return res.status(400).json({ error: '缺少文件信息或表头数据' });
        }

        const result = await parseTargetTemplateFields(fileInfo, headers, sampleData || []);
        console.log('解析结果:', JSON.stringify(result, null, 2));

        res.json(result);
    } catch (error) {
        console.error('解析目标模板失败:', error);
        res.status(500).json({ error: `解析失败: ${error.message}` });
    }
});

export default router;

