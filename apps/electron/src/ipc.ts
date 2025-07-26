import type { MainMessage, RenderMessage } from '@hatcherdx/dx-engine-preload'
import { IPCMain } from '@hatcherdx/dx-engine-preload/main'

export const ipcMain = new IPCMain<RenderMessage, MainMessage>()

ipcMain.on('getUsernameById', (userID) => {
  console.log('getUsernameById', `User ID: ${userID}`)
  return 'User Name'
})

setTimeout(() => {
  ipcMain.send('newUserJoin', 1)
}, 5000)
