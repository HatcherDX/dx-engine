import type { IpcMainInvokeEvent } from 'electron'
import { BrowserWindow, ipcMain } from 'electron'
import type { MessageObj } from './types/index.js'

export class IPCMain<
  MessageType extends MessageObj<MessageType>,
  BackgroundMessageType extends MessageObj<BackgroundMessageType>,
> {
  private channel: string
  private listeners: Partial<
    Record<keyof MessageType, (...args: never[]) => unknown>
  > = {}

  constructor(channel = 'IPC-bridge') {
    this.channel = channel

    this.bindMessage()
  }

  on<T extends keyof MessageType>(
    name: T,
    fn: (...args: Parameters<MessageType[T]>) => ReturnType<MessageType[T]>
  ): void {
    console.log('on', name)
    if (this.listeners[name])
      throw new Error(`Message handler ${String(name)} already exists`)
    this.listeners[name] = fn
  }

  off<T extends keyof MessageType>(action: T): void {
    if (this.listeners[action]) {
      delete this.listeners[action]
    }
  }

  async send<T extends keyof BackgroundMessageType>(
    name: T,
    ...payload: Parameters<BackgroundMessageType[T]>
  ): Promise<void> {
    // Get all open windows
    const windows = BrowserWindow.getAllWindows()

    // Send message to each window
    windows.forEach((window) => {
      window.webContents.send(this.channel, {
        name,
        payload,
      })
    })
  }

  private bindMessage() {
    ipcMain.handle(this.channel, this.handleReceivingMessage.bind(this))
  }

  private async handleReceivingMessage(
    event: IpcMainInvokeEvent,
    payload: { name: keyof MessageType; payload: unknown[] }
  ) {
    try {
      // console.log("handleReceivingMessage", payload);
      if (this.listeners[payload.name]) {
        const res = await this.listeners[payload.name]?.(
          ...(payload.payload as never[])
        )
        return {
          type: 'success',
          result: res,
        }
      } else {
        throw new Error(`Unknown IPC message ${String(payload.name)}`)
      }
    } catch (e: unknown) {
      return {
        type: 'error',
        error: e instanceof Error ? e.message : String(e),
      }
    }
  }
}
