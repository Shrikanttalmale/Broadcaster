import { contextBridge, ipcRenderer } from 'electron';

// Expose APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App management
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getAppPath: () => ipcRenderer.invoke('app:get-app-path'),
  quit: () => ipcRenderer.invoke('app:quit'),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateAvailable: (callback: () => void) =>
    ipcRenderer.on('update:available', callback),
  onUpdateDownloaded: (callback: () => void) =>
    ipcRenderer.on('update:downloaded', callback),

  // API communication (forwarded from backend)
  invokeAPI: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),
  sendAPI: (channel: string, ...args: any[]) =>
    ipcRenderer.send(channel, ...args),
  onAPI: (channel: string, callback: (...args: any[]) => void) =>
    ipcRenderer.on(channel, (_event, ...args) => callback(...args)),
});

// Expose localStorage wrapper
contextBridge.exposeInMainWorld('appStorage', {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
  clear: () => localStorage.clear(),
});
