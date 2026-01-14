import { Router } from 'express';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_FILE = join(__dirname, '..', 'data', 'templates.json');

// 确保数据目录存在
async function ensureDataDir() {
    const dataDir = dirname(TEMPLATES_FILE);
    if (!existsSync(dataDir)) {
        await mkdir(dataDir, { recursive: true });
    }
}

// 读取模板列表
async function readTemplates() {
    try {
        await ensureDataDir();
        if (!existsSync(TEMPLATES_FILE)) {
            return [];
        }
        const data = await readFile(TEMPLATES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取模板文件失败:', error);
        return [];
    }
}

// 保存模板列表
async function saveTemplates(templates) {
    await ensureDataDir();
    await writeFile(TEMPLATES_FILE, JSON.stringify(templates, null, 2), 'utf-8');
}

/**
 * 获取所有模板
 * GET /api/templates
 */
router.get('/', async (req, res) => {
    try {
        const templates = await readTemplates();
        res.json(templates);
    } catch (error) {
        console.error('获取模板列表失败:', error);
        res.status(500).json({ error: '获取模板列表失败' });
    }
});

/**
 * 创建新模板
 * POST /api/templates
 */
router.post('/', async (req, res) => {
    try {
        const { name, targetFields, fieldMappings } = req.body;

        if (!name) {
            return res.status(400).json({ error: '模板名称不能为空' });
        }

        const templates = await readTemplates();

        // 检查是否已存在同名模板
        const existingIndex = templates.findIndex(t => t.name === name);

        const template = {
            id: existingIndex >= 0 ? templates[existingIndex].id : `template-${Date.now()}`,
            name,
            targetFields,
            fieldMappings,
            createdAt: existingIndex >= 0 ? templates[existingIndex].createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            // 更新已有模板
            templates[existingIndex] = template;
            console.log('更新模板:', name);
        } else {
            // 添加新模板
            templates.push(template);
            console.log('创建新模板:', name);
        }

        await saveTemplates(templates);
        res.json(template);
    } catch (error) {
        console.error('保存模板失败:', error);
        res.status(500).json({ error: '保存模板失败' });
    }
});

/**
 * 获取单个模板
 * GET /api/templates/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const templates = await readTemplates();
        const template = templates.find(t => t.id === req.params.id);

        if (!template) {
            return res.status(404).json({ error: '模板不存在' });
        }

        res.json(template);
    } catch (error) {
        console.error('获取模板失败:', error);
        res.status(500).json({ error: '获取模板失败' });
    }
});

/**
 * 删除模板
 * DELETE /api/templates/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const templates = await readTemplates();
        const index = templates.findIndex(t => t.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ error: '模板不存在' });
        }

        templates.splice(index, 1);
        await saveTemplates(templates);

        res.json({ success: true });
    } catch (error) {
        console.error('删除模板失败:', error);
        res.status(500).json({ error: '删除模板失败' });
    }
});

export default router;
