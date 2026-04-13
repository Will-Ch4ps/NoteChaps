import { app, BrowserWindow, session, ipcMain } from 'electron'
import { WindowManager } from './windowManager'
import { setupFileSystemHandlers } from './fileSystem'
import { buildMenu } from './menuBuilder'
import { extname } from 'path'

/** Extract .md file path from process argv (used by file association / "Open with"). */
function getFileFromArgs(argv: string[]): string | null {
  // Skip the electron exe itself and any flags
  for (const arg of argv.slice(1)) {
    if (!arg.startsWith('-') && extname(arg).toLowerCase() === '.md') {
      return arg
    }
  }
  return null
}

let pendingFilePath: string | null = null

function main(): void {
  // Single instance lock — if another instance tries to open, focus the existing window
  const gotLock = app.requestSingleInstanceLock()
  if (!gotLock) {
    app.quit()
    return
  }

  app.on('second-instance', (_event, argv) => {
    const filePath = getFileFromArgs(argv)
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
      if (filePath) {
        win.webContents.send('app:openFile', filePath)
      }
    }
  })

  // Check if launched with a file argument
  pendingFilePath = getFileFromArgs(process.argv)

  app.whenReady().then(() => {
    // Garante spellchecker ativo no boot (especialmente Windows)
    session.defaultSession.setSpellCheckerEnabled(true)
    session.defaultSession.setSpellCheckerLanguages(
      Array.from(new Set([app.getLocale(), 'pt-BR', 'en-US'].filter(Boolean).map(l => l.replace('_', '-'))))
    )

    const windowManager = new WindowManager()
    const mainWindow = windowManager.createMainWindow()

    setupFileSystemHandlers()
    buildMenu(mainWindow)

    // When the renderer is ready, send the pending file path
    ipcMain.handle('app:getPendingFile', () => {
      const fp = pendingFilePath
      pendingFilePath = null
      return fp
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createMainWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}

main()
