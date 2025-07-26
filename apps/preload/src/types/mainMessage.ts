export interface MainMessage {
  /** New user joined */
  newUserJoin: (userID: number) => string
}
