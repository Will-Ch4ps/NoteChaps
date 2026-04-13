import { schema } from '../core/schema'
import { Node as PMNode } from 'prosemirror-model'

export interface TableTemplate {
  id: string
  label: string
  description: string
  slashCommand: string
  headers: string[]
  rows: string[][]
}

export const tableTemplates: TableTemplate[] = [
  {
    id: 'tabela-api',
    label: 'Documentação de API',
    description: 'Endpoints REST com método, auth e descrição',
    slashCommand: '/tabela-api',
    headers: ['Endpoint', 'Método', 'Auth', 'Descrição'],
    rows: [
      ['/api/usuarios', 'GET', 'Bearer', 'Lista todos os usuários'],
      ['/api/usuarios/:id', 'GET', 'Bearer', 'Busca usuário por ID'],
      ['/api/usuarios', 'POST', 'Bearer', 'Cria novo usuário'],
      ['/api/usuarios/:id', 'PUT', 'Bearer', 'Atualiza usuário'],
      ['/api/usuarios/:id', 'DELETE', 'Bearer', 'Remove usuário'],
    ]
  },
  {
    id: 'tabela-db',
    label: 'Campos do Banco de Dados',
    description: 'Tabela de campos com tipo, nullable e descrição',
    slashCommand: '/tabela-db',
    headers: ['Campo', 'Tipo', 'Nullable', 'Padrão', 'Descrição'],
    rows: [
      ['id', 'INTEGER', 'Não', 'AUTO_INCREMENT', 'Chave primária'],
      ['nome', 'VARCHAR(255)', 'Não', '-', 'Nome completo'],
      ['email', 'VARCHAR(255)', 'Não', '-', 'Email único'],
      ['criado_em', 'DATETIME', 'Não', 'NOW()', 'Data de criação'],
      ['atualizado_em', 'DATETIME', 'Sim', 'NULL', 'Última atualização'],
    ]
  },
  {
    id: 'tabela-decisao',
    label: 'Matriz de Decisão',
    description: 'Comparação de opções por critério',
    slashCommand: '/tabela-decisao',
    headers: ['Critério', 'Peso', 'Opção A', 'Opção B', 'Opção C'],
    rows: [
      ['Performance', '30%', '⭐⭐⭐⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐'],
      ['Custo', '25%', '⭐⭐', '⭐⭐⭐⭐⭐', '⭐⭐⭐'],
      ['Manutenção', '20%', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'],
      ['Escalabilidade', '25%', '⭐⭐⭐⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐'],
      ['**Total**', '100%', '**3.8**', '**3.7**', '**4.0**'],
    ]
  },
  {
    id: 'tabela-retro',
    label: 'Retrospectiva',
    description: 'Template de retrospectiva de sprint',
    slashCommand: '/tabela-retro',
    headers: ['O que foi bem', 'O que melhorar', 'Ações', 'Responsável'],
    rows: [
      ['Entrega no prazo', 'Comunicação entre times', 'Daily mais curta', 'Time'],
      ['Cobertura de testes', 'Code review demorado', 'Revisor dedicado por PR', 'Tech Lead'],
      ['Colaboração da equipe', 'Documentação atrasada', 'Doc junto com código', 'Todos'],
    ]
  },
  {
    id: 'tabela-features',
    label: 'Backlog de Features',
    description: 'Lista de funcionalidades com prioridade e status',
    slashCommand: '/tabela-features',
    headers: ['Feature', 'Prioridade', 'Esforço', 'Status', 'Sprint'],
    rows: [
      ['Login com Google', 'Alta', 'M', 'Em progresso', 'Sprint 1'],
      ['Dashboard principal', 'Alta', 'L', 'Backlog', 'Sprint 2'],
      ['Relatórios PDF', 'Média', 'XL', 'Backlog', 'Sprint 3'],
      ['Modo escuro', 'Baixa', 'S', 'Backlog', '-'],
    ]
  },
  {
    id: 'tabela-kanban',
    label: 'Kanban',
    description: 'Quadro de tarefas TODO / IN PROGRESS / DONE',
    slashCommand: '/kanban',
    headers: ['TODO', 'IN PROGRESS', 'REVIEW', 'DONE'],
    rows: [
      ['Tarefa A', 'Tarefa D', 'Tarefa F', 'Tarefa G'],
      ['Tarefa B', 'Tarefa E', '', 'Tarefa H'],
      ['Tarefa C', '', '', 'Tarefa I'],
    ]
  }
]

export function buildTableNode(template: TableTemplate): PMNode {
  const { nodes } = schema

  const makeCell = (text: string, isHeader: boolean) => {
    const cellContent = nodes.paragraph.create(null, text ? schema.text(text) : undefined)
    return isHeader
      ? nodes.table_header.create(null, cellContent)
      : nodes.table_cell.create(null, cellContent)
  }

  const headerRow = nodes.table_row.create(
    null,
    template.headers.map(h => makeCell(h, true))
  )

  const bodyRows = template.rows.map(rowData =>
    nodes.table_row.create(
      null,
      template.headers.map((_, i) => makeCell(rowData[i] ?? '', false))
    )
  )

  return nodes.table.create(null, [headerRow, ...bodyRows])
}
