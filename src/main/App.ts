import { is } from '@electron-toolkit/utils';
import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import icon from '../../resources/icon.png?asset';
import { DockerodeService } from './data/services/DockerodeService';
import { containerControllerFactory } from './factories/controllers/containerControllerFactory';
import { dockerControllerFactory } from './factories/controllers/dockerControllerFactory';
import { E_OnIPCChannels } from './shared/enums/IPCChannels';
import { ContainerAction } from './shared/types/EventDockerTypes';

export class App {
  public static mainWindow: BrowserWindow | null = null;
  private dockerService = new DockerodeService();

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
    App.mainWindow = new BrowserWindow({
      width: 1100,
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

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      App.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      App.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
  }

  private registerEvents(): void {
    containerControllerFactory(this.dockerService).register();
    dockerControllerFactory(this.dockerService).register();

    this.dockerService.connect().catch(() => {});

    if (this.dockerService.isConnected()) {
      this.startEventStreaming();
    }

    setInterval(async () => {
      if (!this.dockerService.isConnected()) {
        try {
          await this.dockerService.connect();
          if (this.dockerService.isConnected()) {
            this.startEventStreaming();
          }
        } catch {
          // silently ignore, next interval will retry
        }
      }
    }, 5000);
  }

  private startEventStreaming(): void {
    this.dockerService.onContainerEvent(
      [ContainerAction.START, ContainerAction.STOP, ContainerAction.DIE],
      (event) => {
        App.mainWindow?.webContents.send(E_OnIPCChannels.CONTAINERS_UPDATED, event);
      },
    );
  }
}
