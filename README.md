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
