export interface MainMessage {
  /** New user joined */
  newUserJoin: (userID: number) => string
  /** Platform simulation event from Development menu */
  'simulate-platform': (platform: 'macos' | 'windows' | 'linux') => void
}
