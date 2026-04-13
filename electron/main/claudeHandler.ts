import { ipcMain, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'

let activeProcess: ChildProcess | null = null

export function setupClaudeHandlers(): void {

  // Send a message to claude CLI and stream back the response
  ipcMain.handle('claude:send', async (event, message: string, context?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { error: 'No window' }

    // Kill any running process
    if (activeProcess) {
      activeProcess.kill()
      activeProcess = null
    }

    // Build the prompt — prepend context (current doc) if provided
    const prompt = context
      ? `Contexto do documento atual:\n\`\`\`\n${context}\n\`\`\`\n\nPergunta: ${message}`
      : message

    // Try to find claude in PATH
    const claudeCmd = process.platform === 'win32' ? 'claude.cmd' : 'claude'

    let responded = false

    try {
      activeProcess = spawn(claudeCmd, ['--print', prompt], {
        shell: true,
        env: { ...process.env }
      })

      activeProcess.stdout?.on('data', (data: Buffer) => {
        responded = true
        win.webContents.send('claude:chunk', data.toString())
      })

      activeProcess.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString()
        // claude CLI sometimes writes status info to stderr — only treat as error if no stdout yet
        if (!responded) {
          win.webContents.send('claude:error', msg)
        }
      })

      activeProcess.on('close', (code) => {
        activeProcess = null
        win.webContents.send('claude:done', code)
      })

      activeProcess.on('error', (err) => {
        activeProcess = null
        win.webContents.send('claude:error', `Não foi possível iniciar o Claude CLI: ${err.message}\n\nCertifique-se de que "claude" está instalado e disponível no PATH.`)
        win.webContents.send('claude:done', 1)
      })

      return { ok: true }
    } catch (err) {
      return { error: String(err) }
    }
  })

  // Abort current streaming response
  ipcMain.handle('claude:abort', async () => {
    if (activeProcess) {
      activeProcess.kill()
      activeProcess = null
    }
  })
}
