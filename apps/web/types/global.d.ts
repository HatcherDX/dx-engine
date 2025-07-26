import type { ElectronAPI } from '@hatcherdx/dx-engine-preload'

declare global {
  // eslint-disable-next-line
  var electronAPI: ElectronAPI
}
