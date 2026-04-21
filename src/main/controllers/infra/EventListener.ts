import { IpcMain, ipcMain, IpcMainEvent } from 'electron';

export type Middleware = (event: IpcMainEvent, data: any, next: () => void) => void;

export class EventListener {
  private event: IpcMain;
  private static isToCallNext: boolean;

  constructor() {
    this.event = ipcMain;
    EventListener.isToCallNext = false;
  }

  private next(): void {
    EventListener.isToCallNext = true;
  }

  public on(channel: string, ...callbacks: Middleware[]): void {
    this.event.on(channel, async (event, data) => {
      for (const callback of callbacks) {
        await callback(event, data, this.next);
        if (!EventListener.isToCallNext) break;
        EventListener.isToCallNext = false;
      }
    });
  }
}
