import {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  session,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as isDev from 'electron-is-dev';

let mainWindow: BrowserWindow | null = null;
let apiProcess: any = null;

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify();

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  const startUrl = isDev
    ? 'http://localhost:3000' // React dev server
    : `file://${path.join(__dirname, '../ui/dist/index.html')}`; // Production build

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createMenu();
};

const createMenu = () => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About Broadcaster',
              message: 'Broadcaster v0.1.0',
              detail: 'WhatsApp Bulk Marketing Desktop Application',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for app lifecycle
ipcMain.handle('app:check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return null;
  }
});

ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

ipcMain.handle('app:get-app-path', () => {
  return app.getAppPath();
});

ipcMain.handle('app:quit', () => {
  app.quit();
});

// Update events
autoUpdater.on('update-available', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update:available');
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update:downloaded');
  }
});

ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall();
});
