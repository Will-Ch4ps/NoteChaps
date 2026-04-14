import { app, BrowserWindow, shell, ipcMain, session, Menu, dialog } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'

export class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private startupErrorShown = false

  constructor() {
    ipcMain.handle('spell:addWord', (_event, word: string) => {
      const safe = (word || '').trim()
      if (!safe) return
      session.defaultSession.addWordToSpellCheckerDictionary(safe)
    })

    ipcMain.handle('app:setTitleBarOverlay', (_event, options: { color: string; symbolColor: string }) => {
      if (this.mainWindow && process.platform === 'win32') {
        this.mainWindow.setTitleBarOverlay({ color: options.color, symbolColor: options.symbolColor, height: 40 })
      }
    })
  }

  private revealMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return
    if (!this.mainWindow.isVisible()) this.mainWindow.show()
    if (this.mainWindow.isMinimized()) this.mainWindow.restore()
    this.mainWindow.focus()
  }

  private showStartupError(title: string, details: string): void {
    if (this.startupErrorShown) return
    this.startupErrorShown = true
    console.error(`[startup] ${title}: ${details}`)
    dialog.showErrorBox(title, details)
    this.revealMainWindow()
  }

  private getRendererEntryPath(): string {
    const fromAppPath = join(app.getAppPath(), 'out', 'renderer', 'index.html')
    if (existsSync(fromAppPath)) return fromAppPath
    return join(__dirname, '../renderer/index.html')
  }

  private loadRenderer(): void {
    if (!this.mainWindow) return

    const rendererUrl = process.env['ELECTRON_RENDERER_URL']?.trim()
    if (!app.isPackaged && rendererUrl) {
      this.mainWindow.loadURL(rendererUrl).catch((error: unknown) => {
        this.showStartupError(
          'NoteChaps failed to start',
          `Unable to load dev renderer URL: ${rendererUrl}\n\n${String(error)}`
        )
      })
      return
    }

    const rendererEntry = this.getRendererEntryPath()
    this.mainWindow.loadFile(rendererEntry).catch((error: unknown) => {
      this.showStartupError(
        'NoteChaps failed to start',
        `Unable to load renderer file:\n${rendererEntry}\n\n${String(error)}`
      )
    })
  }

  createMainWindow(): BrowserWindow {
    // Packaged: resources/build/icon.ico
    // Dev:      build/icon.ico from project root
    const iconPath = app.isPackaged
      ? join(process.resourcesPath, 'build', 'icon.ico')
      : join(__dirname, '../../build/icon.ico')

    this.mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
      icon: iconPath,
      titleBarStyle: 'hidden',
      autoHideMenuBar: true,
      titleBarOverlay: {
        color: '#2d2d2d',
        symbolColor: '#aaa',
        height: 40
      },
      trafficLightPosition: { x: 12, y: 16 },
      backgroundColor: '#1a1a1a',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: true
      }
    })

    const createdWindow = this.mainWindow
    const revealFallback = setTimeout(() => {
      if (this.mainWindow === createdWindow) {
        this.revealMainWindow()
      }
    }, 3500)

    createdWindow.once('ready-to-show', () => {
      clearTimeout(revealFallback)
      if (this.mainWindow === createdWindow) {
        this.revealMainWindow()
      }
    })

    createdWindow.on('closed', () => {
      clearTimeout(revealFallback)
      if (this.mainWindow === createdWindow) {
        this.mainWindow = null
      }
    })

    createdWindow.on('unresponsive', () => {
      this.showStartupError('NoteChaps stopped responding', 'The app window became unresponsive during startup.')
    })

    createdWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) return
      this.showStartupError(
        'NoteChaps failed to load',
        `Main window failed to load.\nCode: ${errorCode}\nReason: ${errorDescription}\nURL: ${validatedURL}`
      )
    })

    createdWindow.webContents.on('render-process-gone', (_event, details) => {
      this.showStartupError(
        'NoteChaps renderer crashed',
        `Reason: ${details.reason}\nExit code: ${details.exitCode}`
      )
    })

    createdWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    const ses = createdWindow.webContents.session
    ses.setSpellCheckerEnabled(true)
    ses.setSpellCheckerLanguages(['pt-BR', 'en-US'])

    createdWindow.webContents.on('context-menu', (_event, params) => {
      const win = this.mainWindow
      if (!win) return

      const misspelledWord = (params.misspelledWord || '').trim()
      const suggestions = (params.dictionarySuggestions || [])
        .map((s: string) => s.trim())
        .filter((s: string) => Boolean(s))
        .slice(0, 6)

      const menuTemplate: Electron.MenuItemConstructorOptions[] = []

      if (misspelledWord) {
        if (suggestions.length > 0) {
          suggestions.forEach((word: string) => {
            menuTemplate.push({
              label: word,
              click: () => win.webContents.replaceMisspelling(word)
            })
          })
        } else {
          menuTemplate.push({ label: 'Sem sugestoes', enabled: false })
        }
        menuTemplate.push({
          label: `Adicionar "${misspelledWord}" ao dicionario`,
          click: () => ses.addWordToSpellCheckerDictionary(misspelledWord)
        })
        menuTemplate.push({ type: 'separator' })
      }

      menuTemplate.push(
        { label: 'Recortar', role: 'cut', enabled: params.editFlags.canCut },
        { label: 'Copiar', role: 'copy', enabled: params.editFlags.canCopy },
        { label: 'Colar', role: 'paste', enabled: params.editFlags.canPaste },
        { type: 'separator' },
        { label: 'Selecionar tudo', role: 'selectAll' }
      )

      Menu.buildFromTemplate(menuTemplate).popup({ window: win })
    })

    this.loadRenderer()
    return createdWindow
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }
}
