const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const { spawn, fork } = require('child_process');
const http = require('http');

let mainWindow;
let serverProcess;
let splashWindow;

const SERVER_PORT = 3001;
const isDev = process.env.NODE_ENV === 'development';

// 检查服务器是否就绪
function waitForServer(url, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const check = () => {
            http.get(url, (res) => {
                resolve(true);
            }).on('error', () => {
                if (Date.now() - startTime > timeout) {
                    reject(new Error('Server start timeout'));
                } else {
                    setTimeout(check, 500);
                }
            });
        };

        check();
    });
}

// 显示启动画面
function showSplashScreen() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true
        }
    });

    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
    splashWindow.center();
}

// 启动后端服务
function startServer() {
    return new Promise((resolve, reject) => {
        const serverDir = isDev
            ? path.join(__dirname, '..', 'server')
            : path.join(process.resourcesPath, 'server');

        const serverScript = path.join(serverDir, 'index.js');

        console.log('Starting server from:', serverScript);

        // 设置环境变量
        const env = {
            ...process.env,
            PORT: SERVER_PORT,
            NODE_ENV: 'production',
            UPLOAD_DIR: path.join(app.getPath('userData'), 'uploads'),
            OUTPUT_DIR: path.join(app.getPath('userData'), 'outputs')
        };

        // 使用 fork 启动服务器（更好的 IPC 通信）
        serverProcess = fork(serverScript, [], {
            cwd: serverDir,
            env,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });

        serverProcess.stdout.on('data', (data) => {
            console.log(`[Server] ${data.toString()}`);
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`[Server Error] ${data.toString()}`);
        });

        serverProcess.on('error', (err) => {
            console.error('Failed to start server:', err);
            reject(err);
        });

        serverProcess.on('exit', (code) => {
            console.log(`Server exited with code ${code}`);
        });

        // 等待服务器就绪
        waitForServer(`http://localhost:${SERVER_PORT}/api/excel/files`)
            .then(resolve)
            .catch(reject);
    });
}

// 创建主窗口
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        show: false,
        backgroundColor: '#111921',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 16, y: 16 }
    });

    // 加载应用
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        // 生产模式：加载后端提供的静态文件
        mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
    }

    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
        if (splashWindow) {
            splashWindow.destroy();
            splashWindow = null;
        }
        mainWindow.show();
    });

    // 外部链接在浏览器中打开
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 应用启动
app.whenReady().then(async () => {
    // 显示启动画面
    showSplashScreen();

    try {
        // 启动后端服务
        console.log('Starting backend server...');
        await startServer();
        console.log('Server started successfully!');

        // 创建主窗口
        createWindow();
    } catch (error) {
        console.error('Failed to start application:', error);

        if (splashWindow) {
            splashWindow.destroy();
        }

        dialog.showErrorBox(
            '启动失败',
            `无法启动应用服务。\n\n错误详情：${error.message}\n\n请确保 GEMINI_API_KEY 已正确配置。`
        );

        app.quit();
    }
});

// macOS 点击 Dock 图标重新打开窗口
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// 关闭所有窗口时退出（Windows & Linux）
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 应用退出前清理
app.on('before-quit', () => {
    if (serverProcess) {
        console.log('Stopping server...');
        serverProcess.kill('SIGTERM');
    }
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
