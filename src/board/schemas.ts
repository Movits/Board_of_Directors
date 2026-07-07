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
      description: 'Justificativa do voto em 1 a 3 frases.',
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
          comentario: { type: 'string', description: 'Sua réplica ou complemento, direto e específico.' },
        },
        required: ['para', 'comentario'],
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
  },
  required: ['reacoes', 'mudou_voto', 'voto', 'justificativa'],
  additionalProperties: false,
} as const
