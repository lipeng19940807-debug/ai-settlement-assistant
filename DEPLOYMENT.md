# 智运结算 AI - 部署指南

本文档提供多种部署方案，您可以根据需求选择最适合的方式。

---

## 目录

1. [方案一：Vercel + Railway 云端部署（推荐用于公网访问）](#方案一vercel--railway-云端部署)
2. [方案二：Docker 一键部署](#方案二docker-一键部署)
3. [方案三：Electron 桌面客户端（本地运行）](#方案三electron-桌面客户端)
4. [方案四：传统服务器部署](#方案四传统服务器部署)

---

## 准备工作

### 1. 必需的账号和密钥

| 项目 | 说明 | 获取方式 |
|------|------|----------|
| **Gemini API Key** | AI 功能核心依赖 | [Google AI Studio](https://aistudio.google.com/apikey) 免费申请 |
| **GitHub 账号** | 代码托管 & 自动部署 | [github.com](https://github.com) |

### 2. 上传代码到 GitHub

```bash
# 初始化 Git（如果还没有）
cd /Users/lipeng1/Desktop/智变excel/ai-settlement-assistant
git init
git add .
git commit -m "Initial commit"

# 创建 GitHub 仓库后推送
git remote add origin https://github.com/YOUR_USERNAME/ai-settlement-assistant.git
git branch -M main
git push -u origin main
```

---

## 方案一：Vercel + Railway 云端部署

### 架构说明

```
用户浏览器 → Vercel (前端) → Railway (后端 API) → Gemini API
```

- **前端**：部署到 Vercel（免费）
- **后端**：部署到 Railway（免费额度 5$/月）

### 步骤 1：部署后端到 Railway

1. 访问 [Railway.app](https://railway.app/) 并用 GitHub 登录
2. 点击 「New Project」→「Deploy from GitHub repo」
3. 选择你的仓库
4. 配置部署设置：
   - **Root Directory**: `server`
   - **Start Command**: `npm start`
5. 添加环境变量：
   - `GEMINI_API_KEY`: 你的 Gemini API Key
   - `PORT`: 3001
6. 部署完成后，获取后端 URL，例如：`https://ai-settlement-api.railway.app`

### 步骤 2：更新前端配置

修改 `client/vite.config.js`：

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  // 生产环境 API 地址
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.NODE_ENV === 'production' 
        ? 'https://你的railway域名.railway.app' 
        : ''
    )
  }
})
```

修改 `client/src/api/index.js`：

```javascript
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api` 
        : '/api',
    timeout: 60000,
});

// ... 其余代码不变
```

### 步骤 3：部署前端到 Vercel

1. 访问 [Vercel.com](https://vercel.com/) 并用 GitHub 登录
2. 点击「Add New...」→「Project」
3. 导入你的 GitHub 仓库
4. 配置部署设置：
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 添加环境变量：
   - `VITE_API_URL`: 你的 Railway 后端 URL
6. 点击 Deploy

### 完成！

你的应用现在可以通过 Vercel 提供的域名访问了，例如：
`https://ai-settlement-assistant.vercel.app`

---

## 方案二：Docker 一键部署

### 优点
- 一键启动，无需复杂配置
- 适合自有服务器或本地运行
- 环境隔离，稳定可靠

### 步骤 1：创建 Dockerfile

在项目根目录创建 `Dockerfile`：

```dockerfile
# 多阶段构建

# 阶段1：构建前端
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# 阶段2：运行时
FROM node:20-alpine
WORKDIR /app

# 复制后端代码
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

COPY server/ ./server/

# 复制前端构建产物
COPY --from=frontend-builder /app/client/dist ./server/public

# 设置工作目录
WORKDIR /app/server

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["node", "index.js"]
```

### 步骤 2：创建 docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - NODE_ENV=production
    volumes:
      - ./data/uploads:/app/server/uploads
      - ./data/outputs:/app/server/outputs
    restart: unless-stopped
```

### 步骤 3：修改后端以支持静态文件

修改 `server/index.js`，添加静态文件服务：

```javascript
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ... 其他中间件和路由

// 生产环境：提供前端静态文件
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'public')));
    
    // 所有非 API 路由返回 index.html
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        }
    });
}
```

### 步骤 4：运行

```bash
# 创建 .env 文件
echo "GEMINI_API_KEY=your_api_key_here" > .env

# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f
```

访问 http://localhost:3001 即可使用。

---

## 方案三：Electron 桌面客户端

### 优点
- 无需服务器，完全本地运行
- 可打包为 macOS/Windows/Linux 应用
- 用户只需下载安装即可使用

### 步骤 1：安装 Electron 依赖

```bash
cd /Users/lipeng1/Desktop/智变excel/ai-settlement-assistant
npm install --save-dev electron electron-builder concurrently wait-on
```

### 步骤 2：创建 Electron 入口文件

创建 `electron/main.js`：

```javascript
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// 启动后端服务
function startServer() {
    const serverPath = path.join(__dirname, '..', 'server');
    serverProcess = spawn('node', ['index.js'], {
        cwd: serverPath,
        env: { 
            ...process.env,
            PORT: 3001
        }
    });
    
    serverProcess.stdout.on('data', (data) => {
        console.log(`Server: ${data}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
        console.error(`Server Error: ${data}`);
    });
}

// 创建窗口
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 16, y: 16 }
    });

    // 开发模式加载 Vite 开发服务器
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        // 生产模式加载打包后的文件
        mainWindow.loadURL('http://localhost:3001');
    }

    // 外部链接在浏览器中打开
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

app.whenReady().then(() => {
    startServer();
    
    // 等待服务器启动
    setTimeout(createWindow, 2000);
});

app.on('window-all-closed', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
```

### 步骤 3：更新 package.json

在根目录的 `package.json` 添加：

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "concurrently \"npm run server\" \"npm run client\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build:all && electron-builder",
    "build:all": "cd client && npm run build && cd ../server && npm run build"
  },
  "build": {
    "appId": "com.settlement.ai",
    "productName": "智运结算 AI",
    "directories": {
      "output": "release"
    },
    "files": [
      "electron/**/*",
      "server/**/*",
      "client/dist/**/*",
      "!**/node_modules/.cache",
      "!**/*.map"
    ],
    "mac": {
      "target": ["dmg", "zip"],
      "icon": "assets/icon.icns"
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/icon.ico"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "assets/icon.png"
    }
  }
}
```

### 步骤 4：运行和打包

```bash
# 开发模式运行
npm run electron:dev

# 打包为桌面应用
npm run electron:build
```

打包完成后，在 `release` 目录下可以找到：
- macOS: `.dmg` 安装包
- Windows: `.exe` 安装程序
- Linux: `.AppImage` 或 `.deb`

---

## 方案四：传统服务器部署

### 适用场景
- 自有 Linux 服务器（阿里云、腾讯云等）
- 需要完全控制的企业内网部署

### 步骤 1：服务器准备

```bash
# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2（进程管理器）
sudo npm install -g pm2

# 安装 Nginx（反向代理）
sudo apt-get install -y nginx
```

### 步骤 2：部署代码

```bash
# 克隆代码
cd /var/www
git clone https://github.com/YOUR_USERNAME/ai-settlement-assistant.git
cd ai-settlement-assistant

# 安装依赖
npm run install:all

# 构建前端
cd client && npm run build
```

### 步骤 3：配置 PM2

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'ai-settlement-api',
    cwd: './server',
    script: 'index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      GEMINI_API_KEY: 'your_api_key_here'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

启动：

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 步骤 4：配置 Nginx

创建 `/etc/nginx/sites-available/ai-settlement`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    root /var/www/ai-settlement-assistant/client/dist;
    index index.html;

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 100M;
    }

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/ai-settlement /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 步骤 5：配置 HTTPS（推荐）

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 方案对比

| 方案 | 成本 | 难度 | 适用场景 |
|------|------|------|----------|
| Vercel + Railway | 免费/低成本 | ⭐⭐ | 快速上线，公网访问 |
| Docker | 服务器费用 | ⭐⭐⭐ | 自有服务器，一键部署 |
| Electron | 无 | ⭐⭐⭐⭐ | 本地使用，离线场景 |
| 传统部署 | 服务器费用 | ⭐⭐⭐⭐ | 企业生产环境 |

---

## 常见问题

### Q: GEMINI_API_KEY 如何保护？
A: 
- 永远不要将 API Key 提交到 Git
- 使用环境变量配置
- 生产环境使用 Secret Manager

### Q: 上传的文件存储在哪里？
A: 默认存储在 `server/uploads` 目录。建议：
- Docker：使用 volume 持久化
- 云端：使用 S3/OSS 等对象存储

### Q: 如何限制访问？
A: 可以添加：
- 基础认证（HTTP Basic Auth）
- JWT Token 认证
- IP 白名单

---

## 更新日志

| 日期 | 内容 |
|------|------|
| 2026-01-14 | 初始版本 |
