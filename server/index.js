import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

import excelRoutes from './routes/excel.js';
import aiRoutes from './routes/ai.js';
import templateRoutes from './routes/templates.js';

// 加载环境变量 (从 server 目录下的 .env 文件或父目录下的 .env.local)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });
dotenv.config({ path: join(__dirname, '..', '.env.local') });

console.log('GEMINI_API_KEY 已配置:', !!process.env.GEMINI_API_KEY);

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API 路由
app.use('/api/excel', excelRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/templates', templateRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 生产环境：提供前端静态文件
const publicPath = join(__dirname, 'public');
if (existsSync(publicPath)) {
  console.log('Serving static files from:', publicPath);
  app.use(express.static(publicPath));

  // SPA 路由：所有非 API 路由返回 index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(publicPath, 'index.html'));
    }
  });
}

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

