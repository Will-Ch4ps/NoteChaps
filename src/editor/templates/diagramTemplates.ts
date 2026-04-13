export interface DiagramTemplate {
  id: string
  label: string
  description: string
  category: 'fluxo' | 'sequencia' | 'arquitetura' | 'banco' | 'planejamento'
  slashCommand: string
  code: string
}

export const diagramTemplates: DiagramTemplate[] = [
  // ─── Fluxogramas ──────────────────────────────────────────────────────────
  {
    id: 'fluxo-simples',
    label: 'Fluxograma Simples',
    description: 'Diagrama de fluxo vertical com 3 etapas',
    category: 'fluxo',
    slashCommand: '/fluxo',
    code: `flowchart TD
    A([Início]) --> B[Processar]
    B --> C{Condição?}
    C -->|Sim| D[Resultado A]
    C -->|Não| E[Resultado B]
    D --> F([Fim])
    E --> F`
  },
  {
    id: 'fluxo-processo',
    label: 'Fluxo de Processo',
    description: 'Processo step-by-step horizontal',
    category: 'fluxo',
    slashCommand: '/fluxo-processo',
    code: `flowchart LR
    A([Início]) --> B[Etapa 1]
    B --> C[Etapa 2]
    C --> D[Etapa 3]
    D --> E[Etapa 4]
    E --> F([Fim])`
  },
  {
    id: 'fluxo-decisao',
    label: 'Fluxo com Decisões',
    description: 'Fluxo com múltiplos pontos de decisão',
    category: 'fluxo',
    slashCommand: '/fluxo-decisao',
    code: `flowchart TD
    A([Início]) --> B[Receber Input]
    B --> C{Input Válido?}
    C -->|Não| D[Exibir Erro]
    D --> B
    C -->|Sim| E[Processar]
    E --> F{Sucesso?}
    F -->|Não| G[Tratar Erro]
    G --> H([Fim com Erro])
    F -->|Sim| I[Salvar Resultado]
    I --> J([Fim])`
  },

  // ─── Sequência ────────────────────────────────────────────────────────────
  {
    id: 'seq-simples',
    label: 'Diagrama de Sequência',
    description: 'Interação básica entre componentes',
    category: 'sequencia',
    slashCommand: '/seq',
    code: `sequenceDiagram
    participant Cliente
    participant Servidor
    participant Banco

    Cliente->>Servidor: POST /api/dados
    Servidor->>Banco: INSERT INTO tabela
    Banco-->>Servidor: OK (id: 123)
    Servidor-->>Cliente: 201 Created`
  },
  {
    id: 'seq-auth',
    label: 'Fluxo de Autenticação',
    description: 'Login com JWT e refresh token',
    category: 'sequencia',
    slashCommand: '/seq-auth',
    code: `sequenceDiagram
    participant U as Usuário
    participant C as Cliente
    participant A as Auth Service
    participant R as Resource API

    U->>C: Inserir credenciais
    C->>A: POST /auth/login
    A-->>C: access_token + refresh_token
    C->>R: GET /api/recurso (Bearer token)
    R->>A: Validar token
    A-->>R: Token válido
    R-->>C: 200 OK + dados
    C-->>U: Exibir resultado`
  },
  {
    id: 'seq-api',
    label: 'Fluxo REST API',
    description: 'CRUD completo via API REST',
    category: 'sequencia',
    slashCommand: '/seq-api',
    code: `sequenceDiagram
    participant C as Cliente
    participant API
    participant DB as Banco

    Note over C,DB: Criar recurso
    C->>API: POST /recursos
    API->>DB: INSERT
    DB-->>API: id gerado
    API-->>C: 201 + recurso

    Note over C,DB: Buscar recurso
    C->>API: GET /recursos/:id
    API->>DB: SELECT
    DB-->>API: dados
    API-->>C: 200 + recurso`
  },

  // ─── Arquitetura ──────────────────────────────────────────────────────────
  {
    id: 'arch-microservicos',
    label: 'Microserviços',
    description: 'Arquitetura de microserviços com API Gateway',
    category: 'arquitetura',
    slashCommand: '/arch-micro',
    code: `flowchart TB
    Client([Cliente Web/Mobile])

    subgraph Gateway["API Gateway"]
        GW[Gateway\nNginx / Kong]
        Auth[Auth\nMiddleware]
    end

    subgraph Services["Microserviços"]
        US[User\nService]
        OS[Order\nService]
        PS[Payment\nService]
        NS[Notification\nService]
    end

    subgraph Data["Dados"]
        UDB[(User DB\nPostgreSQL)]
        ODB[(Order DB\nMongoDB)]
        PDB[(Payment DB\nPostgreSQL)]
        MQ[Message Queue\nRabbitMQ]
    end

    Client --> GW
    GW --> Auth
    Auth --> US & OS & PS
    US --> UDB
    OS --> ODB
    PS --> PDB
    PS --> MQ
    MQ --> NS`
  },
  {
    id: 'arch-c4',
    label: 'Modelo C4 (Contexto)',
    description: 'Visão de contexto do sistema',
    category: 'arquitetura',
    slashCommand: '/arch-c4',
    code: `flowchart TB
    subgraph External["Externos"]
        U1([Usuário Final])
        U2([Administrador])
        EXT1[Sistema Externo A]
        EXT2[Sistema Externo B]
    end

    subgraph System["Sistema Principal"]
        WEB[Web App\nReact]
        API[Backend API\nNode.js]
        DB[(Banco de Dados\nPostgreSQL)]
        CACHE[(Cache\nRedis)]
    end

    U1 -->|Usa| WEB
    U2 -->|Administra| API
    WEB -->|REST/HTTPS| API
    API -->|Query| DB
    API -->|Cache| CACHE
    API -->|Integra| EXT1
    API -->|Integra| EXT2`
  },

  // ─── Banco de Dados ───────────────────────────────────────────────────────
  {
    id: 'er-simples',
    label: 'Diagrama ER',
    description: 'Entidades e relacionamentos',
    category: 'banco',
    slashCommand: '/er',
    code: `erDiagram
    USUARIO {
        int id PK
        string nome
        string email
        datetime criado_em
    }

    PEDIDO {
        int id PK
        int usuario_id FK
        decimal total
        string status
        datetime criado_em
    }

    PRODUTO {
        int id PK
        string nome
        decimal preco
        int estoque
    }

    PEDIDO_ITEM {
        int id PK
        int pedido_id FK
        int produto_id FK
        int quantidade
        decimal preco_unit
    }

    USUARIO ||--o{ PEDIDO : "faz"
    PEDIDO ||--|{ PEDIDO_ITEM : "contém"
    PRODUTO ||--o{ PEDIDO_ITEM : "está em"`
  },

  // ─── Planejamento ─────────────────────────────────────────────────────────
  {
    id: 'gantt',
    label: 'Gantt Chart',
    description: 'Cronograma de projeto com fases',
    category: 'planejamento',
    slashCommand: '/gantt',
    code: `gantt
    title Cronograma do Projeto
    dateFormat  YYYY-MM-DD
    section Planejamento
    Levantamento de requisitos  :a1, 2024-01-01, 7d
    Definição de arquitetura    :a2, after a1, 5d
    section Desenvolvimento
    Backend API                 :b1, after a2, 14d
    Frontend                   :b2, after a2, 14d
    Integração                 :b3, after b1, 7d
    section Testes
    Testes unitários            :c1, after b3, 5d
    Testes de integração        :c2, after c1, 5d
    section Deploy
    Staging                    :d1, after c2, 3d
    Produção                   :d2, after d1, 2d`
  },
  {
    id: 'quadrante',
    label: 'Matriz de Prioridade',
    description: 'Quadrante de impacto vs esforço',
    category: 'planejamento',
    slashCommand: '/quadrante',
    code: `quadrantChart
    title Impacto vs Esforço
    x-axis Baixo Esforço --> Alto Esforço
    y-axis Baixo Impacto --> Alto Impacto
    quadrant-1 Projetos Estratégicos
    quadrant-2 Quick Wins
    quadrant-3 Pode Esperar
    quadrant-4 Reavalie
    Feature A: [0.2, 0.8]
    Feature B: [0.7, 0.9]
    Feature C: [0.3, 0.3]
    Feature D: [0.8, 0.2]
    Feature E: [0.5, 0.6]`
  }
]

export const categoryLabels: Record<DiagramTemplate['category'], string> = {
  fluxo: 'Fluxogramas',
  sequencia: 'Sequência',
  arquitetura: 'Arquitetura',
  banco: 'Banco de Dados',
  planejamento: 'Planejamento'
}
