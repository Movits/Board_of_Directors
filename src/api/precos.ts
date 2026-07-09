import type { UsoTokens } from '../types'

// ── Tabela de preços por modelo (US$ por milhão de tokens) ───────────────────
// Valores APROXIMADOS, conferidos manualmente — sirva sempre com "≈" na UI.
// Modelos desconhecidos (provedor Personalizado, locais) ficam de fora de
// propósito: nunca inventamos dólar — nesses casos a UI mostra só tokens.
interface PrecoModelo {
  prefixo: string
  /** US$ por 1M de tokens de entrada. */
  entrada: number
  /** US$ por 1M de tokens de saída. */
  saida: number
}

// A ordem importa: prefixos mais específicos vêm primeiro.
const PRECOS: PrecoModelo[] = [
  // Anthropic
  { prefixo: 'claude-opus-4-8', entrada: 5, saida: 25 },
  { prefixo: 'claude-opus-4-7', entrada: 5, saida: 25 },
  { prefixo: 'claude-opus-4-6', entrada: 5, saida: 25 },
  { prefixo: 'claude-opus-4-5', entrada: 5, saida: 25 },
  { prefixo: 'claude-opus-4', entrada: 15, saida: 75 }, // Opus 4.0/4.1 (legado)
  { prefixo: 'claude-fable', entrada: 5, saida: 25 },
  { prefixo: 'claude-sonnet', entrada: 3, saida: 15 },
  { prefixo: 'claude-haiku-4-5', entrada: 1, saida: 5 },
  { prefixo: 'claude-haiku', entrada: 0.8, saida: 4 },
  // OpenAI
  { prefixo: 'gpt-5.4-mini', entrada: 0.25, saida: 2 },
  { prefixo: 'gpt-5.5', entrada: 1.25, saida: 10 },
  { prefixo: 'gpt-5.4', entrada: 1.25, saida: 10 },
  { prefixo: 'gpt-5', entrada: 1.25, saida: 10 },
]

function precoDe(modelo: string): PrecoModelo | undefined {
  return PRECOS.find((p) => modelo.startsWith(p.prefixo))
}

/** Custo em US$ de um uso medido, ou undefined para modelo sem preço conhecido
 *  (Personalizado/local — nunca inventamos dólar). */
export function custoUsd(modelo: string, uso: UsoTokens): number | undefined {
  const preco = precoDe(modelo)
  if (!preco) return undefined
  return (uso.entrada / 1_000_000) * preco.entrada + (uso.saida / 1_000_000) * preco.saida
}

/** Formata um valor em dólar no padrão pt-BR: "US$ 0,42". */
export function formataUsd(valor: number): string {
  return `US$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Formata contagem de tokens de forma compacta: "1,2 mil" · "3,4 mi". */
export function formataTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (n >= 1_000) return `${(n / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return String(n)
}

// ── Estimativa ANTES de convocar (informação passiva — nunca um gate) ────────
// Tokens médios observados por tipo de chamada numa reunião típica. São
// aproximações honestas: a faixa exibida usa margem de −30% / +50%.
const TOKENS_MEDIOS = { entrada: 3200, saida: 1400 }
/** Peso extra de entrada por anexo (imagem/PDF vai a cada conselheiro em cada chamada). */
const TOKENS_POR_ANEXO = 1600

export interface EstimativaUsd {
  min: number
  max: number
}

/** Faixa estimada em US$ para uma reunião com N chamadas ao modelo dado.
 *  Retorna undefined para modelos sem preço conhecido (mostrar só chamadas). */
export function estimaCustoUsd(opts: {
  modelo: string
  chamadas: number
  anexos?: number
}): EstimativaUsd | undefined {
  const preco = precoDe(opts.modelo)
  if (!preco) return undefined
  const entradaPorChamada = TOKENS_MEDIOS.entrada + (opts.anexos ?? 0) * TOKENS_POR_ANEXO
  const base =
    (opts.chamadas * entradaPorChamada * preco.entrada) / 1_000_000 +
    (opts.chamadas * TOKENS_MEDIOS.saida * preco.saida) / 1_000_000
  return { min: base * 0.7, max: base * 1.5 }
}

/** Formata a faixa estimada: "≈ US$ 0,90–1,40". */
export function formataFaixaUsd(faixa: EstimativaUsd): string {
  const min = faixa.min.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const max = faixa.max.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `≈ US$ ${min}–${max}`
}
