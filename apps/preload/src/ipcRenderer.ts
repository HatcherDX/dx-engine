import type { IpcRendererEvent } from 'electron'
import { ipcRenderer } from 'electron'
import type { MessageObj } from './types/index.js'

export class IPCRenderer<
  MessageType extends MessageObj<MessageType>,
  BackgroundMessageType extends MessageObj<BackgroundMessageType>,
> {
  private channel: string
  private listeners: Partial<
    Record<keyof BackgroundMessageType, ((...args: unknown[]) => unknown)[]>
  > = {}

  constructor(channel = 'IPC-bridge') {
    this.channel = channel

    this.bindMessage()
  }

  send = <T extends keyof MessageType>(
    name: T,
    ...payload: Parameters<MessageType[T]>
  ): Promise<Awaited<ReturnType<MessageType[T]>>> => {
    return new Promise((resolve, reject) => {
      // console.log("send", name, payload);
      ipcRenderer
        .invoke(this.channel, {
          name,
          payload,
        })
        .then((data) => {
          if (data.type === 'success') {
            return resolve(data.result)
          } else {
            // If main process returns error, display it on UI here
            console.log(data.error)
            return reject(data.error)
          }
        })
        .catch((err) => {
          reject(err)
        })
    })
  }

  on = <T extends keyof BackgroundMessageType>(
    name: T,
    fn: (...args: Parameters<BackgroundMessageType[T]>) => void
  ): (() => void) => {
    this.listeners[name] ??= []

    this.listeners[name].push(fn as (...args: unknown[]) => unknown)

    // Provide removal method
    return () => {
      if (
        this.listeners[name]?.includes(fn as (...args: unknown[]) => unknown)
      ) {
        const index = this.listeners[name].indexOf(
          fn as (...args: unknown[]) => unknown
        )
        this.listeners[name].splice(index, 1)
      }
    }
  }

  private handleReceivingMessage(
    event: IpcRendererEvent,
    payloadData: { name: keyof BackgroundMessageType; payload: unknown[] }
  ) {
    const { name, payload } = payloadData

    if (this.listeners[name]) {
      for (const fn of this.listeners[name]) {
        fn(...payload)
      }
    }
  }

  private bindMessage() {
    ipcRenderer.on(this.channel, this.handleReceivingMessage.bind(this))
  }
}
