import { useCallback } from 'react'
import { useTabsStore } from '../../../store/tabsStore'
import { useFilesStore } from '../../../store/filesStore'
import { FileSystemService } from '../../../filesystem/FileSystemService'
import { FileNode } from '../../../shared/types'
import { base64ToText, dirname } from '../../../shared/utils'

/**
 * BUG FIX: Wiki-link file creation in correct folder
 * 
 * PROBLEMA: Arquivos criados via [[wiki-link]] eram salvos na raiz do vault
 * em vez da mesma pasta do documento que criou o link.
 * 
 * SOLUÇÃO: Sempre usa dirname(activeTab.filePath) como pasta base,
 * garantindo que links mantenham contexto de localização.
 * 
 * Estratégia de resolução (estilo Obsidian):
 *  1. Aba já aberta com esse nome? → ativa
 *  2. Busca em TODO o vault por um arquivo chamado "target.md"
 *  3. Se encontrou: abre o arquivo
 *  4. Se não encontrou: cria "target.md" NA MESMA PASTA do documento atual
 */
export function useWikiNavigation() {
  return useCallback(async (target: string) => {
    const { tabs, setActiveTab, openTab } = useTabsStore.getState()
    const { vaultPath, tree } = useFilesStore.getState()

    // 1. Aba já aberta?
    const existing = tabs.find(t =>
      t.title === target ||
      t.title === `${target}.md` ||
      t.title.replace(/\.[^.]+$/, '') === target
    )
    if (existing) { 
      setActiveTab(existing.id)
      return 
    }

    if (!window.electronAPI) {
      openTab(`untitled:${target}`, `${target}.md`, 'md', `# ${target}\n\n`)
      return
    }

    // BUG FIX: Determina pasta base ANTES de qualquer operação
    const activeTab = tabs.find(t => t.id === useTabsStore.getState().activeTabId)
    
    let baseDir: string
    if (activeTab && !activeTab.filePath.startsWith('untitled:')) {
      // Documento salvo → usa a pasta dele
      baseDir = dirname(activeTab.filePath)
    } else if (vaultPath) {
      // Documento não salvo mas vault aberto → usa raiz do vault
      baseDir = vaultPath
    } else {
      // Sem vault → cria untitled
      openTab(`untitled:${target}`, `${target}.md`, 'md', `# ${target}\n\n`)
      return
    }

    console.log(`[WikiNav] Criando "${target}.md" em: ${baseDir}`)

    // 2. Busca no vault inteiro (estilo Obsidian)
    const found = findInVault(tree, target)

    if (found) {
      // Arquivo existe → abre
      try {
        const data = await window.electronAPI.openFile(found.path)
        if (data) {
          openTab(data.path, data.name, 'md', base64ToText(data.content))
        }
      } catch (err) {
        console.error('[WikiNav] Erro ao abrir arquivo existente:', err)
        openTab(`untitled:${target}`, `${target}.md`, 'md', `# ${target}\n\n`)
      }
      return
    }

    // 3. Não existe → cria NA MESMA PASTA do documento atual
    try {
      const newPath = await FileSystemService.createFile(baseDir, `${target}.md`)
      const initialContent = `# ${target}\n\n`
      await FileSystemService.saveRaw(newPath, initialContent)
      
      openTab(newPath, `${target}.md`, 'md', initialContent)
      
      // Atualiza explorador
      if (vaultPath) {
        const newTree = await FileSystemService.loadVaultTree(vaultPath)
        useFilesStore.getState().setVault(vaultPath, newTree)
      }
      
      console.log(`[WikiNav] Arquivo criado com sucesso: ${newPath}`)
    } catch (err) {
      console.error('[WikiNav] Erro ao criar arquivo:', err)
      openTab(`untitled:${target}`, `${target}.md`, 'md', `# ${target}\n\n`)
    }
  }, [])
}

/**
 * Busca recursiva no vault (case-insensitive)
 */
function findInVault(nodes: FileNode[], target: string): FileNode | null {
  const needle = target.toLowerCase().replace(/\.md$/, '')
  
  for (const node of nodes) {
    if (node.type === 'file') {
      const name = node.name.toLowerCase().replace(/\.md$/, '')
      if (name === needle) return node
    }
    if (node.children) {
      const found = findInVault(node.children, target)
      if (found) return found
    }
  }
  
  return null
}
