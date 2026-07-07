export type Voto = 'aprovar' | 'aprovar_com_ressalvas' | 'rejeitar'

export type ModelId = 'claude-opus-4-8' | 'claude-sonnet-5' | 'claude-haiku-4-5'

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
  | 'concluida'
  | 'erro'

export interface Placar {
  aprovar: number
  aprovar_com_ressalvas: number
  rejeitar: number
}

export interface ConfigReuniao {
  ideia: string
  modelo: ModelId
  membrosIds: string[]
  rodadasDebate: number
  demo: boolean
}

export interface Reuniao {
  id: string
  data: string
  config: ConfigReuniao
  membros: Record<string, EstadoMembro>
  veredito: string
  placar: Placar
  fase: FaseReuniao
}

export interface EventosReuniao {
  onFase: (fase: FaseReuniao, rodadaDebate?: number) => void
  onStatusMembro: (membroId: string, status: StatusMembro, erro?: string) => void
  onRodada1: (membroId: string, resultado: AnaliseRodada1) => void
  onDebate: (membroId: string, rodada: number, resultado: AnaliseDebate) => void
  onVereditoDelta: (texto: string) => void
  onConcluida: (reuniao: Reuniao) => void
  onErro: (mensagem: string) => void
}

/** Camada de transporte — compartilhada entre o modo real (API) e o modo demo. */
export interface Transporte {
  /** Chamada com saída estruturada (JSON validado pelo schema). */
  estruturada(params: {
    system: string
    user: string
    schema: Record<string, unknown>
    membroId: string
    signal?: AbortSignal
  }): Promise<string>
  /** Chamada streamada em markdown (síntese do presidente). */
  streamada(params: {
    system: string
    user: string
    onDelta: (texto: string) => void
    signal?: AbortSignal
  }): Promise<string>
}
