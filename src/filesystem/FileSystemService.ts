import { Node } from 'prosemirror-model'
import { base64ToText, textToBase64 } from '../shared/utils'
import { MarkdownConverter } from './converters/MarkdownConverter'

function getAPI() {
  return window.electronAPI
}

export const FileSystemService = {
  async openVault(): Promise<string | null> {
    return getAPI().openVault()
  },

  async loadVaultTree(vaultPath: string) {
    return getAPI().readDir(vaultPath)
  },

  async openFile(filePath?: string) {
    return getAPI().openFile(filePath)
  },

  async fileToDoc(base64: string): Promise<Node> {
    return MarkdownConverter.toDoc(base64ToText(base64))
  },

  async saveDoc(filePath: string, doc: Node): Promise<boolean> {
    const md = MarkdownConverter.fromDoc(doc)
    return getAPI().saveFile(filePath, textToBase64(md))
  },

  async saveRaw(filePath: string, content: string): Promise<boolean> {
    return getAPI().saveFile(filePath, textToBase64(content))
  },

  async saveAs(doc: Node, defaultName: string): Promise<string | null> {
    const base64 = textToBase64(MarkdownConverter.fromDoc(doc))
    return getAPI().saveFileAs(base64, defaultName)
  },

  async watchFile(filePath: string): Promise<void> {
    return getAPI().watchFile(filePath)
  },
  
  async unwatchFile(filePath: string): Promise<void> {
    return getAPI().unwatchFile(filePath)
  },
  
  async moveFile(srcPath: string, destDir: string): Promise<string> {
    return getAPI().moveFile(srcPath, destDir)
  },
  
  async createFile(dir: string, name: string): Promise<string> {
    return getAPI().createFile(dir, name)
  },
  
  async createFolder(dir: string, name: string): Promise<string> {
    return getAPI().createFolder(dir, name)
  },
  
  async deleteFile(filePath: string): Promise<boolean> {
    return getAPI().deleteFile(filePath)
  },
  
  async renameFile(oldPath: string, newName: string): Promise<string> {
    return getAPI().renameFile(oldPath, newName)
  },
  
  async openExternal(url: string): Promise<void> {
    return getAPI().openExternal(url)
  },
  
  async showItemInFolder(filePath: string): Promise<void> {
    return getAPI().showItemInFolder(filePath)
  },

  // Novo método para sincronizar a árvore de arquivos após mudanças externas
  async syncVaultTree(vaultPath: string): Promise<void> {
    if (!vaultPath) return
    const newTree = await getAPI().readDir(vaultPath)
    // Notifica o sistema sobre mudanças externas
    getAPI().onVaultChanged(() => {})
    return
  }
}
