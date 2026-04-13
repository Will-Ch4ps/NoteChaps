import { Menu, BrowserWindow, app } from 'electron'

export function buildMenu(win: BrowserWindow): void {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    }] : []),
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Novo arquivo',
          accelerator: 'CmdOrCtrl+N',
          click: () => win.webContents.send('menu:newFile')
        },
        {
          label: 'Abrir vault...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => win.webContents.send('menu:openVault')
        },
        {
          label: 'Abrir arquivo...',
          accelerator: 'CmdOrCtrl+O',
          click: () => win.webContents.send('menu:openFile')
        },
        { type: 'separator' },
        {
          label: 'Salvar',
          accelerator: 'CmdOrCtrl+S',
          click: () => win.webContents.send('menu:save')
        },
        {
          label: 'Salvar como...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => win.webContents.send('menu:saveAs')
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo' as const, label: 'Desfazer' },
        { role: 'redo' as const, label: 'Refazer' },
        { type: 'separator' },
        { role: 'cut' as const, label: 'Recortar' },
        { role: 'copy' as const, label: 'Copiar' },
        { role: 'paste' as const, label: 'Colar' },
        { role: 'selectAll' as const, label: 'Selecionar tudo' },
        { type: 'separator' },
        {
          label: 'Verificação ortográfica',
          type: 'checkbox',
          checked: true,
          click: (menuItem) => {
            const enabled = !!menuItem.checked
            win.webContents.session.setSpellCheckerEnabled(enabled)
            // opcional: notificar renderer se no futuro quiser refletir estado na UI
            win.webContents.send('menu:spellcheckToggled', enabled)
          }
        }
      ]
    },
    {
      label: 'Visualizar',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { type: 'separator' },
        { role: 'resetZoom' as const, label: 'Zoom padrão' },
        { role: 'zoomIn' as const, label: 'Aumentar zoom' },
        { role: 'zoomOut' as const, label: 'Diminuir zoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' as const, label: 'Tela cheia' },
        { role: 'toggleDevTools' as const, label: 'Dev Tools' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
