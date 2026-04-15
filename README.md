# NoteChaps

Editor de Markdown desktop (Electron + React) com foco em produtividade, organizacao por vault e edicao visual.

## Requisitos

- Node.js 20+
- npm 10+
- Windows 10/11 (build e instalador atual focados em Windows)

## Instalacao do projeto

```bash
npm install
```

## Rodar em desenvolvimento

```bash
npm run dev
```

O app abre em modo desenvolvimento usando `electron-vite`.

## Build de producao

Gerar artefatos compilados:

```bash
npm run build
```

Saida principal:

- `out/main`
- `out/preload`
- `out/renderer`

## Gerar instalador (.exe)

```bash
npm run dist
```

Saida:

- `release/NoteChaps Setup <versao>.exe`
- `release/win-unpacked/NoteChaps.exe`

## Instalar e usar em producao

1. Execute o instalador em `release/NoteChaps Setup <versao>.exe`.
2. Conclua a instalacao normalmente (atalho de desktop/menu iniciar habilitado).
3. Abra o app pelo atalho **NoteChaps**.

## Melhorias recentes de UX

- Tabs com ajuste de largura dinamico:
  - com poucas abas, mostra nome completo;
  - com muitas abas, reduz automaticamente e usa truncamento.
- Navegacao entre abas por atalho:
  - `Ctrl + Tab` proxima aba
  - `Ctrl + Shift + Tab` aba anterior
- Troca `Ctrl + E` (Visual <-> Raw) mantendo a posicao de rolagem do documento.
- Navegacao pela estrutura (sidebar direita) em ambos os modos:
  - no Visual, clica no titulo e salta para a secao no editor;
  - no Raw, clica no titulo e posiciona/seleciona o heading correspondente no texto.
- Troca por botao de modo (toolbar) agora tambem preserva a posicao de rolagem.
- Menu de insercao rapida (`/`) melhorado:
  - comandos exibidos de forma explicita (ex.: `/diagrama`, `/tabela`, `/codigo`);
  - filtro por digitacao com ranking por comando/descricao;
  - menu reposiciona para cima quando faltar espaco no fim da tela.
- Insercao de diagrama mais robusta:
  - funciona em arquivo novo mesmo apos apagar titulo inicial;
  - sempre cria um paragrafo abaixo e move o cursor para continuar digitando.
- Mermaid com suporte mais amplo:
  - reconhecimento de `flowchart`, `sequenceDiagram`, `stateDiagram-v2`, `classDiagram`, `journey`, `pie`, `gitGraph`, `mindmap`, `timeline`, `quadrantChart`, `requirementDiagram` e `sankey-beta`;
  - fallback para blocos com linguagem Mermaid variante (ex.: `stateDiagram-v2`).
- Enter mais inteligente em blocos selecionados de diagrama/tabela, criando paragrafo abaixo para continuar digitando.

## Script auxiliar de inicializacao

O arquivo `StartApp.vbs`:

- tenta abrir primeiro o executavel de producao (`release/win-unpacked/NoteChaps.exe`);
- se nao existir, cai para `npm run dev` com console visivel.

## Solucao de problemas

- App nao abre em producao:
  - gere novamente com `npm run dist`;
  - reinstale o setup mais recente em `release/`.
- Desenvolvimento falha ao iniciar:
  - confirme versao do Node (`node -v`);
  - rode `npm install` novamente;
  - tente `npm run build` para validar compilacao.
- App antigo em conflito:
  - desinstale versoes anteriores antes de instalar o novo setup.

## Scripts uteis

- `npm run dev` - desenvolvimento
- `npm run build` - build de producao
- `npm run preview` - preview
- `npm run dist` - build + instalador
- `npm run icons:generate` - regenera logo e icones do app (ICO + PNGs)
