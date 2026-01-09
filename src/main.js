const { app, BrowserWindow, screen, ipcMain, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');

// Fix for transparent window Z-order issues on Windows
app.disableHardwareAcceleration();

// VITAL FIX: Prevent Chrome/Windows from "optimizing away" the overlay when over other Chrome windows
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

let overlayWindows = []; // Array to hold all overlay windows
let settingsWindow;
let tray;
let mousePollingInterval;

// Default settings
let settings = {
    height: 100, // px
    opacity: 0.5, // 0 to 1
    shortcut: 'CommandOrControl+Shift+F'
};



function createOverlayWindows() {
    // Close existing windows if any (e.g. on display change)
    overlayWindows.forEach(win => {
        if (win && !win.isDestroyed()) win.close();
    });
    overlayWindows = [];

    const displays = screen.getAllDisplays();

    displays.forEach(display => {
        const { x, y, width, height } = display.bounds;

        const win = new BrowserWindow({
            x,
            y,
            width,
            height,
            transparent: true,
            backgroundColor: '#00000000',
            hasShadow: false,
            frame: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            focusable: false, // Critical: prevent taking focus
            type: 'toolbar', // Helps with Z-order on Windows
            enableLargerThanScreen: true, // Important for some setups
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        win.setAlwaysOnTop(true, 'screen-saver'); // Highest priority
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); // Needed for fullscreen apps
        win.setIgnoreMouseEvents(true, { forward: true });
        win.loadFile('src/index.html');
        // win.maximize(); // Not needed if bounds are set explicitly and correctly

        // Store reference
        overlayWindows.push(win);
    });

    // Start polling mouse position
    startMousePolling();
    startZOrderEnforcement();
}

let zOrderInterval;

function startZOrderEnforcement() {
    if (zOrderInterval) clearInterval(zOrderInterval);

    // Hack: Force window to top every 500ms (more aggressive)
    zOrderInterval = setInterval(() => {
        overlayWindows.forEach(win => {
            if (win && !win.isDestroyed() && win.isVisible()) {
                win.setAlwaysOnTop(true, 'screen-saver');
                win.moveTop(); // Additional nudge
            }
        });
    }, 500);
}

function startMousePolling() {
    if (mousePollingInterval) clearInterval(mousePollingInterval);

    mousePollingInterval = setInterval(() => {
        const point = screen.getCursorScreenPoint();

        // Broadcast cursor position to ALL windows
        overlayWindows.forEach(win => {
            if (win && !win.isDestroyed()) {
                win.webContents.send('update-cursor', point);
            }
        });
    }, 16); // ~60fps
}

function createTray() {
    tray = new Tray(path.join(__dirname, 'icon.png')); // Placeholder icon needed
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Réglages', click: openSettings },
        { type: 'separator' },
        { label: 'Quitter', click: () => app.quit() }
    ]);
    tray.setToolTip('Focus Visuel');
    tray.setContextMenu(contextMenu);
}

let splashWindow;

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        transparent: false,
        frame: false,
        alwaysOnTop: true,
        center: true,
        resizable: false,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    splashWindow.loadFile('src/splash.html');
}

function openSettings() {
    // If settings window exists, focus it
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.show();
        settingsWindow.focus();
        return;
    }

    // Create the "Dashboard" (formerly settings)
    settingsWindow = new BrowserWindow({
        width: 800, // Wider for a real dashboard feel
        height: 600,
        title: 'Tableau de Bord - Focus Visuel',
        backgroundColor: '#121212', // Dark theme matching dashboard
        show: false, // Don't show immediately, wait for splash
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true
    });

    settingsWindow.loadFile('src/settings.html');

    settingsWindow.webContents.on('did-finish-load', () => {
        settingsWindow.webContents.send('init-settings', settings);
        // Do not show here automatically if called during splash phase, handled by timeout
    });

    // Close entire app when dashboard is closed
    settingsWindow.on('close', (event) => {
        app.quit();
    });
}

function toggleOverlay() {
    // Check state of the first window to decide toggle direction
    if (overlayWindows.length === 0) return;

    // We assume all windows are in sync. Check the first one.
    const firstWin = overlayWindows[0];
    if (!firstWin || firstWin.isDestroyed()) return;

    const isVisible = firstWin.isVisible();
    const shouldShow = !isVisible;

    overlayWindows.forEach(win => {
        if (win && !win.isDestroyed()) {
            if (shouldShow) {
                win.show();
                win.setAlwaysOnTop(true, 'screen-saver');
            } else {
                win.hide();
            }
        }
    });

    // Notify dashboard
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.webContents.send('overlay-status-changed', shouldShow);
    }
}

ipcMain.on('toggle-overlay-from-ui', (event, shouldBeVisible) => {
    overlayWindows.forEach(win => {
        if (win && !win.isDestroyed()) {
            if (shouldBeVisible) {
                win.show();
                win.setAlwaysOnTop(true, 'screen-saver');
            } else {
                win.hide();
            }
        }
    });
});

ipcMain.on('update-settings', (event, newSettings) => {
    settings = { ...settings, ...newSettings };
    // Broadcast settings to ALL windows
    overlayWindows.forEach(win => {
        if (win && !win.isDestroyed()) {
            win.webContents.send('update-settings', settings);
        }
    });
});

ipcMain.on('update-shortcut', (event, newShortcut) => {
    if (settings.shortcut) {
        globalShortcut.unregister(settings.shortcut);
    }

    settings.shortcut = newShortcut;
    try {
        globalShortcut.register(newShortcut, toggleOverlay);
    } catch (e) {
        console.error('Failed to register shortcut', e);
    }
});

app.whenReady().then(() => {
    createSplashWindow();

    // Initialize app components in background
    createOverlayWindows();
    createTray();

    // Handle display changes (plug/unplug)
    screen.on('display-added', createOverlayWindows);
    screen.on('display-removed', createOverlayWindows);
    screen.on('display-metrics-changed', createOverlayWindows);

    // Create Dashboard (hidden)
    openSettings();

    // Register initial shortcut
    try {
        globalShortcut.register(settings.shortcut, toggleOverlay);
    } catch (e) {
        console.error('Failed to register initial shortcut', e);
    }

    // Simulate loading time then show app
    setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }
        if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.show();
            settingsWindow.focus();
        }
    }, 3000); // 3 seconds splash
});

app.on('before-quit', () => {
    app.isQuiting = true;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
