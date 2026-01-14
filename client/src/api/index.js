import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api`
        : '/api',
    timeout: 60000, // 60s
});

// Excel 相关 API
export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/excel/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const getFiles = async () => {
    const response = await api.get('/excel/files');
    return response.data;
};

export const deleteFile = async (fileId) => {
    const response = await api.delete(`/excel/${fileId}`);
    return response.data;
};

export const getFilePreview = async (fileId, options = {}) => {
    const { sheet, limit } = options;
    const response = await api.get(`/excel/preview/${fileId}`, {
        params: { sheet, limit }
    });
    return response.data;
};

export const processData = async (payload) => {
    const response = await api.post('/excel/process', payload);
    return response.data;
};

export const exportResult = async (data, templateName) => {
    const response = await api.post('/excel/export', { data, templateName }, {
        responseType: 'blob'
    });
    return response.data;
};

// AI 相关 API
export const getAiFieldMappings = async (sourceFields, targetFields) => {
    const response = await api.post('/ai/field-mapping', { sourceFields, targetFields });
    return response.data;
};

export const generateCode = async (description, sourceFields) => {
    const response = await api.post('/ai/generate-code', { description, sourceFields });
    return response.data;
};

export const getAiFileSummary = async (fileInfo, sampleData) => {
    const response = await api.post('/ai/file-summary', { fileInfo, sampleData });
    return response.data;
};

// 模板相关 API
export const getTemplates = async () => {
    const response = await api.get('/templates');
    return response.data;
};

export const saveTemplate = async (name, targetFields, fieldMappings) => {
    const response = await api.post('/templates', { name, targetFields, fieldMappings });
    return response.data;
};

export const getTemplate = async (id) => {
    const response = await api.get(`/templates/${id}`);
    return response.data;
};

export const deleteTemplate = async (id) => {
    const response = await api.delete(`/templates/${id}`);
    return response.data;
};

// 解析目标模板文件（AI 提取字段）
export const parseTargetTemplate = async (fileInfo, headers, sampleData) => {
    const response = await api.post('/ai/parse-template', { fileInfo, headers, sampleData });
    return response.data;
};

// 上传并解析目标模板文件（组合调用：先上传获取预览，再 AI 解析）
export const uploadAndParseTargetTemplate = async (file) => {
    // 1. 上传文件获取预览信息
    const formData = new FormData();
    formData.append('file', file);
    const uploadResponse = await api.post('/excel/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    const fileInfo = uploadResponse.data;

    // 2. 获取文件预览（表头和样本数据）
    const previewResponse = await api.get(`/excel/preview/${fileInfo.id}`, {
        params: { limit: 5 }
    });
    const preview = previewResponse.data;

    // 3. 调用 AI 解析表头
    const parseResult = await api.post('/ai/parse-template', {
        fileInfo: {
            name: fileInfo.name,
            size: fileInfo.size
        },
        headers: preview.headers?.map(h => h.label || h.key) || [],
        sampleData: preview.data || []
    });

    // 4. 删除临时上传的文件（可选，避免污染源文件列表）
    try {
        await api.delete(`/excel/${fileInfo.id}`);
    } catch (e) {
        // 忽略删除失败
    }

    return parseResult.data;
};

