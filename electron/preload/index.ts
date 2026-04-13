import { contextBridge, ipcRenderer } from 'electron'

/**
 * BUG FIX: O onMenuAction original criava wrappers anônimos que impossibilitavam
 * a remoção posterior. Agora armazena o mapeamento callback → wrapper para que
 * removeMenuListener funcione corretamente.
 *
 * Padrão baseado em: Event listener cleanup best practices
 */
const menuListenerMap = new Map<string, Map<Function, (...args: any[]) => void>>()

contextBridge.exposeInMainWorld('electronAPI', {
  // File System
  openVault: () => ipcRenderer.invoke('fs:openVault'),
  openFile: (filePath?: string) => ipcRenderer.invoke('fs:openFile', filePath),
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:saveFile', filePath, content),
  saveFileAs: (content: string, defaultName: string) => ipcRenderer.invoke('fs:saveFileAs', content, defaultName),
  createFile: (dir: string, name: string) => ipcRenderer.invoke('fs:createFile', dir, name),
  createFolder: (dir: string, name: string) => ipcRenderer.invoke('fs:createFolder', dir, name),
  deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),
  renameFile: (oldPath: string, newName: string) => ipcRenderer.invoke('fs:renameFile', oldPath, newName),
  readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
  watchFile: (filePath: string) => ipcRenderer.invoke('fs:watchFile', filePath),
  unwatchFile: (filePath: string) => ipcRenderer.invoke('fs:unwatchFile', filePath),
  moveFile: (srcPath: string, destDir: string) => ipcRenderer.invoke('fs:moveFile', srcPath, destDir),
  watchVault: (vaultPath: string) => ipcRenderer.invoke('fs:watchVault', vaultPath),
  unwatchVault: () => ipcRenderer.invoke('fs:unwatchVault'),
  onVaultChanged: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('fs:vaultChanged', handler)
    return () => ipcRenderer.removeListener('fs:vaultChanged', handler)
  },

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),

  // App
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  setTitleBarOverlay: (options: { color: string; symbolColor: string }) =>
    ipcRenderer.invoke('app:setTitleBarOverlay', options),

  // Claude AI
  claudeSend: (message: string, context?: string) =>
    ipcRenderer.invoke('claude:send', message, context),
  claudeAbort: () => ipcRenderer.invoke('claude:abort'),
  onClaudeChunk: (cb: (text: string) => void) => {
    const handler = (_: unknown, text: string) => cb(text)
    ipcRenderer.on('claude:chunk', handler)
    return () => ipcRenderer.removeListener('claude:chunk', handler)
  },
  onClaudeError: (cb: (msg: string) => void) => {
    const handler = (_: unknown, msg: string) => cb(msg)
    ipcRenderer.on('claude:error', handler)
    return () => ipcRenderer.removeListener('claude:error', handler)
  },
  onClaudeDone: (cb: (code: number | null) => void) => {
    const handler = (_: unknown, code: number | null) => cb(code)
    ipcRenderer.on('claude:done', handler)
    return () => ipcRenderer.removeListener('claude:done', handler)
  },

  // Listeners (Main → Renderer)
  onFileChanged: (callback: (filePath: string) => void) => {
    ipcRenderer.on('fs:fileChanged', (_event, filePath) => callback(filePath))
  },

  onMenuAction: (action: string, callback: () => void) => {
    const channel = `menu:${action}`
    const wrapper = () => callback()

    if (!menuListenerMap.has(channel)) {
      menuListenerMap.set(channel, new Map())
    }
    menuListenerMap.get(channel)!.set(callback, wrapper)

    ipcRenderer.on(channel, wrapper)
  },

  removeMenuListener: (action: string, callback: () => void) => {
    const channel = `menu:${action}`
    const channelMap = menuListenerMap.get(channel)
    if (!channelMap) return

    const wrapper = channelMap.get(callback)
    if (wrapper) {
      ipcRenderer.removeListener(channel, wrapper)
      channelMap.delete(callback)
    }
  },

})
