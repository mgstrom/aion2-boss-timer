const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

// 存储当前的置顶状态
let isAlwaysOnTop = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        minWidth: 700,
        minHeight: 500,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            // 后台运行配置
            backgroundThrottling: false
        },
        frame: true,
        title: '永恒之塔2 BOSS刷新倒计时',
        show: true,
        alwaysOnTop: isAlwaysOnTop
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

// 确保应用能够正常退出
app.on('before-quit', function () {
    // 清理所有可能阻止应用退出的资源
    if (mainWindow) {
        mainWindow = null;
    }
});

ipcMain.on('minimize', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

ipcMain.on('maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.restore();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('close', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

ipcMain.on('toggleAlwaysOnTop', (event, newAlwaysOnTop) => {
    // 更新全局置顶状态
    isAlwaysOnTop = newAlwaysOnTop;
    if (mainWindow) {
        mainWindow.setAlwaysOnTop(newAlwaysOnTop);
        event.reply('alwaysOnTopToggled', newAlwaysOnTop);
    }
});
