export type Voto = 'aprovar' | 'aprovar_com_ressalvas' | 'rejeitar'

export type Provedor = 'anthropic' | 'openai'

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
}

export type StatusMembro = 'aguardando' | 'analisando' | 'pronto' | 'erro'

export interface EstadoMembro {
  membroId: string
  status: StatusMembro
  erro?: string
  rodada1?: AnaliseRodada1
  debate?: AnaliseDebate[]
}

export type FaseReuniao =
  | 'preparando'
  | 'rodada1'
  | 'debate'
  | 'sintese'
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
  /** Debate continua até todos votarem igual (com teto de segurança). */
  ateConsenso: boolean
  /** Gerar o prompt de execução para o Claude Code ao final. */
  gerarPrompt: boolean
  demo: boolean
}

export interface Reuniao {
  id: string
  data: string
  config: ConfigReuniao
  membros: Record<string, EstadoMembro>
  veredito: string
  promptExecucao?: string
  placar: Placar
  fase: FaseReuniao
  /** Em modo consenso: rodada em que a unanimidade foi alcançada (se foi). */
  consensoNaRodada?: number
}

export interface EventosReuniao {
  onFase: (fase: FaseReuniao, rodadaDebate?: number) => void
  onStatusMembro: (membroId: string, status: StatusMembro, erro?: string) => void
  onRodada1: (membroId: string, resultado: AnaliseRodada1) => void
  onDebate: (membroId: string, rodada: number, resultado: AnaliseDebate) => void
  onConsenso: (rodada: number) => void
  onVereditoDelta: (texto: string) => void
  onPromptDelta: (texto: string) => void
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
  }): Promise<string>
  /** Chamada streamada em texto/markdown (síntese e prompt de execução). */
  streamada(params: {
    system: string
    user: string
    proposito: 'sintese' | 'prompt'
    onDelta: (texto: string) => void
    signal?: AbortSignal
  }): Promise<string>
}
