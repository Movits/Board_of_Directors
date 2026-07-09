// JSON Schemas para saída estruturada da API (output_config.format).
// Regras da API: todo objeto precisa de additionalProperties: false e required completo;
// restrições numéricas (minimum/maximum) não são suportadas — usamos enum para confiança.

export const SCHEMA_RODADA1 = {
  type: 'object',
  properties: {
    analise: {
      type: 'string',
      description: 'Análise aprofundada da ideia sob a ótica da sua especialidade (2 a 4 parágrafos).',
    },
    estrategias: {
      type: 'array',
      items: { type: 'string' },
      description: '3 a 5 estratégias ou ações concretas que você recomenda.',
    },
    riscos: {
      type: 'array',
      items: { type: 'string' },
      description: '2 a 4 riscos principais que você enxerga na sua área.',
    },
    perguntas: {
      type: 'array',
      items: { type: 'string' },
      description: '1 a 3 perguntas críticas que o empreendedor precisa responder.',
    },
    voto: {
      type: 'string',
      enum: ['aprovar', 'aprovar_com_ressalvas', 'rejeitar'],
      description: 'Seu voto sobre seguir em frente com a ideia.',
    },
    justificativa: {
      type: 'string',
      description:
        'UMA frase curta, memorável e citável (até ~20 palavras) que resume sua posição, no seu próprio registro de fala.',
    },
    confianca: {
      type: 'integer',
      enum: [1, 2, 3, 4, 5],
      description: 'Confiança no seu voto, de 1 (baixa) a 5 (alta).',
    },
  },
  required: ['analise', 'estrategias', 'riscos', 'perguntas', 'voto', 'justificativa', 'confianca'],
  additionalProperties: false,
} as const

const NIVEL = { type: 'string', enum: ['baixa', 'media', 'alta'] } as const
const LISTA_TEXTO = { type: 'array', items: { type: 'string' } } as const

export const SCHEMA_PLANO = {
  type: 'object',
  properties: {
    titulo: { type: 'string', description: 'Nome do projeto/plano.' },
    subtitulo: { type: 'string', description: 'Uma frase que resume a proposta.' },
    resumo_executivo: {
      type: 'string',
      description: 'Resumo executivo em 2 a 3 parágrafos: a oportunidade, a decisão do conselho e o caminho.',
    },
    publico_alvo: { type: 'string', description: 'Quem é o cliente, descrito de forma específica.' },
    proposta_valor: { type: 'string', description: 'A promessa central em 1 a 2 frases.' },
    analise_mercado: {
      type: 'object',
      properties: {
        visao_geral: { type: 'string', description: 'Panorama do mercado em 1 a 2 parágrafos, com números aproximados quando fizer sentido.' },
        concorrentes: {
          type: 'array',
          description: '2 a 4 concorrentes ou alternativas atuais do cliente.',
          items: {
            type: 'object',
            properties: {
              nome: { type: 'string' },
              pontos_fortes: { type: 'string' },
              pontos_fracos: { type: 'string' },
            },
            required: ['nome', 'pontos_fortes', 'pontos_fracos'],
            additionalProperties: false,
          },
        },
      },
      required: ['visao_geral', 'concorrentes'],
      additionalProperties: false,
    },
    swot: {
      type: 'object',
      properties: {
        forcas: LISTA_TEXTO,
        fraquezas: LISTA_TEXTO,
        oportunidades: LISTA_TEXTO,
        ameacas: LISTA_TEXTO,
      },
      required: ['forcas', 'fraquezas', 'oportunidades', 'ameacas'],
      additionalProperties: false,
    },
    pilares_estrategia: {
      type: 'array',
      description: '3 a 4 pilares estratégicos do plano.',
      items: {
        type: 'object',
        properties: { titulo: { type: 'string' }, descricao: { type: 'string' } },
        required: ['titulo', 'descricao'],
        additionalProperties: false,
      },
    },
    roadmap: {
      type: 'array',
      description: '3 a 5 fases sequenciais.',
      items: {
        type: 'object',
        properties: {
          fase: { type: 'string' },
          duracao_semanas: { type: 'integer' },
          entregas: LISTA_TEXTO,
        },
        required: ['fase', 'duracao_semanas', 'entregas'],
        additionalProperties: false,
      },
    },
    orcamento: {
      type: 'array',
      description: '4 a 6 categorias de custo mensal estimado, em reais.',
      items: {
        type: 'object',
        properties: {
          categoria: { type: 'string' },
          valor_mensal_brl: { type: 'number' },
          observacao: { type: 'string' },
        },
        required: ['categoria', 'valor_mensal_brl', 'observacao'],
        additionalProperties: false,
      },
    },
    metricas: {
      type: 'array',
      description: '3 a 5 métricas que definem sucesso.',
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          meta_90_dias: { type: 'string' },
          como_medir: { type: 'string' },
        },
        required: ['nome', 'meta_90_dias', 'como_medir'],
        additionalProperties: false,
      },
    },
    riscos: {
      type: 'array',
      description: '3 a 6 riscos priorizados.',
      items: {
        type: 'object',
        properties: {
          risco: { type: 'string' },
          probabilidade: NIVEL,
          impacto: NIVEL,
          mitigacao: { type: 'string' },
        },
        required: ['risco', 'probabilidade', 'impacto', 'mitigacao'],
        additionalProperties: false,
      },
    },
    proximos_passos: {
      ...LISTA_TEXTO,
      description: '4 a 8 ações imediatas, ordenadas por prioridade.',
    },
  },
  required: [
    'titulo',
    'subtitulo',
    'resumo_executivo',
    'publico_alvo',
    'proposta_valor',
    'analise_mercado',
    'swot',
    'pilares_estrategia',
    'roadmap',
    'orcamento',
    'metricas',
    'riscos',
    'proximos_passos',
  ],
  additionalProperties: false,
} as const

export const SCHEMA_DEBATE = {
  type: 'object',
  properties: {
    reacoes: {
      type: 'array',
      description: 'Reações diretas às posições de outros conselheiros (concordância, discordância, complemento).',
      items: {
        type: 'object',
        properties: {
          para: { type: 'string', description: 'Nome do conselheiro a quem você responde.' },
          tipo: {
            type: 'string',
            enum: ['concorda', 'discorda', 'complementa'],
            description:
              'Natureza da reação: se você "concorda", "discorda" ou "complementa" o colega. Ao menos UMA reação do tipo "discorda" por rodada (ou explique na justificativa por que genuinamente não há discordância).',
          },
          comentario: { type: 'string', description: 'Sua réplica ou complemento, direto e específico.' },
        },
        required: ['para', 'tipo', 'comentario'],
        additionalProperties: false,
      },
    },
    mudou_voto: {
      type: 'boolean',
      description: 'true se o debate mudou seu voto em relação à rodada anterior.',
    },
    voto: {
      type: 'string',
      enum: ['aprovar', 'aprovar_com_ressalvas', 'rejeitar'],
      description: 'Seu voto final após considerar os argumentos dos colegas.',
    },
    justificativa: {
      type: 'string',
      description: 'Justificativa do voto atual em 1 a 3 frases (mencione o que o debate mudou ou reforçou).',
    },
    ressalvas_pendentes: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Se seu voto é "aprovar_com_ressalvas": liste cada ressalva como uma condição CONCRETA que ainda bloqueia sua aprovação plena (o que precisa acontecer para você votar "aprovar"). Se seu voto é "aprovar" ou "rejeitar", retorne uma lista vazia.',
    },
  },
  required: ['reacoes', 'mudou_voto', 'voto', 'justificativa', 'ressalvas_pendentes'],
  additionalProperties: false,
} as const
