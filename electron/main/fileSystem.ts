import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { readFile, writeFile, rename, mkdir } from 'fs/promises'
import { statSync } from 'fs'
import { join, extname, basename, dirname } from 'path'
import { FSWatcher, watch as fsWatch } from 'fs'

const watchers = new Map<string, FSWatcher>()
let vaultWatcher: FSWatcher | null = null
let vaultWatchDebounce: ReturnType<typeof setTimeout> | null = null

export function cleanupFileSystemWatchers(): void {
  for (const watcher of watchers.values()) {
    try {
      watcher.close()
    } catch {
      // ignore
    }
  }
  watchers.clear()

  if (vaultWatchDebounce) {
    clearTimeout(vaultWatchDebounce)
    vaultWatchDebounce = null
  }

  if (vaultWatcher) {
    try {
      vaultWatcher.close()
    } catch {
      // ignore
    }
    vaultWatcher = null
  }
}

export function setupFileSystemHandlers(): void {
  // Open vault (folder picker)
  ipcMain.handle('fs:openVault', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Selecionar pasta do vault'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Open file dialog + read
  ipcMain.handle('fs:openFile', async (_event, filePath?: string) => {
    let targetPath = filePath
    if (!targetPath) {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Markdown', extensions: ['md'] }
        ]
      })
      if (result.canceled || result.filePaths.length === 0) return null
      targetPath = result.filePaths[0]
    }
    const content = await readFile(targetPath)
    const stat = statSync(targetPath)
    return {
      path: targetPath,
      name: basename(targetPath),
      ext: extname(targetPath).slice(1),
      content: content.toString('base64'),
      mtime: stat.mtime.toISOString(),
      ctime: stat.birthtime.toISOString()
    }
  })

  // Save file
  ipcMain.handle('fs:saveFile', async (_event, filePath: string, content: string) => {
    const buffer = Buffer.from(content, 'base64')
    await writeFile(filePath, buffer)
    return true
  })

  // Save as (dialog)
  ipcMain.handle('fs:saveFileAs', async (_event, content: string, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [
        { name: 'Markdown', extensions: ['md'] }
      ]
    })
    if (result.canceled || !result.filePath) return null
    const buffer = Buffer.from(content, 'base64')
    await writeFile(result.filePath, buffer)
    return result.filePath
  })

  // Create file
  ipcMain.handle('fs:createFile', async (_event, dir: string, name: string) => {
    const filePath = join(dir, name)
    await writeFile(filePath, '')
    return filePath
  })

  // Create folder
  ipcMain.handle('fs:createFolder', async (_event, dir: string, name: string) => {
    const folderPath = join(dir, name)
    await mkdir(folderPath, { recursive: true })
    return folderPath
  })

  // Delete file (trash)
  ipcMain.handle('fs:deleteFile', async (_event, filePath: string) => {
    await shell.trashItem(filePath)
    return true
  })

  // Rename file
  ipcMain.handle('fs:renameFile', async (_event, oldPath: string, newName: string) => {
    const newPath = join(dirname(oldPath), newName)
    await rename(oldPath, newPath)
    return newPath
  })

  // Read directory tree
  ipcMain.handle('fs:readDir', async (_event, dirPath: string) => {
    return readDirRecursive(dirPath)
  })

  // Watch file for external changes
  ipcMain.handle('fs:watchFile', async (_event, filePath: string) => {
    if (watchers.has(filePath)) return

    const win = BrowserWindow.getFocusedWindow()
    if (!win) return

    const watcher = fsWatch(filePath, { persistent: true }, () => {
      win.webContents.send('fs:fileChanged', filePath)
    })
    watchers.set(filePath, watcher)
  })

  // Unwatch file
  ipcMain.handle('fs:unwatchFile', async (_event, filePath: string) => {
    const watcher = watchers.get(filePath)
    if (watcher) {
      watcher.close()
      watchers.delete(filePath)
    }
  })

  // Move file to another folder (drag-and-drop)
  ipcMain.handle('fs:moveFile', async (_event, srcPath: string, destDir: string) => {
    const destPath = join(destDir, basename(srcPath))
    await rename(srcPath, destPath)
    return destPath
  })

  // Watch vault directory for external changes
  ipcMain.handle('fs:watchVault', async (_event, vaultPath: string) => {
    if (vaultWatcher) { vaultWatcher.close(); vaultWatcher = null }
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return

    // Usa recursive: true para monitorar todas as subpastas
    vaultWatcher = fsWatch(vaultPath, { recursive: true }, (eventType, filename) => {
      if (vaultWatchDebounce) clearTimeout(vaultWatchDebounce)
      vaultWatchDebounce = setTimeout(() => {
        console.log(`Mudança detectada: ${eventType} - ${filename}`)
        win.webContents.send('fs:vaultChanged')
      }, 600)
    })
  })

  // Stop watching vault
  ipcMain.handle('fs:unwatchVault', async () => {
    if (vaultWatchDebounce) { clearTimeout(vaultWatchDebounce); vaultWatchDebounce = null }
    if (vaultWatcher) { vaultWatcher.close(); vaultWatcher = null }
  })

  // Open external
  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    await shell.openExternal(url)
  })

  // Reveal in Finder/Explorer
  ipcMain.handle('shell:showItemInFolder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  // App version
  ipcMain.handle('app:getVersion', () => {
    const { app } = require('electron')
    return app.getVersion()
  })
}

function readDirRecursive(dirPath: string): FileNode[] {
  const { readdirSync, statSync } = require('fs')
  const ALLOWED_EXTENSIONS = new Set(['.md'])

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true })
    const nodes: FileNode[] = []

    const dirs: FileNode[] = []
    const files: FileNode[] = []

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const fullPath = join(dirPath, entry.name)
      if (entry.isDirectory()) {
        dirs.push({
          name: entry.name,
          path: fullPath,
          type: 'folder',
          children: readDirRecursive(fullPath)
        })
      } else {
        const ext = extname(entry.name)
        if (ALLOWED_EXTENSIONS.has(ext)) {
          files.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
            ext: ext.slice(1)
          })
        }
      }
    }

    dirs.sort((a, b) => a.name.localeCompare(b.name))
    files.sort((a, b) => a.name.localeCompare(b.name))

    return [...dirs, ...files]
  } catch {
    return []
  }
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  ext?: string
  children?: FileNode[]
}
