import type { Provedor, Reuniao } from '../types'

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
} as const

const MAX_HISTORICO = 20

const MODELO_PADRAO: Record<Provedor, string> = {
  anthropic: 'claude-opus-4-8',
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

function grava(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    // localStorage cheio ou indisponível — falha silenciosa é aceitável aqui
  }
}

// ── Provedor ativo ────────────────────────────────────────────────────────────
export const leProvedor = (): Provedor => le<Provedor>(CHAVES.provedor, 'anthropic')
export const gravaProvedor = (v: Provedor): void => grava(CHAVES.provedor, v)

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

// ── Histórico de reuniões ─────────────────────────────────────────────────────
export const leHistorico = (): Reuniao[] => le(CHAVES.historico, [])
export function gravaReuniao(reuniao: Reuniao): void {
  const historico = [reuniao, ...leHistorico()].slice(0, MAX_HISTORICO)
  grava(CHAVES.historico, historico)
}
export function removeReuniao(id: string): void {
  grava(
    CHAVES.historico,
    leHistorico().filter((r) => r.id !== id),
  )
}
