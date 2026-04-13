import { app, BrowserWindow, session } from 'electron'
import { WindowManager } from './windowManager'
import { setupFileSystemHandlers } from './fileSystem'
import { buildMenu } from './menuBuilder'

function main(): void {
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
