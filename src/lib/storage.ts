import type { ModelId, Reuniao } from '../types'

const CHAVES = {
  apiKey: 'bod.apiKey',
  modelo: 'bod.modelo',
  personas: 'bod.personas',
  historico: 'bod.historico',
} as const

const MAX_HISTORICO = 20

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

// ── Chave de API ──────────────────────────────────────────────────────────────
export const leApiKey = (): string => le(CHAVES.apiKey, '')
export const gravaApiKey = (v: string): void => grava(CHAVES.apiKey, v)

// ── Modelo padrão ─────────────────────────────────────────────────────────────
export const leModelo = (): ModelId => le<ModelId>(CHAVES.modelo, 'claude-opus-4-8')
export const gravaModelo = (v: ModelId): void => grava(CHAVES.modelo, v)

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
