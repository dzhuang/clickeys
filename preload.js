const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Store listeners to prevent duplicates
let keyPressedCallback = null;
let schemeChangedCallback = null;
let enabledChangedCallback = null;

contextBridge.exposeInMainWorld('electronAPI', {
    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
    getDataPath: () => ipcRenderer.invoke('get-data-path'),

    // Window controls
    closeWindow: () => ipcRenderer.send('close-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),

    // File reading for audio
    readSchemes: async (dataPath) => {
        const schemesPath = path.join(dataPath, 'schemes.json');
        const content = fs.readFileSync(schemesPath, 'utf8');
        return JSON.parse(content);
    },
    getMouseSchemes: () => ipcRenderer.invoke('get-mouse-schemes'),

    readAudioFile: (filePath) => {
        return fs.readFileSync(filePath);
    },

    pathJoin: (...args) => path.join(...args),

    // Event listeners - prevent duplicate registration
    onKeyPressed: (callback) => {
        // Remove old listener if exists
        if (keyPressedCallback) {
            ipcRenderer.removeListener('key-pressed', keyPressedCallback);
        }
        keyPressedCallback = (event, data) => callback(data);
        ipcRenderer.on('key-pressed', keyPressedCallback);
    },
    onSchemeChanged: (callback) => {
        if (schemeChangedCallback) {
            ipcRenderer.removeListener('scheme-changed', schemeChangedCallback);
        }
        schemeChangedCallback = (event, scheme) => callback(scheme);
        ipcRenderer.on('scheme-changed', schemeChangedCallback);
    },
    onEnabledChanged: (callback) => { // Deprecated/Legacy
        if (enabledChangedCallback) {
            ipcRenderer.removeListener('enabled-changed', enabledChangedCallback);
        }
        enabledChangedCallback = (event, enabled) => callback(enabled);
        ipcRenderer.on('enabled-changed', enabledChangedCallback);
    },
    onSettingChanged: (callback) => {
        ipcRenderer.on('setting-changed', (event, data) => callback(data));
    },
    onMouseEvent: (callback) => {
        ipcRenderer.on('mouse-event', (event, type) => callback(type));
    }
});
