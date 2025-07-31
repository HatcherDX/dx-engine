export interface RenderMessage {
  /** Get username by ID */
  getUsernameById: (userID: number) => string
  /** Get system information */
  getOsInfo: () => string
  /** Window control functions */
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  /** Get window state */
  isWindowMaximized: () => boolean
}
