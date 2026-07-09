export type Voto = 'aprovar' | 'aprovar_com_ressalvas' | 'rejeitar'

export type Provedor = 'anthropic' | 'openai' | 'custom'

/** Tokens consumidos por chamadas ao modelo — base do medidor de custo real. */
export interface UsoTokens {
  entrada: number
  saida: number
  /** Tokens de entrada lidos do cache (subconjunto de `entrada`, quando reportado). */
  cache?: number
}

// ── Projetos: a "mini empresa" — reuniões contínuas sobre o mesmo projeto ────

export type TipoAnexo = 'imagem' | 'pdf' | 'texto'

/** Arquivo anexado ao pitch (identidade visual, mockups, documentos…). */
export interface Anexo {
  id: string
  nome: string
  tipo: TipoAnexo
  mime: string
  /** Imagem/PDF: base64 (sem prefixo data:). Texto: o conteúdo em texto puro. */
  dados: string
  /** Tamanho aproximado em bytes após o processamento. */
  tamanho: number
}

/** Repositório do GitHub conectado ao projeto — os agentes leem um digest dele. */
export interface RepoConectado {
  url: string
  owner: string
  repo: string
  branch: string
  /** Digest textual: descrição, árvore de arquivos, README e arquivos-chave. */
  resumo: string
  atualizadoEm: string
}

/** Pasta local do computador do usuário, lida no navegador (não vai ao GitHub).
 *  Para projetos ainda não publicados — os agentes analisam um digest do código. */
export interface PastaLocal {
  nome: string
  /** Nº de arquivos (úteis) incluídos no digest. */
  arquivos: number
  /** Digest textual: árvore de arquivos, README, manifestos e trechos de código. */
  resumo: string
  atualizadoEm: string
}

/** Um projeto agrupa a ideia, os anexos, o repositório e TODAS as reuniões
 *  do conselho sobre ele — dá para voltar e continuar trabalhando com a equipe. */
export interface Projeto {
  id: string
  nome: string
  criadoEm: string
  atualizadoEm: string
  /** A ideia/visão base apresentada no primeiro pitch. */
  ideia: string
  anexos: Anexo[]
  repo?: RepoConectado
  /** Pasta local analisada (projeto ainda não publicado no GitHub). */
  pastaLocal?: PastaLocal
  /** Ids das reuniões (no histórico), da mais antiga para a mais recente. */
  reunioesIds: string[]
}

/** Contexto extra do projeto injetado nos prompts (não persiste na reunião). */
export interface ContextoProjeto {
  /** Digest do repositório conectado. */
  repo?: string
  /** Resumo (veredito) da reunião anterior — para reuniões de acompanhamento. */
  reuniaoAnterior?: string
}

export interface Membro {
  id: string
  nome: string
  cargo: string
  emoji: string
  cor: string
  descricao: string
  systemPrompt: string
  presidente?: boolean
}

export interface AnaliseRodada1 {
  analise: string
  estrategias: string[]
  riscos: string[]
  perguntas: string[]
  voto: Voto
  justificativa: string
  confianca: 1 | 2 | 3 | 4 | 5
}

export interface Reacao {
  para: string
  comentario: string
}

export interface AnaliseDebate {
  reacoes: Reacao[]
  mudou_voto: boolean
  voto: Voto
  justificativa: string
  /** Condições concretas que ainda bloqueiam a aprovação plena (modo consenso).
   *  Opcional: reuniões antigas no histórico não têm o campo. */
  ressalvas_pendentes?: string[]
}

export type StatusMembro = 'aguardando' | 'analisando' | 'pronto' | 'erro'

/** Avaliação do usuário sobre uma resposta de um conselheiro — muda o
 *  comportamento LOCAL daquele agente (injetada só no prompt dele). */
export interface ItemFeedback {
  id: string
  data: string
  gostou: boolean
  comentario?: string
  /** Trecho curto da resposta avaliada, para dar contexto ao agente. */
  trecho: string
  origem: 'analise' | 'debate'
}

export type Nivel = 'baixa' | 'media' | 'alta'

/** Plano de negócio estruturado — vira o documento visual/PDF. */
export interface Plano {
  titulo: string
  subtitulo: string
  resumo_executivo: string
  publico_alvo: string
  proposta_valor: string
  analise_mercado: {
    visao_geral: string
    concorrentes: { nome: string; pontos_fortes: string; pontos_fracos: string }[]
  }
  swot: {
    forcas: string[]
    fraquezas: string[]
    oportunidades: string[]
    ameacas: string[]
  }
  pilares_estrategia: { titulo: string; descricao: string }[]
  roadmap: { fase: string; duracao_semanas: number; entregas: string[] }[]
  orcamento: { categoria: string; valor_mensal_brl: number; observacao: string }[]
  metricas: { nome: string; meta_90_dias: string; como_medir: string }[]
  riscos: { risco: string; probabilidade: Nivel; impacto: Nivel; mitigacao: string }[]
  proximos_passos: string[]
}

export interface EstadoMembro {
  membroId: string
  status: StatusMembro
  erro?: string
  rodada1?: AnaliseRodada1
  debate?: AnaliseDebate[]
  /** Rodadas de debate em que a chamada falhou (o membro manteve a posição). */
  falhasDebate?: number[]
}

export type FaseReuniao =
  | 'preparando'
  | 'rodada1'
  | 'debate'
  | 'sintese'
  | 'plano'
  | 'prompt'
  | 'concluida'
  | 'erro'

export interface Placar {
  aprovar: number
  aprovar_com_ressalvas: number
  rejeitar: number
}

export interface ConfigReuniao {
  ideia: string
  provedor: Provedor
  modelo: string
  membrosIds: string[]
  /** Rodadas fixas de debate (1 a 3) — ignorado quando ateConsenso=true. */
  rodadasDebate: number
  /** Debate continua até o consenso PLENO — todos 'aprovar' ou todos
   *  'rejeitar'; ressalvas não encerram (com teto de segurança). */
  ateConsenso: boolean
  /** Gerar o prompt de execução (para agentes de programação) ao final. */
  gerarPrompt: boolean
  /** Gerar o plano detalhado (documento visual/PDF) ao final. */
  gerarPlano: boolean
  demo: boolean
  /** Projeto ao qual esta reunião pertence. */
  projetoId?: string
  /** Reunião de ACOMPANHAMENTO: o que mudou e o que o dono quer da equipe agora. */
  pauta?: string
}

export interface Reuniao {
  id: string
  data: string
  config: ConfigReuniao
  membros: Record<string, EstadoMembro>
  veredito: string
  promptExecucao?: string
  plano?: Plano
  placar: Placar
  fase: FaseReuniao
  /** Em modo consenso: rodada em que o consenso PLENO foi alcançado (se foi). */
  consensoNaRodada?: number
  /** Voto do consenso pleno ('aprovar' | 'rejeitar'). Ausente em reuniões
   *  antigas (regra anterior aceitava unanimidade de ressalvas) ou sem consenso. */
  consensoVoto?: Voto
  /** Tokens consumidos na reunião (para exibir o custo real). Ausente no demo
   *  e em reuniões antigas anteriores ao medidor. */
  usoTokens?: UsoTokens
  /** A síntese da Presidente falhou: a reunião foi salva com as análises e o
   *  debate (que o usuário já pagou), mas o veredito precisa ser regerado. */
  erroSintese?: boolean
}

export interface EventosReuniao {
  onFase: (fase: FaseReuniao, rodadaDebate?: number) => void
  onStatusMembro: (membroId: string, status: StatusMembro, erro?: string) => void
  onRodada1: (membroId: string, resultado: AnaliseRodada1) => void
  onDebate: (membroId: string, rodada: number, resultado: AnaliseDebate) => void
  onConsenso: (rodada: number, voto: Voto) => void
  onDebateFalhou: (membroId: string, rodada: number) => void
  onVereditoDelta: (texto: string) => void
  /** A síntese falhou — mas as análises e o debate foram preservados. */
  onErroSintese: (mensagem: string) => void
  onPlano: (plano: Plano) => void
  onPromptDelta: (texto: string) => void
  /** Falha na geração de um entregável — NÃO derruba a reunião. */
  onEntregavelErro: (tipo: 'plano' | 'prompt', mensagem: string) => void
  onConcluida: (reuniao: Reuniao) => void
  onErro: (mensagem: string) => void
}

/** Camada de transporte — compartilhada entre os provedores reais e o modo demo. */
export interface Transporte {
  /** Chamada com saída estruturada (JSON validado pelo schema). */
  estruturada(params: {
    system: string
    user: string
    schema: Record<string, unknown>
    membroId: string
    signal?: AbortSignal
    /** Anexos multimodais (imagens/PDF) enviados junto com a mensagem. */
    anexos?: Anexo[]
    /** Reporta os tokens consumidos (medidor de custo). O demo nunca chama. */
    onUsage?: (uso: UsoTokens) => void
  }): Promise<string>
  /** Chamada streamada em texto/markdown (síntese e prompt de execução). */
  streamada(params: {
    system: string
    user: string
    proposito: 'sintese' | 'prompt'
    onDelta: (texto: string) => void
    signal?: AbortSignal
    anexos?: Anexo[]
    onUsage?: (uso: UsoTokens) => void
  }): Promise<string>
}
