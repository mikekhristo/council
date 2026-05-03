const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('council', {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (payload) => ipcRenderer.invoke('settings:save', payload),
    openDataDir: () => ipcRenderer.invoke('settings:open-data-dir'),
  },
});
