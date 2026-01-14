# 智运结算 AI

<div align="center">

![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)

**基于 AI 的智能对账工具，自动识别和映射供应商账单字段**

[功能特性](#功能特性) • [快速开始](#快速开始) • [下载安装](#下载安装) • [开发指南](#开发指南) • [部署文档](./DEPLOYMENT.md)

</div>

---

## 功能特性

### 🚀 核心功能

| 功能 | 描述 |
|------|------|
| **智能字段映射** | AI 自动识别源文件字段，匹配目标模板 |
| **增量映射** | 修改目标字段后，仅对新增字段进行 AI 匹配 |
| **自然语言规则** | 用中文描述数据处理需求，AI 生成代码 |
| **模板管理** | 保存和复用字段映射配置 |
| **批量处理** | 一键处理多个文件，导出标准格式 |

### ✨ v1.3 新特性

- 🖥️ **桌面客户端**：打包成 macOS/Windows 应用，无需服务器
- 📤 **上传模板解析**：上传现有模板，AI 自动提取目标字段
- 🔍 **增强版文件预览**：AI 智能解读文件内容、识别供应商、推断账单周期

---

## 快速开始

### 环境要求

- Node.js 20+
- Gemini API Key ([免费申请](https://aistudio.google.com/apikey))

### 本地运行

```bash
# 1. 克隆项目
git clone https://github.com/YOUR_USERNAME/ai-settlement-assistant.git
cd ai-settlement-assistant

# 2. 安装依赖
npm run install:all

# 3. 配置 API Key
echo "GEMINI_API_KEY=你的API密钥" > .env.local

# 4. 启动开发服务
npm start
```

访问 http://localhost:5173 即可使用。

---

## 下载安装

### macOS

1. 从 [Releases](../../releases) 下载最新的 `.dmg` 文件
2. 双击打开，拖动到 Applications 文件夹
3. 首次运行：右键点击应用 → 打开（因未签名需要确认）

### Windows

1. 从 [Releases](../../releases) 下载最新的 `.exe` 安装程序
2. 双击运行，按提示完成安装
3. 从开始菜单或桌面快捷方式启动

### 配置 API Key

桌面应用启动后，需要配置 Gemini API Key：

1. 在应用安装目录找到 `server/.env` 文件
2. 添加：`GEMINI_API_KEY=你的API密钥`
3. 重启应用

---

## 开发指南

### 项目结构

```
ai-settlement-assistant/
├── client/              # 前端（Vite + React）
│   ├── src/
│   │   ├── components/  # React 组件
│   │   ├── api/         # API 调用
│   │   └── App.jsx      # 主应用
│   └── package.json
├── server/              # 后端（Express + Node.js）
│   ├── routes/          # API 路由
│   ├── services/        # 业务逻辑（AI 服务等）
│   └── package.json
├── electron/            # Electron 主进程
│   ├── main.js
│   └── splash.html
├── .github/workflows/   # CI/CD 配置
├── package.json         # 根配置
├── PRD.md               # 产品需求文档
└── DEPLOYMENT.md        # 部署指南
```

### 常用命令

```bash
# 开发模式
npm start                   # 启动前后端开发服务

# 构建
npm run build:all           # 构建前端并复制到 server/public

# Electron
npm run electron:dev        # Electron 开发模式
npm run electron:build:mac  # 构建 macOS 安装包
npm run electron:build:win  # 构建 Windows 安装包
```

### 发布新版本

```bash
# 1. 更新 package.json 版本号
npm version patch  # 或 minor / major

# 2. 推送 tag
git push origin --tags

# 3. GitHub Actions 自动构建并发布
```

---

## 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | React, Vite, Tailwind CSS |
| 后端 | Node.js, Express |
| AI | Google Gemini API |
| 桌面 | Electron |
| 构建 | electron-builder |
| CI/CD | GitHub Actions |

---

## 贡献指南

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/xxx`
3. 提交更改：`git commit -m 'Add xxx'`
4. 推送分支：`git push origin feature/xxx`
5. 创建 Pull Request

---

## 许可证

MIT License - 查看 [LICENSE](./LICENSE) 了解详情

---

<div align="center">
Made with ❤️ by Settlement AI Team
</div>
