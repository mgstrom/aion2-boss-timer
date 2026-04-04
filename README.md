# 永恒之塔2 BOSS刷新倒计时

一个用于永恒之塔2游戏的BOSS刷新倒计时工具，支持小游戏闹钟提醒。

## 功能特性

- ✅ BOSS刷新倒计时（15个BOSS）
- ✅ 小游戏闹钟提醒（每小时第10分钟）
- ✅ 提前声音提醒
- ✅ 编辑BOSS时间
- ✅ 响应式设计
- ✅ 数据持久化

## BOSS列表

### 2小时：
- 學者拉兀拉
- 追擊者塔兀羅

### 3小时：
- 叛教者雷拉
- 收穫管理者莫夏夫

### 4小时：
- 森林戰士烏剌姆
- 黑色觸手拉瓦
- 百夫長戴米羅斯
- 監視兵器克納許

### 6小时：
- 神聖的安薩斯
- 研究官塞特蘭
- 幻夢卡西亞
- 沉默塔爾坦
- 靈魂支配者卡沙帕

### 12小时：
- 軍團長拉格塔
- 永恆卡爾吐亞

## 使用方法

### 方法一：直接使用网页版
1. 下载项目文件
2. 双击 `index.html` 文件即可使用
3. 所有功能完整，无需安装

### 方法二：GitHub Actions自动打包EXE

#### 1. 上传代码到GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

#### 2. 触发构建
- 每次推送到 `main` 或 `master` 分支时，GitHub Actions会自动构建EXE文件
- 也可以手动触发：进入GitHub仓库 -> Actions -> Build EXE -> Run workflow

#### 3. 下载EXE文件
- 构建完成后，在Actions页面的Artifacts中可以下载EXE文件
- 或者在Release页面下载（如果创建了tag）

#### 4. 创建Release（可选）
```bash
git tag v1.0.0
git push origin v1.0.0
```
推送tag后，GitHub Actions会自动创建Release并上传EXE文件。

### 方法三：本地构建

#### 前提条件
- 安装 [Node.js](https://nodejs.org/) (推荐 LTS 版本)

#### 构建步骤
```bash
# 安装依赖
npm install

# 构建EXE
npm run build
```

构建完成后，EXE文件位于 `dist` 文件夹中：
- `永恒之塔2 BOSS刷新倒计时.exe` - 便携版（无需安装）
- `永恒之塔2 BOSS刷新倒计时 Setup.exe` - 安装版

## 文件说明

- `index.html` - 主页面
- `style.css` - 样式文件
- `script.js` - 逻辑文件
- `main.js` - Electron主进程
- `preload.js` - Electron预加载脚本
- `package.json` - 项目配置
- `.github/workflows/build.yml` - GitHub Actions工作流

## 技术栈

- HTML5/CSS3/JavaScript
- Electron.js - 桌面应用框架
- electron-builder - 打包工具
- GitHub Actions - CI/CD

## 数据存储

所有数据保存在浏览器的 localStorage 中，刷新页面后数据不会丢失。

## 常见问题

### 问题：没有声音提醒
**解决方案**：
1. 确保浏览器允许通知
2. 确保浏览器标签页没有被静音

### 问题：数据丢失
**解决方案**：
1. 不要清除浏览器缓存
2. 不要使用隐私模式

### 问题：小游戏闹钟不触发
**解决方案**：
1. 确保小游戏闹钟开关已开启
2. 确保浏览器标签页保持打开状态

## 许可证

MIT License

## 作者

[你的名字]

---

祝您游戏愉快！
