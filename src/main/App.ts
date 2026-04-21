import { is } from '@electron-toolkit/utils';
import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import icon from '../../resources/icon.png?asset';
import { DockerodeService } from './data/services/DockerodeService';
import { containerControllerFactory } from './factories/controllers/containerControllerFactory';
import { E_OnIPCChannels } from './shared/enums/IPCChannels';
import { ContainerAction } from './shared/types/EventDockerTypes';

export class App {
  public static mainWindow: BrowserWindow | null = null;
  public start(): void {
    app
      .on('ready', this.createWindow)
      .whenReady()
      .then(() => {
        this.registerEvents();
      });
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private createWindow(): void {
    // Create the browser window.
    App.mainWindow = new BrowserWindow({
      width: 900,
      height: 670,
      show: false,
      autoHideMenuBar: true,
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
      },
    });

    App.mainWindow.on('ready-to-show', () => {
      App.mainWindow!.show();
    });

    App.mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      App.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      App.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    // Open the DevTools.
    // App.mainWindow.webContents.openDevTools();
  }

  private registerEvents(): void {
    containerControllerFactory().register();
    const service = new DockerodeService();
    service.connect();
    service.onContainerEvent(
      [ContainerAction.START, ContainerAction.STOP, ContainerAction.DIE],
      (event) => {
        App.mainWindow?.webContents.send(E_OnIPCChannels.CONTAINERS_UPDATED, event);
      },
    );
  }
}
