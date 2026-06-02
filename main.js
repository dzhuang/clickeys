const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { GlobalKeyboardListener } = require('keyspy');

// Initialize store for settings persistence
const store = new Store({
    defaults: {
        scheme: 'typewriter',
        keyboardVolume: 0.8,
        mouseVolume: 0.8,
        mouseScheme: 'Logitech G203',
        pitch: 1.0,
        enabled: true, // Master switch kept for compatibility, but we use granular ones now
        keyboardEnabled: true,
        mouseEnabled: true,
        ignoreShift: false,
        ignoreCtrl: false,
        ignoreAlt: false,
        keyboardOutputDeviceId: 'default',
        mouseOutputDeviceId: 'default',
        startMinimized: false
    }
});

// Ensure only one instance runs at a time
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    console.log('Another instance is already running. Exiting...');
    app.quit();
} else {
    app.on('second-instance', () => {
        // When second instance tries to run, focus our window
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

let mainWindow = null;
let tray = null;
let keyboardListener = null;
let isEnabled = store.get('enabled');
let isKeyboardEnabled = store.get('keyboardEnabled', true);
let isMouseEnabled = store.get('mouseEnabled', true);
let ignoreShift = store.get('ignoreShift', false);
let ignoreCtrl = store.get('ignoreCtrl', false);
let ignoreAlt = store.get('ignoreAlt', false);

// Get the correct path for resources
function getDataPath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'data');
    }
    return path.join(__dirname, 'data');
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 480,
        height: 580,
        resizable: false,
        show: !store.get('startMinimized'),
        frame: false,
        transparent: false,
        backgroundColor: '#1a1a2e',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png')
    });

    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

    // Uncomment for debugging:
    // mainWindow.webContents.openDevTools();

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createTray() {
    const iconPath = path.join(__dirname, 'assets', 'icon.png');

    // Create a simple icon if the file doesn't exist
    let trayIcon;
    try {
        trayIcon = nativeImage.createFromPath(iconPath);
        if (trayIcon.isEmpty()) {
            trayIcon = nativeImage.createEmpty();
        }
    } catch (e) {
        trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon);
    tray.setToolTip('Clickeys - 打字音效');

    updateTrayMenu();

    if (process.platform !== 'darwin') {
        tray.on('click', () => {
            if (mainWindow) {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        });
    }
}

function updateTrayMenu() {
    const schemes = [
        { name: 'bubble', label: 'Bubble 气泡' },
        { name: 'typewriter', label: 'Typewriter 打字机' },
        { name: 'mechanical', label: 'Mechanical 机械键盘' },
        { name: 'sword', label: 'Sword 剑' },
        { name: 'drum', label: 'Drum 鼓' },
        { name: 'Cherry_G80_3000', label: 'Cherry G80-3000' },
        { name: 'Cherry_G80_3494', label: 'Cherry G80-3494' }
    ];

    const currentScheme = store.get('scheme');

    const contextMenu = Menu.buildFromTemplate([
        {
            label: isKeyboardEnabled ? '✅ 键盘音效' : '❌ 键盘音效',
            click: () => {
                isKeyboardEnabled = !isKeyboardEnabled;
                store.set('keyboardEnabled', isKeyboardEnabled);
                updateTrayMenu();
                if (mainWindow) mainWindow.webContents.send('setting-changed', { key: 'keyboardEnabled', value: isKeyboardEnabled });
            }
        },
        {
            label: isMouseEnabled ? '✅ 鼠标音效' : '❌ 鼠标音效',
            click: () => {
                isMouseEnabled = !isMouseEnabled;
                store.set('mouseEnabled', isMouseEnabled);
                updateTrayMenu();
                if (mainWindow) mainWindow.webContents.send('setting-changed', { key: 'mouseEnabled', value: isMouseEnabled });
            }
        },
        { type: 'separator' },
        {
            label: '音效方案',
            submenu: schemes.map(s => ({
                label: s.label,
                type: 'radio',
                checked: currentScheme === s.name,
                click: () => {
                    store.set('scheme', s.name);
                    if (mainWindow) {
                        mainWindow.webContents.send('scheme-changed', s.name);
                    }
                }
            }))
        },
        { type: 'separator' },
        {
            label: '设置',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
}

function setupKeyboardListener() {
    keyboardListener = new GlobalKeyboardListener();

    // Debounce map to prevent echo from repeated key events
    const lastKeyTime = new Map();
    const DEBOUNCE_MS = 150; // Minimum time between same key events
    const pressedKeys = new Set(); // Track keys currently down

    keyboardListener.addListener((e, down) => {
        if (!e.name) return;

        // Check if it's a mouse event
        if (e.name.startsWith('MOUSE')) {
            if (isEnabled && isMouseEnabled && mainWindow) {
                if (e.state === 'DOWN') {
                    mainWindow.webContents.send('mouse-event', 'down');
                } else if (e.state === 'UP') {
                    mainWindow.webContents.send('mouse-event', 'up');
                }
            }
            return;
        }

        if (e.state === 'DOWN' && isEnabled && isKeyboardEnabled && mainWindow) {
            // Ignore shortcut keys (Ctrl+Shift+5/6/7) for sound
            const isCtrl = down['LEFT CTRL'] || down['RIGHT CTRL'];
            const isShift = down['LEFT SHIFT'] || down['RIGHT SHIFT'];

            if (isCtrl && isShift && (e.name === '5' || e.name === '6' || e.name === '7')) {
                return;
            }

            // Check Ignore Keys
            if (ignoreShift && (e.name === 'LEFT SHIFT' || e.name === 'RIGHT SHIFT')) return;
            if (ignoreCtrl && (e.name === 'LEFT CTRL' || e.name === 'RIGHT CTRL')) return;
            if (ignoreAlt && (e.name === 'LEFT ALT' || e.name === 'RIGHT ALT')) return;

            // Ignore if key is already considered pressed (key repeat)
            if (pressedKeys.has(e.name)) {
                return;
            }
            pressedKeys.add(e.name);
            const now = Date.now();
            const lastTime = lastKeyTime.get(e.name) || 0;
            if (now - lastTime < DEBOUNCE_MS) {
                return;
            }
            lastKeyTime.set(e.name, now);
            console.log('Key event sent:', e.name, 'count:', (global.keyEventCount = (global.keyEventCount || 0) + 1));
            mainWindow.webContents.send('key-pressed', {
                name: e.name,
                rawKey: e.rawKey
            });
        } else if (e.state === 'UP') {
            // Remove from pressed set on key release
            pressedKeys.delete(e.name);
        }
    });
}

// IPC handlers
ipcMain.handle('get-settings', () => {
    return {
        scheme: store.get('scheme'),
        keyboardVolume: store.get('keyboardVolume', store.get('volume', 0.8)), // Migration fallback
        mouseVolume: store.get('mouseVolume', 0.8),
        mouseScheme: store.get('mouseScheme', 'Logitech G203'),
        pitch: store.get('pitch'),
        enabled: store.get('enabled'),
        keyboardEnabled: store.get('keyboardEnabled', true),
        mouseEnabled: store.get('mouseEnabled', true),
        ignoreShift: store.get('ignoreShift', false),
        ignoreCtrl: store.get('ignoreCtrl', false),
        ignoreAlt: store.get('ignoreAlt', false),
        keyboardOutputDeviceId: store.get('keyboardOutputDeviceId', store.get('outputDeviceId', 'default')),
        mouseOutputDeviceId: store.get('mouseOutputDeviceId', 'default')
    };
});

ipcMain.handle('set-setting', (event, key, value) => {
    store.set(key, value);
    if (key === 'enabled') {
        isEnabled = value;
        updateTrayMenu();
    }
    if (key === 'keyboardEnabled') {
        isKeyboardEnabled = value;
        updateTrayMenu();
    }
    if (key === 'mouseEnabled') {
        isMouseEnabled = value;
        updateTrayMenu();
    }
    if (key === 'ignoreShift') ignoreShift = value;
    if (key === 'ignoreCtrl') ignoreCtrl = value;
    if (key === 'ignoreAlt') ignoreAlt = value;

    if (key === 'scheme' || key === 'keyboardEnabled' || key === 'mouseEnabled') {
        updateTrayMenu();
    }
    return true;
});

ipcMain.handle('get-mouse-schemes', () => {
    const mousePath = path.join(getDataPath(), 'mouse');
    if (!fs.existsSync(mousePath)) return [];

    return fs.readdirSync(mousePath).filter(file => {
        return fs.statSync(path.join(mousePath, file)).isDirectory();
    });
});

ipcMain.handle('get-data-path', () => {
    return getDataPath();
});

ipcMain.on('close-window', () => {
    if (mainWindow) {
        mainWindow.hide();
    }
});

ipcMain.on('minimize-window', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

// App lifecycle
app.whenReady().then(() => {
    createWindow();
    createTray();
    setupKeyboardListener();
    setupMouseListener();

    if (process.platform === 'darwin') {
        const { systemPreferences } = require('electron');
        const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);
        if (!isTrusted) {
            systemPreferences.isTrustedAccessibilityClient(true);
        }
    }

    // Register shortcuts: Ctrl+Shift+5 (Keyboard), Ctrl+Shift+6 (Mouse)
    globalShortcut.register('CommandOrControl+Shift+5', () => {
        isKeyboardEnabled = !isKeyboardEnabled;
        store.set('keyboardEnabled', isKeyboardEnabled);
        updateTrayMenu();
        if (mainWindow) mainWindow.webContents.send('setting-changed', { key: 'keyboardEnabled', value: isKeyboardEnabled });
    });

    globalShortcut.register('CommandOrControl+Shift+6', () => {
        isMouseEnabled = !isMouseEnabled;
        store.set('mouseEnabled', isMouseEnabled);
        updateTrayMenu();
        if (mainWindow) mainWindow.webContents.send('setting-changed', { key: 'mouseEnabled', value: isMouseEnabled });
    });

    // Activation shortcut
    globalShortcut.register('CommandOrControl+Shift+7', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
});

function setupMouseListener() {
    // Handled globally by keyspy in setupKeyboardListener
}

app.on('window-all-closed', () => {
    // Don't quit on window close, keep running in tray
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;
});
