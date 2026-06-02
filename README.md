# clickeys

[简体中文](README-zh.md)

clickeys is a typing and mouse-click sound effect enhancement application designed for Windows and macOS. It brings delightful auditory feedback (such as mechanical keyboards, typewriters, bubbles, etc.) to your daily typing and mouse operations, significantly enhancing the rhythm and pleasure of typing. It also supports routing these sound effects to virtual audio cables (like VB-Cable or BlackHole) for live streaming, screen recording, or voice chats.

This project is inspired by: [clicket](https://github.com/spreyo/clicket).

---

## ✨ Key Features

- **🎹 Rich Keyboard Schemes**: Built-in high-quality presets including Typewriter, Bubble, Mechanical keyboard, Sword hits, Drum, and classic Cherry G80 series models, along with support for **custom schemes**.
- **🖱 Independent Mouse Sounds**: Supports clicking sounds for both left and right buttons of popular gaming mice (Logitech, Razer, Glorious, etc.).
- **🎚 Precise Audio Control**:
  - Adjust keyboard and mouse sound volume independently.
  - Stepless adjustment of pitch and playback rate (0.5x - 2.0x).
- **🎧 Multi-Channel Output**: Separately route keyboard and mouse sounds to different output devices or virtual audio channels.
  - **Windows & macOS**: Native detection and labeling for **VB-Cable**.
  - **macOS**: Native detection and labeling for **BlackHole**.
- **🛡 Ignore Modifier Keys**: Prevent repetitive/noisy clicks by ignoring modifier keys (Shift, Ctrl, Alt).
- **⌨️ Global Shortcuts**:
  - `Ctrl + Shift + 5`: Toggle keyboard sounds.
  - `Ctrl + Shift + 6`: Toggle mouse sounds.
  - `Ctrl + Shift + 7`: Activate and show the main window.
- **🎨 Glassmorphism UI**: Beautiful, lightweight, and modern dark-themed user interface styled with vanilla CSS.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later
- **Windows**: 10 / 11 (x64)
- **macOS**: High Sierra (10.13) or later (fully compatible with Intel & Apple Silicon M-series chips)

### Local Development Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Clickeys
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```

### 🍎 macOS Accessibility Note
On macOS, when the application runs for the first time, you will be prompted to grant **Accessibility** permissions. This is required to capture system-wide keystrokes and clicks to play sound effects in the background. Please follow the instructions and enable `Clickeys` under "System Settings -> Privacy & Security -> Accessibility".

---

## 📦 Packaging and Distribution

The project uses `electron-builder` to bundle the app into installer binaries under the `dist/` folder.

### Build Windows Installer (.exe)
```bash
npm run build
```

### Build macOS Installer (.dmg)
This command must be run on a macOS machine:
```bash
npm run build:mac
```

---

## 🎨 Setting Up Custom Schemes

To configure your own keyboard sound effects:
1. Prepare your custom sound files in `.wav` format.
2. Put the files in the `data/My_Custom/` directory.
3. Edit `data/schemes.json` under the `"My_Custom"` block to map filenames:
   ```json
   {
     "name": "My_Custom",
     "files": ["key_0.wav", "key_1.wav", ...],
     "non_unique_count": 6,
     "key_audio_map": {
       "36": 7,  // Map Enter key to index 7
       "49": 9,  // Map Space key to index 9
       "51": 8   // Map Backspace key to index 8
     }
   }
   ```
4. Restart the app or select the `My Custom` card in the UI.

---

## 🤝 Credits

The design and concept of this application were heavily inspired by [clicket](https://github.com/spreyo/clicket). Big thanks to the original author for the great idea!

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
