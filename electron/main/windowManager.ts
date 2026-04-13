import { app, BrowserWindow, shell, ipcMain, session, Menu, dialog } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'

export class WindowManager {
  private mainWindow: BrowserWindow | null = null

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

  createMainWindow(): BrowserWindow {
    this.mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
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

    this.mainWindow.on('ready-to-show', () => {
      this.mainWindow!.show()
    })

    // Fallback: show window after 5s even if renderer hasn't loaded
    const fallbackTimer = setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed() && !this.mainWindow.isVisible()) {
        this.mainWindow.show()
        this.mainWindow.webContents.openDevTools()
      }
    }, 5000)

    this.mainWindow.on('show', () => clearTimeout(fallbackTimer))

    // Log renderer errors to help debug
    this.mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
      const msg = `Renderer failed to load: ${code} ${desc}`
      try { writeFileSync(join(app.getPath('userData'), 'crash.log'), msg) } catch {}
      dialog.showErrorBox('NoteChaps - Erro', msg)
    })

    this.mainWindow.webContents.on('render-process-gone', (_e, details) => {
      const msg = `Renderer crashed: ${details.reason}`
      try { writeFileSync(join(app.getPath('userData'), 'crash.log'), msg) } catch {}
      dialog.showErrorBox('NoteChaps - Erro', msg)
    })

    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    const ses = this.mainWindow.webContents.session
    ses.setSpellCheckerEnabled(true)
    ses.setSpellCheckerLanguages(['pt-BR'])

    this.mainWindow.webContents.on('context-menu', (_event, params) => {
      const win = this.mainWindow
      if (!win) return

      const misspelledWord = (params.misspelledWord || '').trim()
      const suggestions = (params.dictionarySuggestions || [])
        .map((s: string) => s.trim())
        .filter((s: string) => Boolean(s))
        .slice(0, 6)

      const menuTemplate: Electron.MenuItemConstructorOptions[] = []

      // Sugestões ortográficas no topo
      if (misspelledWord) {
        if (suggestions.length > 0) {
          suggestions.forEach((word: string) => {
            menuTemplate.push({
              label: word,
              click: () => win.webContents.replaceMisspelling(word)
            })
          })
        } else {
          menuTemplate.push({ label: 'Sem sugestões', enabled: false })
        }
        menuTemplate.push({
          label: `Adicionar "${misspelledWord}" ao dicionário`,
          click: () => ses.addWordToSpellCheckerDictionary(misspelledWord)
        })
        menuTemplate.push({ type: 'separator' })
      }

      // Itens de edição padrão
      menuTemplate.push(
        { label: 'Recortar', role: 'cut', enabled: params.editFlags.canCut },
        { label: 'Copiar', role: 'copy', enabled: params.editFlags.canCopy },
        { label: 'Colar', role: 'paste', enabled: params.editFlags.canPaste },
        { type: 'separator' },
        { label: 'Selecionar tudo', role: 'selectAll' }
      )

      Menu.buildFromTemplate(menuTemplate).popup({ window: win })
    })

    if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return this.mainWindow
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }
}
