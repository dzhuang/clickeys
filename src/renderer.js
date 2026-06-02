// Simple test to see if script loads
console.log('Renderer script loaded!');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready!');

    // Check if electronAPI exists
    if (window.electronAPI) {
        console.log('electronAPI is available');
        if (window.electronAPI.isMac) {
            document.body.classList.add('is-mac');
        }
        init();
    } else {
        console.error('electronAPI is NOT available!');
        document.body.innerHTML = '<div style="color: white; padding: 20px;"><h2>electronAPI 未加载</h2><p>Preload 脚本可能未正确加载</p></div>';
    }
});

// Sound schemes configuration
const SCHEMES = [
    { name: 'bubble', displayName: 'Bubble', icon: '🫧', description: '气泡音效' },
    { name: 'typewriter', displayName: 'Typewriter', icon: '⌨️', description: '打字机' },
    { name: 'mechanical', displayName: 'Mechanical', icon: '🔧', description: '机械键盘' },
    { name: 'sword', displayName: 'Sword', icon: '⚔️', description: '剑' },
    { name: 'drum', displayName: 'Drum', icon: '🥁', description: '鼓' },
    { name: 'Cherry_G80_3000', displayName: 'Cherry G80-3000', icon: '🍒', description: 'Cherry 键盘' },
    { name: 'Cherry_G80_3494', displayName: 'Cherry G80-3494', icon: '🍒', description: 'Cherry 键盘' },
    { name: 'My_Custom', displayName: 'My Custom', icon: '🎹', description: '自定义音效' }
];

// Key mapping
const SPECIAL_KEY_MAP = {
    'RETURN': 'enter',
    'SPACE': 'space',
    'BACK': 'backspace'
};

// Simple Audio Player using HTML5 Audio elements
class AudioPlayer {
    constructor() {
        this.audioElements = new Map();
        this.mouseAudioElements = new Map();
        this.schemeConfig = null;
        this.mouseSchemeName = null;
        this.dataPath = '';
        this.keyboardVolume = 0.8;
        this.mouseVolume = 0.8;
        this.mouseVolume = 0.8;
        this.pitch = 1.0;
        this.keyboardOutputDeviceId = 'default';
        this.mouseOutputDeviceId = 'default';
    }

    async init(dataPath) {
        this.dataPath = dataPath;
        console.log('AudioPlayer init with path:', dataPath);
    }

    async loadScheme(schemeName) {
        try {
            console.log('Loading scheme:', schemeName);
            const schemes = await window.electronAPI.readSchemes(this.dataPath);
            this.schemeConfig = schemes.find(s => s.name === schemeName);

            if (!this.schemeConfig) {
                console.error(`Scheme ${schemeName} not found`);
                return;
            }

            // Clear old audio elements
            this.audioElements.forEach(audio => {
                audio.pause();
                audio.src = '';
            });
            this.audioElements.clear();

            // Pre-create audio elements for each sound file
            for (let i = 0; i < this.schemeConfig.files.length; i++) {
                const fileName = this.schemeConfig.files[i];
                const audioPath = window.electronAPI.pathJoin(this.dataPath, schemeName, fileName);

                // Create audio element with file:// URL
                const audio = new Audio(`file://${audioPath}`);
                audio.volume = this.keyboardVolume; // Default to keyboard volume for base elements
                if (this.keyboardOutputDeviceId !== 'default' && typeof audio.setSinkId === 'function') {
                    await audio.setSinkId(this.keyboardOutputDeviceId);
                }
                this.audioElements.set(i, audio);
            }

            console.log(`Loaded scheme: ${schemeName} with ${this.audioElements.size} sounds`);
        } catch (e) {
            console.error('Failed to load scheme:', e);
        }
    }

    async loadMouseScheme(schemeName) {
        try {
            console.log('Loading mouse scheme:', schemeName);
            this.mouseSchemeName = schemeName;
            this.mouseAudioElements.clear();

            const basePath = window.electronAPI.pathJoin(this.dataPath, 'mouse', schemeName);
            const files = {
                'down': 'down.mp3',
                'up': 'up.mp3',
                'click': 'click.mp3' // Fallback or alternative
            };

            for (const [type, fileName] of Object.entries(files)) {
                const audioPath = window.electronAPI.pathJoin(basePath, fileName);
                // Pre-check file existence? The HTML5 Audio player might just fail silent or error.
                // We'll trust the pack structure for now.
                const audio = new Audio(`file://${audioPath}`);
                audio.volume = this.mouseVolume;
                if (this.mouseOutputDeviceId !== 'default' && typeof audio.setSinkId === 'function') {
                    await audio.setSinkId(this.mouseOutputDeviceId);
                }
                this.mouseAudioElements.set(type, audio);
            }
            console.log(`Loaded mouse scheme: ${schemeName}`);
        } catch (e) {
            console.error('Failed to load mouse scheme:', e);
        }
    }

    getAudioIndexForKey(keyName) {
        if (!this.schemeConfig) return -1;

        const specialKey = SPECIAL_KEY_MAP[keyName];
        if (specialKey) {
            const keyCodeMap = { 'enter': '36', 'space': '49', 'backspace': '51' };
            const keyCode = keyCodeMap[specialKey];
            if (keyCode && this.schemeConfig.key_audio_map[keyCode] !== undefined) {
                return this.schemeConfig.key_audio_map[keyCode];
            }
        }

        if (this.schemeConfig.non_unique_count > 0) {
            let hash = 0;
            for (let i = 0; i < keyName.length; i++) {
                hash = ((hash << 5) - hash) + keyName.charCodeAt(i);
                hash = hash & hash;
            }
            return Math.abs(hash) % this.schemeConfig.non_unique_count;
        }

        return 0;
    }

    play(index, specificVolume = null) {
        if (!this.audioElements.has(index)) return;

        const audio = this.audioElements.get(index);
        // Clone and play to allow overlapping sounds
        const clone = audio.cloneNode();
        clone.volume = specificVolume !== null ? specificVolume : this.keyboardVolume;
        clone.playbackRate = this.pitch;
        if (this.keyboardOutputDeviceId !== 'default' && typeof clone.setSinkId === 'function') {
            clone.setSinkId(this.keyboardOutputDeviceId).catch(console.error);
        }
        clone.play().catch(e => console.error('Play error:', e));
    }

    playForKey(keyName) {
        const index = this.getAudioIndexForKey(keyName);
        if (index >= 0) {
            this.play(index, this.keyboardVolume);
        }
    }

    playMouse(type) {
        // Play specific mouse sound
        let audio;
        if (type === 'down') {
            // Prefer 'down', fallback to 'click'
            audio = this.mouseAudioElements.get('down') || this.mouseAudioElements.get('click');
        } else if (type === 'up') {
            audio = this.mouseAudioElements.get('up');
        }

        if (audio) {
            const clone = audio.cloneNode();
            clone.volume = this.mouseVolume;
            if (this.mouseOutputDeviceId !== 'default' && typeof clone.setSinkId === 'function') {
                clone.setSinkId(this.mouseOutputDeviceId).catch(console.error);
            }
            clone.play().catch(e => console.error('Mouse play error:', e));
        }
    }

    setKeyboardVolume(volume) {
        this.keyboardVolume = volume;
    }

    setMouseVolume(volume) {
        this.mouseVolume = volume;
    }

    setPitch(pitch) {
        this.pitch = pitch;
    }

    setKeyboardOutputDevice(deviceId) {
        this.keyboardOutputDeviceId = deviceId;
        console.log('Setting keyboard output device to:', deviceId);
    }

    setMouseOutputDevice(deviceId) {
        this.mouseOutputDeviceId = deviceId;
        console.log('Setting mouse output device to:', deviceId);
    }
}

// Global audio player instance
const audioPlayer = new AudioPlayer();

// Initialize app
async function init() {
    try {
        console.log('Initializing Clickeys...');

        const settings = await window.electronAPI.getSettings();
        const dataPath = await window.electronAPI.getDataPath();

        console.log('Data path:', dataPath);
        console.log('Settings:', settings);

        // Initialize audio player
        await audioPlayer.init(dataPath);
        await audioPlayer.loadScheme(settings.scheme);
        // Load default or saved mouse scheme
        const mouseScheme = settings.mouseScheme || 'Logitech G203';
        await audioPlayer.loadMouseScheme(mouseScheme);

        audioPlayer.setKeyboardVolume(settings.keyboardVolume);
        audioPlayer.setMouseVolume(settings.mouseVolume);
        audioPlayer.setPitch(settings.pitch);
        if (settings.keyboardOutputDeviceId) {
            audioPlayer.setKeyboardOutputDevice(settings.keyboardOutputDeviceId);
        }
        if (settings.mouseOutputDeviceId) {
            audioPlayer.setMouseOutputDevice(settings.mouseOutputDeviceId);
        }

        // Setup UI
        setupSchemeGrid(settings.scheme);
        await setupMouseSelector(mouseScheme);
        setupSliders(settings);
        setupDeviceSelectors(settings);
        setupToggles(settings);
        setupIgnoreOptions(settings);
        setupWindowControls();
        setupTestButton();

        // Listen for keyboard events
        window.electronAPI.onKeyPressed((data) => {
            audioPlayer.playForKey(data.name);
        });

        window.electronAPI.onMouseEvent((type) => {
            audioPlayer.playMouse(type);
        });

        window.electronAPI.onSchemeChanged(async (scheme) => {
            await audioPlayer.loadScheme(scheme);
            updateSchemeUI(scheme);
        });

        window.electronAPI.onSettingChanged((data) => {
            if (data.key === 'keyboardEnabled') {
                const el = document.getElementById('keyboardToggle');
                if (el) el.checked = data.value;
            }
            if (data.key === 'mouseEnabled') {
                const el = document.getElementById('mouseToggle');
                if (el) el.checked = data.value;
            }
        });

        console.log('Clickeys initialized successfully!');
    } catch (e) {
        console.error('Failed to initialize:', e);
    }
}

function setupSchemeGrid(currentScheme) {
    const grid = document.getElementById('schemeGrid');
    if (!grid) return;

    grid.innerHTML = '';

    SCHEMES.forEach(scheme => {
        const card = document.createElement('div');
        card.className = `scheme-card ${scheme.name === currentScheme ? 'active' : ''}`;
        card.dataset.scheme = scheme.name;
        card.innerHTML = `
      <div class="scheme-icon">${scheme.icon}</div>
      <div class="scheme-name">${scheme.description}</div>
    `;

        card.addEventListener('click', async () => {
            await window.electronAPI.setSetting('scheme', scheme.name);
            await audioPlayer.loadScheme(scheme.name);
            updateSchemeUI(scheme.name);
            audioPlayer.play(0);
        });

        grid.appendChild(card);
    });
}

function updateSchemeUI(schemeName) {
    document.querySelectorAll('.scheme-card').forEach(card => {
        card.classList.toggle('active', card.dataset.scheme === schemeName);
    });
}

function setupSliders(settings) {
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    const mouseVolumeSlider = document.getElementById('mouseVolumeSlider');
    const mouseVolumeValue = document.getElementById('mouseVolumeValue');
    const pitchSlider = document.getElementById('pitchSlider');
    const pitchValue = document.getElementById('pitchValue');

    if (!volumeSlider || !pitchSlider || !mouseVolumeSlider) return;

    // Keyboard Volume
    volumeSlider.value = settings.keyboardVolume * 100;
    volumeValue.textContent = `${Math.round(settings.keyboardVolume * 100)}%`;

    volumeSlider.addEventListener('input', async (e) => {
        const volume = e.target.value / 100;
        volumeValue.textContent = `${e.target.value}%`;
        audioPlayer.setKeyboardVolume(volume);
        await window.electronAPI.setSetting('keyboardVolume', volume);
    });

    // Mouse Volume
    mouseVolumeSlider.value = settings.mouseVolume * 100;
    mouseVolumeValue.textContent = `${Math.round(settings.mouseVolume * 100)}%`;

    mouseVolumeSlider.addEventListener('input', async (e) => {
        const volume = e.target.value / 100;
        mouseVolumeValue.textContent = `${e.target.value}%`;
        audioPlayer.setMouseVolume(volume);
        await window.electronAPI.setSetting('mouseVolume', volume);
    });

    pitchSlider.value = settings.pitch * 100;
    pitchValue.textContent = `${settings.pitch.toFixed(1)}x`;

    pitchSlider.addEventListener('input', async (e) => {
        const pitch = e.target.value / 100;
        pitchValue.textContent = `${pitch.toFixed(1)}x`;
        audioPlayer.setPitch(pitch);
        await window.electronAPI.setSetting('pitch', pitch);
    });
}

async function setupMouseSelector(currentScheme) {
    const select = document.getElementById('mouseSchemeSelect');
    if (!select) return;

    try {
        const schemes = await window.electronAPI.getMouseSchemes();
        select.innerHTML = '';

        schemes.forEach(scheme => {
            const option = document.createElement('option');
            option.value = scheme;
            option.textContent = scheme;
            if (scheme === currentScheme) option.selected = true;
            select.appendChild(option);
        });

        select.addEventListener('change', async (e) => {
            const newScheme = e.target.value;
            await window.electronAPI.setSetting('mouseScheme', newScheme);
            await audioPlayer.loadMouseScheme(newScheme);
        });
    } catch (e) {
        console.error('Failed to setup mouse selector:', e);
    }
}

async function setupDeviceSelectors(settings) {
    const kbSelect = document.getElementById('keyboardDeviceSelect');
    const mouseSelect = document.getElementById('mouseDeviceSelect');
    const refreshBtn = document.getElementById('refreshDevicesBtn');

    if (!kbSelect || !mouseSelect || !refreshBtn) return;

    async function populateDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

            // Populate both selectors
            [kbSelect, mouseSelect].forEach(select => {
                const currentId = select === kbSelect ? settings.keyboardOutputDeviceId : settings.mouseOutputDeviceId;
                select.innerHTML = '';

                audioOutputs.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `设备 ${device.deviceId.slice(0, 8)}...`;

                    const labelLower = device.label.toLowerCase();
                    if (labelLower.includes('cable') || labelLower.includes('vb-audio')) {
                        option.textContent = `🔊 ${option.textContent} (VB-Cable)`;
                        option.setAttribute('data-is-vbcable', 'true'); // For CSS highlighting
                    } else if (labelLower.includes('blackhole')) {
                        option.textContent = `🔊 ${option.textContent} (BlackHole)`;
                        option.setAttribute('data-is-vbcable', 'true'); // Treat same as VB-Cable for UI highlighting
                    }

                    if (device.deviceId === currentId) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
            });

        } catch (e) {
            console.error('Failed to enumerate devices:', e);
        }
    }

    await populateDevices();

    kbSelect.addEventListener('change', async (e) => {
        await window.electronAPI.setSetting('keyboardOutputDeviceId', e.target.value);
        audioPlayer.setKeyboardOutputDevice(e.target.value);
    });

    mouseSelect.addEventListener('change', async (e) => {
        await window.electronAPI.setSetting('mouseOutputDeviceId', e.target.value);
        audioPlayer.setMouseOutputDevice(e.target.value);
    });

    refreshBtn.addEventListener('click', populateDevices);
}

function setupToggles(settings) {
    const kbToggle = document.getElementById('keyboardToggle');
    const mouseToggle = document.getElementById('mouseToggle');

    if (kbToggle) {
        kbToggle.checked = settings.keyboardEnabled;
        kbToggle.addEventListener('change', async (e) => {
            await window.electronAPI.setSetting('keyboardEnabled', e.target.checked);
        });
    }

    if (mouseToggle) {
        mouseToggle.checked = settings.mouseEnabled;
        mouseToggle.addEventListener('change', async (e) => {
            await window.electronAPI.setSetting('mouseEnabled', e.target.checked);
        });
    }
}

function setupIgnoreOptions(settings) {
    const ids = ['ignoreShift', 'ignoreCtrl', 'ignoreAlt'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.checked = settings[id];
            el.addEventListener('change', async (e) => {
                await window.electronAPI.setSetting(id, e.target.checked);
            });
        }
    });
}

function setupWindowControls() {
    document.getElementById('closeBtn')?.addEventListener('click', () => {
        window.electronAPI.closeWindow();
    });

    document.getElementById('minimizeBtn')?.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });
}

function setupTestButton() {
    document.getElementById('testSoundBtn')?.addEventListener('click', () => {
        audioPlayer.play(0);
        setTimeout(() => audioPlayer.play(1), 150);
        setTimeout(() => audioPlayer.play(2), 300);
    });
}
