import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import icon from '../../../resources/icon.png?asset';

export class TrayService {
  private tray: Tray | null = null;
  private createWindowCallback: () => void;

  constructor(createWindowCallback: () => void) {
    this.createWindowCallback = createWindowCallback;
  }

  public createTray(): void {
    const trayIcon = nativeImage.createFromPath(icon);
    this.tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));

    this.tray.setToolTip('Docker Interface Controller');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Abrir Docker Controller',
        click: () => {
          if (BrowserWindow.getAllWindows().length === 0) {
            this.createWindowCallback();
          } else {
            const win = BrowserWindow.getAllWindows()[0];
            win.show();
            win.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);

    this.tray.on('double-click', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindowCallback();
      } else {
        const win = BrowserWindow.getAllWindows()[0];
        win.show();
        win.focus();
      }
    });
  }
}
