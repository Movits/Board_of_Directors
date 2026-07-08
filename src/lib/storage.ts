import type { ItemFeedback, Projeto, Provedor, Reuniao } from '../types'

const CHAVES = {
  apiKeyLegada: 'bod.apiKey',
  modeloLegado: 'bod.modelo',
  provedor: 'bod.provedor',
  chavesApi: 'bod.chavesApi',
  modelos: 'bod.modelos',
  baseUrlLegada: 'bod.baseUrlOpenai',
  baseUrls: 'bod.baseUrls',
  modelosDescobertos: 'bod.modelosDescobertos',
  personas: 'bod.personas',
  historico: 'bod.historico',
  feedback: 'bod.feedback',
  rascunho: 'bod.rascunhoIdeia',
  projetos: 'bod.projetos',
  githubToken: 'bod.githubToken',
} as const

const MAX_HISTORICO = 20
const MAX_FEEDBACK_POR_MEMBRO = 10

// Sonnet como padrão: equilíbrio custo/qualidade protege quem está começando
// (recomendação do conselho — Opus vira upgrade consciente).
const MODELO_PADRAO: Record<Provedor, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-5.5',
  custom: '',
}

function le<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave)
    return bruto ? (JSON.parse(bruto) as T) : padrao
  } catch {
    return padrao
  }
}

/** Retorna false quando o localStorage está cheio/indisponível — quem grava
 *  dados que o usuário não quer perder (projetos com anexos) deve checar. */
function grava(chave: string, valor: unknown): boolean {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}

// ── Provedor ativo ────────────────────────────────────────────────────────────
export const leProvedor = (): Provedor => le<Provedor>(CHAVES.provedor, 'anthropic')
export const gravaProvedor = (v: Provedor): void => {
  grava(CHAVES.provedor, v)
}

// ── Chaves de API (uma por provedor) ─────────────────────────────────────────
type MapaChaves = Partial<Record<Provedor, string>>

export function leChave(provedor: Provedor): string {
  const mapa = le<MapaChaves>(CHAVES.chavesApi, {})
  if (mapa[provedor]) return mapa[provedor]!
  // migração: versões antigas guardavam uma única chave (da Anthropic)
  if (provedor === 'anthropic') return le<string>(CHAVES.apiKeyLegada, '')
  return ''
}

export function gravaChave(provedor: Provedor, valor: string): void {
  const mapa = le<MapaChaves>(CHAVES.chavesApi, {})
  mapa[provedor] = valor
  grava(CHAVES.chavesApi, mapa)
}

// ── Modelo padrão por provedor ────────────────────────────────────────────────
type MapaModelos = Partial<Record<Provedor, string>>

export function leModeloDe(provedor: Provedor): string {
  const mapa = le<MapaModelos>(CHAVES.modelos, {})
  if (mapa[provedor]) return mapa[provedor]!
  if (provedor === 'anthropic') {
    const legado = le<string>(CHAVES.modeloLegado, '')
    if (legado) return legado
  }
  return MODELO_PADRAO[provedor]
}

export function gravaModeloDe(provedor: Provedor, modelo: string): void {
  const mapa = le<MapaModelos>(CHAVES.modelos, {})
  mapa[provedor] = modelo
  grava(CHAVES.modelos, mapa)
}

// ── Base URL por provedor (APIs compatíveis com OpenAI) ─────────────────────
type MapaBaseUrls = Partial<Record<Provedor, string>>

export function leBaseUrlDe(provedor: Provedor): string {
  const mapa = le<MapaBaseUrls>(CHAVES.baseUrls, {})
  if (mapa[provedor]) return mapa[provedor]!
  // migração: a v2 guardava uma única Base URL (do provedor OpenAI)
  if (provedor === 'openai') return le<string>(CHAVES.baseUrlLegada, '')
  return ''
}

export function gravaBaseUrlDe(provedor: Provedor, valor: string): void {
  const mapa = le<MapaBaseUrls>(CHAVES.baseUrls, {})
  mapa[provedor] = valor
  grava(CHAVES.baseUrls, mapa)
}

// ── Modelos descobertos via "Buscar modelos" (por provedor) ─────────────────
type MapaDescobertos = Partial<Record<Provedor, string[]>>

export function leModelosDescobertos(provedor: Provedor): string[] {
  return le<MapaDescobertos>(CHAVES.modelosDescobertos, {})[provedor] ?? []
}

export function gravaModelosDescobertos(provedor: Provedor, modelos: string[]): void {
  const mapa = le<MapaDescobertos>(CHAVES.modelosDescobertos, {})
  mapa[provedor] = modelos
  grava(CHAVES.modelosDescobertos, mapa)
}

// ── Personas customizadas (overrides do systemPrompt por membro) ─────────────
export const lePersonas = (): Record<string, string> => le(CHAVES.personas, {})
export function gravaPersona(membroId: string, systemPrompt: string | null): void {
  const atual = lePersonas()
  if (systemPrompt === null) {
    delete atual[membroId]
  } else {
    atual[membroId] = systemPrompt
  }
  grava(CHAVES.personas, atual)
}

// ── Feedback por conselheiro (aprendizado local do agente) ───────────────────
type MapaFeedback = Record<string, ItemFeedback[]>

export function leFeedback(membroId: string): ItemFeedback[] {
  return le<MapaFeedback>(CHAVES.feedback, {})[membroId] ?? []
}

export function gravaFeedback(membroId: string, item: ItemFeedback): void {
  const mapa = le<MapaFeedback>(CHAVES.feedback, {})
  mapa[membroId] = [item, ...(mapa[membroId] ?? [])].slice(0, MAX_FEEDBACK_POR_MEMBRO)
  grava(CHAVES.feedback, mapa)
}

export function removeFeedback(membroId: string, itemId: string): void {
  const mapa = le<MapaFeedback>(CHAVES.feedback, {})
  mapa[membroId] = (mapa[membroId] ?? []).filter((f) => f.id !== itemId)
  grava(CHAVES.feedback, mapa)
}

// ── Rascunho da ideia (sobrevive à navegação para Configurações) ─────────────
export const leRascunho = (): string => le(CHAVES.rascunho, '')
export const gravaRascunho = (v: string): void => {
  grava(CHAVES.rascunho, v)
}

// ── Histórico de reuniões ─────────────────────────────────────────────────────
export const leHistorico = (): Reuniao[] => le(CHAVES.historico, [])
/** Upsert por id: regravar a mesma reunião (ex.: após "Gerar novamente") atualiza
 *  em vez de duplicar. Retorna false se o localStorage estourou (a reunião paga
 *  NÃO foi salva — quem chama deve avisar o usuário). */
export function gravaReuniao(reuniao: Reuniao): boolean {
  const historico = [reuniao, ...leHistorico().filter((r) => r.id !== reuniao.id)].slice(0, MAX_HISTORICO)
  return grava(CHAVES.historico, historico)
}
export function removeReuniao(id: string): void {
  grava(
    CHAVES.historico,
    leHistorico().filter((r) => r.id !== id),
  )
}

// ── Projetos (a "mini empresa": ideia + anexos + repo + reuniões) ────────────

export function leProjetos(): Projeto[] {
  migraProjetos()
  return le<Projeto[]>(CHAVES.projetos, [])
}

export function leProjeto(id: string): Projeto | undefined {
  return leProjetos().find((p) => p.id === id)
}

/** Upsert por id, mais recente primeiro. Retorna false se o armazenamento
 *  local estourou (ex.: anexos grandes demais). */
export function gravaProjeto(projeto: Projeto): boolean {
  const demais = le<Projeto[]>(CHAVES.projetos, []).filter((p) => p.id !== projeto.id)
  const ordenados = [projeto, ...demais].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
  return grava(CHAVES.projetos, ordenados)
}

/** Remove o projeto e as reuniões dele no histórico. */
export function removeProjeto(id: string): void {
  const projeto = leProjeto(id)
  grava(
    CHAVES.projetos,
    le<Projeto[]>(CHAVES.projetos, []).filter((p) => p.id !== id),
  )
  if (projeto) {
    grava(
      CHAVES.historico,
      leHistorico().filter((r) => !projeto.reunioesIds.includes(r.id)),
    )
  }
}

/** Anexa uma reunião concluída ao projeto e atualiza o carimbo de atividade.
 *  Retorna false se o localStorage estourou. */
export function anexaReuniaoAoProjeto(projetoId: string, reuniaoId: string): boolean {
  const projeto = leProjeto(projetoId)
  if (!projeto) return false
  if (!projeto.reunioesIds.includes(reuniaoId)) projeto.reunioesIds.push(reuniaoId)
  projeto.atualizadoEm = new Date().toISOString()
  return gravaProjeto(projeto)
}

/** Nome curto derivado da ideia (primeiras palavras). */
export function nomeDeProjeto(ideia: string): string {
  const palavras = ideia.trim().replace(/\s+/g, ' ').split(' ').slice(0, 7).join(' ')
  return palavras.length > 60 ? palavras.slice(0, 57) + '…' : palavras
}

/** Migração: reuniões antigas (pré-projetos) viram um projeto cada. */
function migraProjetos(): void {
  if (localStorage.getItem(CHAVES.projetos) !== null) return
  const historico = leHistorico()
  if (historico.length === 0) {
    grava(CHAVES.projetos, [])
    return
  }
  const projetos: Projeto[] = historico.map((r) => ({
    id: `projeto-${r.id}`,
    nome: nomeDeProjeto(r.config.ideia),
    criadoEm: r.data,
    atualizadoEm: r.data,
    ideia: r.config.ideia,
    anexos: [],
    reunioesIds: [r.id],
  }))
  grava(CHAVES.projetos, projetos)
}

// ── Token do GitHub (opcional: repositórios privados / limite maior) ─────────
export const leGithubToken = (): string => le(CHAVES.githubToken, '')
export const gravaGithubToken = (v: string): void => {
  grava(CHAVES.githubToken, v)
}
