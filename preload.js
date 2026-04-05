const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('minimize'),
    maximize: () => ipcRenderer.send('maximize'),
    close: () => ipcRenderer.send('close'),
    toggleAlwaysOnTop: (isAlwaysOnTop) => ipcRenderer.send('toggleAlwaysOnTop', isAlwaysOnTop),
    onAlwaysOnTopToggled: (callback) => ipcRenderer.on('alwaysOnTopToggled', (event, isAlwaysOnTop) => callback(isAlwaysOnTop))
});
