import { app, BrowserWindow, session, ipcMain } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { extname, join } from 'path'
import { cleanupFileSystemWatchers, setupFileSystemHandlers } from './fileSystem'
import { buildMenu } from './menuBuilder'
import { WindowManager } from './windowManager'

/** Extract .md file path from process argv (used by file association / "Open with"). */
function getFileFromArgs(argv: string[]): string | null {
  // Skip the electron exe itself and any flags.
  for (const arg of argv.slice(1)) {
    if (!arg.startsWith('-') && extname(arg).toLowerCase() === '.md') {
      return arg
    }
  }
  return null
}

/**
 * Use LOCALAPPDATA as userData on Windows to avoid silent startup failures
 * caused by restricted/roaming profiles.
 */
function configureUserDataPath(): void {
  const localAppData = process.env.LOCALAPPDATA
  if (!localAppData) return

  const preferredPath = join(localAppData, 'NoteChaps')
  try {
    if (!existsSync(preferredPath)) {
      mkdirSync(preferredPath, { recursive: true })
    }
    app.setPath('userData', preferredPath)
  } catch (error) {
    console.warn('[boot] Failed to configure userData path:', error)
  }
}

let pendingFilePath: string | null = null

function main(): void {
  configureUserDataPath()
  app.setAppUserModelId('com.notechaps.app')

  // Single instance lock: if another instance tries to open, focus existing window.
  const hasSingleInstanceLock = app.requestSingleInstanceLock()
  if (!hasSingleInstanceLock) {
    console.warn('[boot] Unable to acquire single instance lock. Continuing startup without lock.')
  } else {
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
  }

  // Check if launched with a file argument.
  pendingFilePath = getFileFromArgs(process.argv)

  app.whenReady().then(() => {
    // Keep spellchecker enabled at boot.
    session.defaultSession.setSpellCheckerEnabled(true)
    session.defaultSession.setSpellCheckerLanguages(
      Array.from(new Set([app.getLocale(), 'pt-BR', 'en-US'].filter(Boolean).map(l => l.replace('_', '-'))))
    )

    const windowManager = new WindowManager()
    const mainWindow = windowManager.createMainWindow()

    setupFileSystemHandlers()
    buildMenu(mainWindow)

    // When renderer is ready, send pending file path.
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

  app.on('before-quit', () => {
    cleanupFileSystemWatchers()
  })
}

main()
