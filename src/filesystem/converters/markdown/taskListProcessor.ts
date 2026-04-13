/**
 * Converte <li> com prefixo "[ ] " ou "[x] " em task_item DOM.
 *
 * Suporta listas tight (sem <p>) e loose (com <p>):
 * Tight: <li>[ ] texto</li>
 * Loose: <li><p>[ ] texto</p></li>
 *
 * Deve rodar ANTES do PMDOMParser para que o parseDOM
 * do schema encontre data-type="task_item".
 */
export function processTaskLists(root: HTMLElement): void {
  root.querySelectorAll('li').forEach(li => {
    if (li.getAttribute('data-type') === 'task_item') return

    const firstContentEl = li.querySelector('p') ?? li
    
    // BUG FIX: Em vez de destruir todo o conteúdo interno pegando o textContent geral (o que destruía os Wiki Links),
    // navegamos apenas até o PRIMEIRO nó de texto puro para extrair o '[ ] ' ou '[x] '
    let firstTextNode: Node | null = null;
    const walker = document.createTreeWalker(firstContentEl, NodeFilter.SHOW_TEXT, null);
    
    while (walker.nextNode()) {
      if (walker.currentNode.textContent?.trim()) {
        firstTextNode = walker.currentNode;
        break;
      }
    }

    if (!firstTextNode) return

    const rawText = firstTextNode.textContent ?? ''
    const isUnchecked = rawText.startsWith('[ ] ')
    const isChecked = rawText.startsWith('[x] ') || rawText.startsWith('[X] ')
    
    if (!isUnchecked && !isChecked) return

    const checked = isChecked
    
    // Remove apenas os 4 caracteres "[ ] " do nó de texto, mantendo os outros nós ilesos!
    firstTextNode.textContent = rawText.slice(4)

    li.setAttribute('data-type', 'task_item')
    li.setAttribute('data-checked', checked ? 'true' : 'false')
    li.className = `task-item${checked ? ' task-item--checked' : ''}`

    const checkboxWrap = document.createElement('span')
    checkboxWrap.className = 'task-checkbox-wrap'
    checkboxWrap.setAttribute('contenteditable', 'false')
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'task-checkbox'
    if (checked) checkbox.setAttribute('checked', '')
    checkboxWrap.appendChild(checkbox)

    const contentWrap = document.createElement('span')
    contentWrap.className = 'task-content'
    while (li.firstChild) contentWrap.appendChild(li.firstChild)

    li.appendChild(checkboxWrap)
    li.appendChild(contentWrap)

    const parentUl = li.parentElement
    if (parentUl?.tagName === 'UL') {
      parentUl.setAttribute('data-type', 'task_list')
      parentUl.className = 'task-list'
    }
  })
}