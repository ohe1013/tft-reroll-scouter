import { contextBridge, ipcRenderer } from 'electron'
// import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    // contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('ocr', {
      recognizeDataUrl: (dataUrl: string) =>
        ipcRenderer.invoke('ocr:recognizeDataUrl', dataUrl) as Promise<string>
    })
    contextBridge.exposeInMainWorld('tft', {
      getLobbyRecent: (params: { gameName: string; tagLine: string; count?: number }) =>
        ipcRenderer.invoke('tft:get-lobby-recent', params),
      getMatchDetail: (matchId: string, puuId: string) =>
        ipcRenderer.invoke('tft:get-match-detail', { matchId, puuId }),
      getUserRecentComps: (params: { puuid: string; count?: number }) =>
        ipcRenderer.invoke('tft:get-user-recent-comps', params)
    })

    contextBridge.exposeInMainWorld('riotKey', {
      set: (key: string) => ipcRenderer.invoke('riot-key:set', key),
      get: () => ipcRenderer.invoke('riot-key:get'),
      delete: () => ipcRenderer.invoke('riot-key:delete')
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  // window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
