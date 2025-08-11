import { ipcMain } from 'electron'
import * as keytar from 'keytar'

const SERVICE_NAME = 'tft-scout'
const ACCOUNT_NAME = 'riot-api-key'

ipcMain.handle('riot-key:set', async (_event, key: string) => {
  await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, key)
  return true
})

ipcMain.handle('riot-key:get', async () => {
  return await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME)
})

ipcMain.handle('riot-key:delete', async () => {
  await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME)
  return true
})
