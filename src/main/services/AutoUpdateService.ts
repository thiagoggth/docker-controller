import { E_IPCChannels, E_OnIPCChannels } from '@core/shared/enums/IPCChannels';
import { ApiResult, Report } from '@core/shared/types/ApiTypes';
import { AppUpdateState } from '@core/shared/types/AppUpdateState';
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater, type UpdateDownloadedEvent, type UpdateInfo } from 'electron-updater';

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const SUCCESS_MESSAGE = 'Sucesso';

const createInitialState = (): AppUpdateState => ({
  status: 'idle',
  version: null,
  releaseName: null,
  releaseNotes: null,
  percent: null,
  transferredBytes: null,
  totalBytes: null,
  bytesPerSecond: null,
  error: null,
});

export class AutoUpdateService {
  private state: AppUpdateState = createInitialState();
  private checkInterval: NodeJS.Timeout | null = null;
  private hasStarted = false;
  private readonly updatesEnabled: boolean;

  constructor() {
    this.updatesEnabled = this.shouldEnableUpdates();
  }

  public start(): void {
    if (this.hasStarted) {
      return;
    }

    this.hasStarted = true;
    this.registerIpcHandlers();

    if (!this.updatesEnabled) {
      return;
    }

    this.configureUpdater();
    this.registerUpdaterEvents();
    void this.checkForUpdates();
    this.checkInterval = setInterval(() => {
      void this.checkForUpdates();
    }, UPDATE_CHECK_INTERVAL_MS);

    app.on('before-quit', () => {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
    });
  }

  private shouldEnableUpdates(): boolean {
    if (!app.isPackaged) {
      return false;
    }

    return !this.isSnapEnvironment();
  }

  private isSnapEnvironment(): boolean {
    return Boolean(process.env['SNAP'] || process.env['SNAP_NAME'] || process.env['SNAP_REVISION']);
  }

  private configureUpdater(): void {
    autoUpdater.logger = console;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
  }

  private registerUpdaterEvents(): void {
    autoUpdater.on('checking-for-update', () => {
      this.updateState({
        status: 'checking',
        error: null,
        percent: null,
        transferredBytes: null,
        totalBytes: null,
        bytesPerSecond: null,
      });
    });

    autoUpdater.on('update-available', (updateInfo) => {
      this.updateState({
        ...this.mapUpdateInfo(updateInfo),
        status: 'available',
        error: null,
        percent: null,
        transferredBytes: null,
        totalBytes: null,
        bytesPerSecond: null,
      });
    });

    autoUpdater.on('update-not-available', () => {
      this.updateState({
        ...createInitialState(),
        status: 'not-available',
      });
    });

    autoUpdater.on('download-progress', (progressInfo) => {
      this.updateState({
        status: 'downloading',
        percent: progressInfo.percent,
        transferredBytes: progressInfo.transferred,
        totalBytes: progressInfo.total,
        bytesPerSecond: progressInfo.bytesPerSecond,
        error: null,
      });
    });

    autoUpdater.on('update-downloaded', (event) => {
      this.updateState({
        ...this.mapUpdateInfo(event),
        status: 'downloaded',
        percent: 100,
        transferredBytes: null,
        totalBytes: null,
        bytesPerSecond: null,
        error: null,
      });
    });

    autoUpdater.on('error', (error) => {
      this.updateState({
        status: 'error',
        error: error.message,
        percent: null,
        transferredBytes: null,
        totalBytes: null,
        bytesPerSecond: null,
      });
    });
  }

  private registerIpcHandlers(): void {
    ipcMain.handle(E_IPCChannels.APP_UPDATE_GET_STATE, async () => {
      return this.success(this.state);
    });

    ipcMain.handle(E_IPCChannels.APP_UPDATE_CHECK, async () => {
      try {
        await this.checkForUpdates();
        return this.success(this.state);
      } catch (error) {
        return this.failure(error, this.state);
      }
    });

    ipcMain.handle(E_IPCChannels.APP_UPDATE_DOWNLOAD, async () => {
      try {
        if (!this.updatesEnabled) {
          return this.success(this.state);
        }

        await autoUpdater.downloadUpdate();
        return this.success(this.state);
      } catch (error) {
        return this.failure(error, this.state);
      }
    });

    ipcMain.handle(E_IPCChannels.APP_UPDATE_INSTALL, async () => {
      try {
        if (!this.updatesEnabled) {
          return this.success(this.state);
        }

        autoUpdater.quitAndInstall();
        return this.success(this.state);
      } catch (error) {
        return this.failure(error, this.state);
      }
    });
  }

  private async checkForUpdates(): Promise<void> {
    if (!this.updatesEnabled) {
      return;
    }

    await autoUpdater.checkForUpdates();
  }

  private mapUpdateInfo(updateInfo: UpdateInfo | UpdateDownloadedEvent): Partial<AppUpdateState> {
    return {
      version: updateInfo.version ?? null,
      releaseName: updateInfo.releaseName ?? updateInfo.version ?? null,
      releaseNotes: this.formatReleaseNotes(updateInfo.releaseNotes),
    };
  }

  private formatReleaseNotes(releaseNotes: UpdateInfo['releaseNotes']): string | null {
    if (typeof releaseNotes === 'string') {
      const trimmed = releaseNotes.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    if (!Array.isArray(releaseNotes)) {
      return null;
    }

    const content = releaseNotes
      .map((entry) => {
        if (entry?.note) {
          return entry.note.trim();
        }

        return '';
      })
      .filter(Boolean)
      .join('\n\n');

    return content.length > 0 ? content : null;
  }

  private updateState(nextState: Partial<AppUpdateState>): void {
    this.state = {
      ...this.state,
      ...nextState,
    };

    this.broadcastState();
  }

  private broadcastState(): void {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send(E_OnIPCChannels.APP_UPDATE_STATE_CHANGED, this.state);
    });
  }

  private success<T>(data: T): ApiResult<T> {
    return {
      data,
      success: true,
      message: SUCCESS_MESSAGE,
    };
  }

  private failure<T>(error: unknown, data: T): ApiResult<T> {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const reports: Report[] = [{ propName: 'appUpdate', message }];

    return {
      data,
      success: false,
      errors: reports,
      message,
    };
  }
}
