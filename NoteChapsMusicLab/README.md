# NoteChaps Music Lab

Sistema separado do NoteChaps, focado em criação musical assistida.

## Objetivo

Entregar uma experiência dedicada para composição de músicas e letras com:

- campo harmônico automático por tonalidade/modo;
- sugestões de progressão por estilo;
- apoio melódico com graus e sensação harmônica;
- visual dark moderno orientado a uso musical.

## Stack Inicial

- React 18
- TypeScript
- Vite

## Requisitos

- Node.js 20+
- npm 10+

## Instalação

```bash
npm install
```

## Executar em desenvolvimento

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Estrutura

- `src/lib/harmony.ts`: motor de regras musicais (campo harmônico, progressões, transposição, variações).
- `src/App.tsx`: interface principal (controle tonal, progressão, letra e assistente harmônico).
- `src/styles.css`: identidade visual dark musical.

## Roadmap (próximos passos)

1. Parser robusto de cifra/letra com alinhamento inteligente por bloco.
2. Integrações externas gratuitas para shapes/acordes alternativos.
3. Camada de sugestões por contexto da letra + estilo.
4. Biblioteca de recursos por instrumento (violão primeiro, depois teclado e baixo).
5. Módulo de IA opcional e gratuito para sugestões guiadas.
