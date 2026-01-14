import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { parseExcelFile, getPreviewData, exportToExcel } from '../services/excelService.js';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, '..', 'uploads');

// 确保上传目录存在
if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
}

// 存储已上传文件的信息
const fileStore = new Map();

// 配置 multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const fileId = uuidv4();
        const ext = extname(file.originalname);
        cb(null, `${fileId}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
        const allowedExts = ['.xlsx', '.xls', '.csv'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('不支持的文件格式，仅支持 .xlsx, .xls, .csv'));
        }
    }
});

/**
 * 上传并解析 Excel 文件
 * POST /api/excel/upload
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '请上传文件' });
        }

        const { filename, originalname, path: filePath, size } = req.file;
        const fileId = filename.replace(extname(filename), '');

        // 修复中文文件名乱码：multer 默认以 Latin1 解析，需要转换为 UTF-8
        const decodedName = Buffer.from(originalname, 'latin1').toString('utf8');

        // 解析文件
        const { sheets, totalRowCount } = await parseExcelFile(filePath, decodedName);

        // 格式化文件大小
        const formattedSize = size > 1024 * 1024
            ? `${(size / 1024 / 1024).toFixed(1)}MB`
            : `${(size / 1024).toFixed(0)}KB`;

        const fileInfo = {
            id: fileId,
            name: decodedName,
            size: formattedSize,
            sizeBytes: size,
            status: 'success',
            rowCount: totalRowCount,
            uploadTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            sheets,
            filePath
        };

        // 存储文件信息
        fileStore.set(fileId, fileInfo);

        // 返回时不包含 filePath
        const { filePath: _, ...publicInfo } = fileInfo;
        res.json(publicInfo);
    } catch (error) {
        console.error('文件解析失败:', error);
        res.status(500).json({ error: `文件解析失败: ${error.message}` });
    }
});

/**
 * 获取已上传的文件列表
 * GET /api/excel/files
 */
router.get('/files', (req, res) => {
    const files = Array.from(fileStore.values()).map(({ filePath, ...rest }) => rest);
    res.json(files);
});

/**
 * 获取文件预览数据
 * GET /api/excel/preview/:fileId
 */
router.get('/preview/:fileId', async (req, res, next) => {
    try {
        const { fileId } = req.params;
        const { sheet, limit = 30 } = req.query;

        const fileInfo = fileStore.get(fileId);
        if (!fileInfo) {
            return res.status(404).json({ error: '文件不存在' });
        }

        const previewData = await getPreviewData(
            fileInfo.filePath,
            fileInfo.name,
            sheet || null,
            parseInt(limit)
        );

        res.json(previewData);
    } catch (error) {
        next(error);
    }
});

/**
 * 删除已上传的文件
 * DELETE /api/excel/:fileId
 */
router.delete('/:fileId', (req, res) => {
    const { fileId } = req.params;
    const fileInfo = fileStore.get(fileId);

    if (!fileInfo) {
        return res.status(404).json({ error: '文件不存在' });
    }

    try {
        if (existsSync(fileInfo.filePath)) {
            unlinkSync(fileInfo.filePath);
        }
        fileStore.delete(fileId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '删除文件失败' });
    }
});

/**
 * 导出处理后的 Excel
 * POST /api/excel/export
 */
router.post('/export', async (req, res, next) => {
    try {
        const { data, templateName = '处理结果' } = req.body;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ error: '导出数据不能为空' });
        }

        const workbook = await exportToExcel(data, templateName);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(templateName)}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
});
/**
 * 处理数据并导出
 * POST /api/excel/process
 */
router.post('/process', async (req, res, next) => {
    try {
        const { fileIds, mappings, targetFields } = req.body;

        console.log('=== 开始数据处理 ===');
        console.log('文件数量:', fileIds?.length);
        console.log('映射数量:', mappings?.length);

        // 获取所有文件数据
        const allData = [];
        for (const fileId of fileIds) {
            const fileInfo = fileStore.get(fileId);
            if (!fileInfo) {
                console.log('文件未找到:', fileId);
                continue;
            }

            const preview = await getPreviewData(fileInfo.filePath, fileInfo.name, null, 10000);
            console.log(`文件 ${fileInfo.name} 加载了 ${preview.data.length} 行数据`);

            // 构建字段名到 col_N 的映射，以及 col_N 到字段名的反向映射
            const fieldNameToCol = {};
            const colToFieldName = {};
            preview.headers.forEach(h => {
                fieldNameToCol[h.label] = h.key;
                colToFieldName[h.key] = h.label;
            });

            // 为每一行构建字段名直接访问的对象
            preview.data.forEach(row => {
                // 创建一个可以通过字段名直接访问的行对象
                const namedRow = {};
                preview.headers.forEach(h => {
                    namedRow[h.label] = row[h.key];
                });
                row._namedRow = namedRow;
                row._fieldNameToCol = fieldNameToCol;
            });

            allData.push(...preview.data);
        }

        if (allData.length === 0) {
            return res.json({ success: true, count: 0, data: [] });
        }

        // 构建目标字段信息查找表
        const targetFieldMap = {};
        if (targetFields) {
            targetFields.forEach(tf => {
                targetFieldMap[tf.id] = tf;
            });
        }

        // 预编译加工规则函数
        const processingFunctions = {};
        for (const mapping of mappings) {
            if (mapping.generatedCode) {
                try {
                    // 使用 Function 构造函数创建可执行函数
                    // 函数接收 row 参数（包含所有源字段值的对象）
                    processingFunctions[mapping.targetFieldId] = new Function('row', mapping.generatedCode);
                    console.log(`已编译加工规则: ${mapping.targetFieldId}`);
                } catch (err) {
                    console.error(`编译加工规则失败 (${mapping.targetFieldId}):`, err.message);
                    processingFunctions[mapping.targetFieldId] = null;
                }
            }
        }

        // 应用字段映射和加工规则
        const processedData = allData.map((row, index) => {
            const result = { '序号': index + 1 };
            const namedRow = row._namedRow || {};

            for (const mapping of mappings) {
                // 获取目标字段名称
                const targetField = targetFieldMap[mapping.targetFieldId];
                const targetFieldName = targetField?.name || mapping.targetFieldId;

                let value = '';

                // 检查是否有加工规则函数
                const processingFn = processingFunctions[mapping.targetFieldId];
                if (processingFn) {
                    try {
                        // 执行加工规则
                        value = processingFn(namedRow);
                        if (value === undefined || value === null) {
                            value = '';
                        }
                    } catch (err) {
                        console.error(`执行加工规则失败 (行 ${index + 1}, ${targetFieldName}):`, err.message);
                        value = `[错误: ${err.message}]`;
                    }
                } else if (mapping.sourceFieldId && mapping.sourceFieldName) {
                    // 没有加工规则，直接映射源字段
                    // 1. 尝试直接精确匹配
                    let val = namedRow[mapping.sourceFieldName];

                    // 2. 如果没找到，尝试去除空格后的容错匹配
                    if (val === undefined) {
                        // 构建一个临时的归一化映射（在循环外构建性能更好，但这里为了最小改动先这样做，或者在上面构建）
                        // 优化：我们应该在循环外构建 normalizedMap
                        const normalizedSource = mapping.sourceFieldName ? String(mapping.sourceFieldName).trim() : '';

                        // 查找 namedRow 中是否有 key 的 trim 版本匹配
                        const matchedKey = Object.keys(namedRow).find(
                            k => String(k).trim() === normalizedSource
                        );

                        if (matchedKey) {
                            val = namedRow[matchedKey];
                        }
                    }

                    value = val ?? '';
                }

                result[targetFieldName] = value;
            }

            return result;
        });

        console.log('处理完成，共', processedData.length, '条数据');

        res.json({
            success: true,
            count: processedData.length,
            data: processedData.slice(0, 100) // 返回前 100 条预览
        });
    } catch (error) {
        console.error('数据处理失败:', error);
        res.status(500).json({ error: `处理失败: ${error.message}` });
    }
});

export default router;
