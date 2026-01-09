const { ipcRenderer } = require('electron');

const heightRange = document.getElementById('height-range');
const heightValue = document.getElementById('height-value');
const opacityRange = document.getElementById('opacity-range');
const opacityValue = document.getElementById('opacity-value');

const shortcutInput = document.getElementById('shortcut-input');
const masterToggle = document.getElementById('master-toggle');
const statusText = document.getElementById('status-text');

// Initial settings object
let currentSettings = {
    height: 100,
    opacity: 0.5,
    shortcut: 'CommandOrControl+Shift+F'
};

// Listen for initial settings from main process
ipcRenderer.on('init-settings', (event, settings) => {
    currentSettings = settings;
    updateUI();
});

// Listen for status updates from main process (e.g. toggle via shortcut)
ipcRenderer.on('overlay-status-changed', (event, isVisible) => {
    masterToggle.checked = isVisible;
    updateStatusLabel(isVisible);
});

function updateStatusLabel(isActive) {
    if (isActive) {
        statusText.textContent = "Actif";
        statusText.className = "status-badge";
    } else {
        statusText.textContent = "Inactif";
        statusText.className = "status-badge inactive";
    }
}

function updateUI() {
    // Height
    heightRange.value = currentSettings.height;
    heightValue.textContent = `${currentSettings.height}px`;

    // Opacity (converted to 0-100 range for slider)
    const opacityPercent = Math.round(currentSettings.opacity * 100);
    opacityRange.value = opacityPercent;
    opacityValue.textContent = `${opacityPercent}%`;

    // Shortcut
    shortcutInput.value = currentSettings.shortcut || '';
}

function updateSettings() {
    const height = parseInt(heightRange.value);
    const opacity = parseInt(opacityRange.value) / 100;

    heightValue.textContent = `${height}px`;
    opacityValue.textContent = `${opacityRange.value}%`;

    const newSettings = {
        height,
        opacity,
        shortcut: currentSettings.shortcut // Maintain current shortcut
    };

    ipcRenderer.send('update-settings', newSettings);
}

// Master Toggle
masterToggle.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    updateStatusLabel(isChecked);
    ipcRenderer.send('toggle-overlay-from-ui', isChecked);
});

// Shortcut Recording
shortcutInput.addEventListener('keydown', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const keys = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.metaKey) keys.push('Command'); // Electron uses CommandOrControl usually, but let's just stick to what accelerator expects or display.
    // Actually Electron accelerators: CommandOrControl, Alt, Shift, Control.
    // Let's simplify and just grab modifiers + key

    // Simple accelerator recorder logic
    let modifiers = [];
    if (e.ctrlKey) modifiers.push('Control');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');
    if (e.metaKey) modifiers.push('Command'); // Mac specific usually

    let key = e.key;
    // Map key names if necessary (e.g. " " -> "Space")
    if (key === ' ') key = 'Space';
    if (key.length === 1) key = key.toUpperCase();

    // Ignore if only modifiers are pressed
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    const accelerator = [...modifiers, key].join('+');
    shortcutInput.value = accelerator;
    currentSettings.shortcut = accelerator;

    // We send specific update for shortcut to handle re-registration safely
    ipcRenderer.send('update-shortcut', accelerator);
});

heightRange.addEventListener('input', updateSettings);
opacityRange.addEventListener('input', updateSettings);
