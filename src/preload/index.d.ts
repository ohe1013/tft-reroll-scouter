import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    ocr: {
      recognizeDataUrl(dataUrl: string): Promise<string>
    }
  }
}
