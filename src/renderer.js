const { ipcRenderer } = require('electron');

const maskTop = document.getElementById('mask-top');
const maskBottom = document.getElementById('mask-bottom');

let overlayHeight = 100; // Default height

ipcRenderer.on('update-cursor', (event, globalPoint) => {
    const globalX = globalPoint.x;
    const globalY = globalPoint.y;

    // Get this window's position on screen
    const windowX = window.screenX;
    const windowY = window.screenY;
    const windowWidth = window.outerWidth;
    const windowHeight = window.outerHeight;

    // Check if cursor is inside this window/screen
    const isCursorInWindow = (
        globalX >= windowX &&
        globalX < windowX + windowWidth &&
        globalY >= windowY &&
        globalY < windowY + windowHeight
    );

    if (isCursorInWindow) {
        // Cursor is here: Render the focus band
        const localY = globalY - windowY;

        let topHeight = localY - (overlayHeight / 2);
        if (topHeight < 0) topHeight = 0;

        maskTop.style.height = `${topHeight}px`;
        maskTop.style.opacity = currentOpacity; // Restore user opacity

        let bottomMaskTop = localY + (overlayHeight / 2);
        maskBottom.style.top = `${bottomMaskTop}px`;
        maskBottom.style.bottom = '0';
        maskBottom.style.opacity = currentOpacity; // Restore user opacity
        maskBottom.style.height = 'auto'; // Reset height to rely on top + bottom

    } else {
        // Cursor is on another screen: Darken fully (Focus Mode)
        // Set top mask to cover everything, or both.
        maskTop.style.height = '100%';
        maskTop.style.opacity = currentOpacity;

        // Hide bottom mask or push it down
        maskBottom.style.top = '100%';
        maskBottom.style.height = '0';
    }
});

let currentOpacity = 0.5;

ipcRenderer.on('update-settings', (event, settings) => {
    if (settings.height !== undefined) {
        overlayHeight = settings.height;
    }
    if (settings.opacity !== undefined) {
        currentOpacity = settings.opacity;
        // Apply immediately
        maskTop.style.opacity = currentOpacity;
        maskBottom.style.opacity = currentOpacity;
    }
});
