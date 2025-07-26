export interface RenderMessage {
  /** Get username by ID */
  getUsernameById: (userID: number) => string
  /** Get system information */
  getOsInfo: () => string
}
