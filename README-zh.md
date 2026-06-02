# Clickeys

Clickeys 是一款专为 Windows 和 macOS 设计的打字与鼠标点击音效增强工具。它为您的日常输入操作带来丰富多样的反馈音效（如机械键盘、打字机、气泡音等），显著提升打字节奏感与使用乐趣，并支持将音效输出至虚拟音频线（如 VB-Cable 或 BlackHole）中用于直播、录屏或语音通话。

本项目的灵感源自于：[clicket](https://github.com/spreyo/clicket)。

---

## ✨ 核心特性

- **🎹 丰富的键盘音效方案**：内置打字机（Typewriter）、气泡（Bubble）、机械键盘（Mechanical）、剑击（Sword）、战鼓（Drum）以及经典的 Cherry G80 系列键盘等多款高品质预设音效，并支持**自定义音效方案**。
- **🖱 独立鼠标音效**：支持罗技、雷蛇、Glorious 等多种主流游戏鼠标的左右键微动点击音效。
- **🎚 深度声音参数调节**：
  - 独立调节键盘与鼠标音效的音量大小。
  - 支持按键音调（Pitch）和播放速度的无级调节（0.5x - 2.0x）。
- **🎧 多音频通道输出**：可分别将键盘、鼠标音效输出到不同的物理扬声器或虚拟声卡通道。
  - **Windows & macOS**：原生支持识别并标记 **VB-Cable**。
  - **macOS**：原生支持识别并标记 **BlackHole**。
- **🛡 智能过滤与静音**：可单独设置忽略修饰键（Shift、Ctrl、Alt），避免在组合键操作或连续敲击时产生冗余噪声。
- **⌨️ 全局快捷键**：
  - `Ctrl + Shift + 5`：快速启用/禁用键盘音效
  - `Ctrl + Shift + 6`：快速启用/禁用鼠标音效
  - `Ctrl + Shift + 7`：快速激活并显示主窗口
- **🎨 现代磨砂玻璃 UI**：采用深色微光拟物化及毛玻璃质感风格设计，界面美观现代且轻量。

---

## 🚀 快速开始

### 运行环境要求
- **Node.js**: v18.0.0 或更高版本
- **Windows**: 10 / 11 (x64)
- **macOS**: High Sierra (10.13) 或更高版本 (兼容 Intel & Apple Silicon M系列芯片)

### 开发运行步骤
1. 克隆本项目代码：
   ```bash
   git clone <repository-url>
   cd Clickeys
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 启动开发模式：
   ```bash
   npm start
   ```

### 🍎 macOS 特别说明
在 macOS 上首次启动应用时，系统会弹出**“辅助功能 (Accessibility)”**授权提示。这是因为应用需要监听全局系统级按键和点击以播放对应音效。请前往“系统设置 -> 隐私与安全 -> 辅助功能”中允许 `Clickeys` 运行。

---

## 📦 打包发布

项目使用 `electron-builder` 进行跨平台构建发布，可在 `dist/` 目录下生成绿色免安装版与安装包：

### 构建 Windows 安装包 (.exe)
```bash
npm run build
```

### 构建 macOS 安装包 (.dmg)
需要在 macOS 系统下运行以下命令：
```bash
npm run build:mac
```

---

## 🎨 添加自定义音效

若要配置专属的键盘音效，可按以下步骤操作：
1. 准备您的 WAV 格式音效文件。
2. 将音效文件放入 `data/My_Custom/` 目录中。
3. 打开并修改 `data/schemes.json`，根据其中 `"My_Custom"` 节点的配置映射对应的文件名：
   ```json
   {
     "name": "My_Custom",
     "files": ["key_0.wav", "key_1.wav", ...],
     "non_unique_count": 6,
     "key_audio_map": {
       "36": 7,  // Enter 键映射音效
       "49": 9,  // Space 键映射音效
       "51": 8   // Backspace 键映射音效
     }
   }
   ```
4. 重启应用或在界面中选择 `My Custom` 音效卡片即可启用。

---

## 🤝 致谢

本应用的设计和灵感很大程度上启发自 [clicket](https://github.com/spreyo/clicket)。非常感谢原作者的优秀创意与探索！

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 许可证开源。
