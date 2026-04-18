# NoteChaps

Editor desktop de Markdown (Electron + React) com foco em produtividade, organização por vault e edição visual/RAW estável.

## Status Atual

- O NoteChaps voltou a ser **100% Markdown**.
- Toda a camada de `cifra` foi removida deste app para virar um produto separado.
- O novo projeto musical está em: `NoteChapsMusicLab/`.

## Requisitos

- Node.js 20+
- npm 10+
- Windows 10/11

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

## Build de Produção

```bash
npm run build
```

Saída principal:

- `out/main`
- `out/preload`
- `out/renderer`

## Gerar Instalador (.exe)

```bash
npm run dist
```

Saída:

- `release/NoteChaps Setup <versao>.exe`
- `release/win-unpacked/NoteChaps.exe`

## Fluxo de Produção

1. Gere com `npm run dist`.
2. Instale via `release/NoteChaps Setup <versao>.exe`.
3. Abra o atalho **NoteChaps**.

Observação: em produção o app não depende de `localhost`.

## Recursos Principais

- Abas com largura adaptativa e truncamento inteligente.
- Navegação entre abas por atalho:
  - `Ctrl + Tab` próxima aba
  - `Ctrl + Shift + Tab` aba anterior
- Alternância `Ctrl + E` (Visual/RAW) com preservação de contexto de edição.
- Estrutura do documento na sidebar com salto para headings.
- Menu de inserção rápida (`/`) com filtro e comandos de inserção.
- Mermaid, tabelas, wiki links e tarefas com edição visual.

## Solução de Problemas

- App não abre em produção:
  - Gere novamente com `npm run dist`.
  - Reinstale o setup mais recente em `release/`.
- Dev não inicia:
  - Verifique `node -v`.
  - Rode `npm install` novamente.
  - Valide com `npm run build`.

## Scripts Úteis

- `npm run dev` - desenvolvimento
- `npm run build` - build de produção
- `npm run preview` - preview
- `npm run dist` - build + instalador
- `npm run icons:generate` - gera ícones do app

## Projeto Separado: Music Lab

O projeto focado em composição musical assistida está em `NoteChapsMusicLab/`.
Ele foi iniciado para evoluir com regras de harmonia, visual musical dedicado, sugestões inteligentes e novas ferramentas específicas de música.
