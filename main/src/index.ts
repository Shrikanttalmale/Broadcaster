import {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';

// Set development mode
process.env.NODE_ENV = 'development';

// Disable GPU acceleration to avoid GPU process crashes
app.disableHardwareAcceleration();

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});

let mainWindow: BrowserWindow | null = null;

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify();

const createWindow = () => {
  try {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
      icon: path.join(__dirname, '../assets/icon.png'),
    });

    const isDev = process.env.NODE_ENV === 'development';
    console.log('Development mode:', isDev);
    
    let startUrl: string;
    if (isDev) {
      // Try to use the port passed from start-dev.js, otherwise default to 5173
      const vitePort = process.env.VITE_PORT || '5173';
      startUrl = `http://localhost:${vitePort}`;
    } else {
      startUrl = `file://${path.join(__dirname, '../ui/dist/index.html')}`;
    }

    console.log('Loading URL:', startUrl);
    mainWindow.loadURL(startUrl);

    // Add error handlers
    mainWindow.webContents.on('crashed', () => {
      console.error('❌ Web contents crashed');
    });

    mainWindow.on('unresponsive', () => {
      console.warn('⚠️  Window unresponsive');
    });

    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      console.error('❌ Failed to load:', errorCode, errorDescription);
    });

    if (isDev) {
      mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
      console.log('🪟 Window closed');
      mainWindow = null;
    });

    createMenu();
    console.log('✅ Window created successfully');
  } catch (error) {
    console.error('❌ Error creating window:', error);
    process.exit(1);
  }
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

app.on('ready', () => {
  console.log('📱 App ready, creating window...');
  createWindow();
});

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
