import type { Provedor, Transporte } from '../types'
// Só DADOS aqui (sem SDK): os SDKs entram por import() dinâmico em criaTransporte
// e listaModelos, para não pesarem no bundle da home/demo.
import { MODELOS_ANTHROPIC, MODELOS_OPENAI, type InfoModelo } from './modelos'

export type { InfoModelo }

export interface InfoProvedor {
  id: Provedor
  rotulo: string
  descricao: string
  urlChave: string
  placeholderChave: string
  modelos: InfoModelo[]
  /** Base URL: 'nao' (fixa), 'opcional' ou 'obrigatoria'. */
  baseUrl: 'nao' | 'opcional' | 'obrigatoria'
  chaveOpcional?: boolean
}

export const PROVEDORES: InfoProvedor[] = [
  {
    id: 'anthropic',
    rotulo: 'Claude (Anthropic)',
    descricao: 'Modelos Claude — Opus, Sonnet e Haiku.',
    urlChave: 'https://console.anthropic.com/settings/keys',
    placeholderChave: 'sk-ant-…',
    modelos: MODELOS_ANTHROPIC,
    baseUrl: 'nao',
  },
  {
    id: 'openai',
    rotulo: 'OpenAI (GPT / Codex)',
    descricao: 'Modelos GPT da API oficial da OpenAI.',
    urlChave: 'https://platform.openai.com/api-keys',
    placeholderChave: 'sk-…',
    modelos: MODELOS_OPENAI,
    baseUrl: 'opcional',
  },
  {
    id: 'custom',
    rotulo: 'Personalizado — qualquer API',
    descricao:
      'Qualquer API compatível com OpenAI: Ollama local, LM Studio, OpenRouter, Groq, Gemini, Mistral, vLLM…',
    urlChave: '',
    placeholderChave: 'opcional para APIs locais (ex.: Ollama)',
    modelos: [],
    baseUrl: 'obrigatoria',
    chaveOpcional: true,
  },
]

/** Atalhos de Base URL para as APIs mais comuns do provedor personalizado. */
export const PRESETS_BASE_URL: { rotulo: string; url: string; dica?: string }[] = [
  { rotulo: 'Ollama (local)', url: 'http://localhost:11434/v1', dica: "inicie com OLLAMA_ORIGINS='*'" },
  { rotulo: 'LM Studio (local)', url: 'http://localhost:1234/v1' },
  { rotulo: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
  { rotulo: 'Groq', url: 'https://api.groq.com/openai/v1' },
  { rotulo: 'Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai' },
]

export function infoProvedor(id: Provedor): InfoProvedor {
  return PROVEDORES.find((p) => p.id === id) ?? PROVEDORES[0]
}

/** Cria o transporte do provedor — carrega o SDK sob demanda (import dinâmico),
 *  então o bundle inicial (home + demo) não inclui @anthropic-ai/sdk nem openai. */
export async function criaTransporte(
  provedor: Provedor,
  opts: { apiKey: string; modelo: string; baseUrl?: string },
): Promise<Transporte> {
  if (provedor === 'anthropic') {
    const { criaTransporteAnthropic } = await import('./anthropic')
    return criaTransporteAnthropic(opts.apiKey, opts.modelo)
  }
  const { criaTransporteOpenai } = await import('./openai')
  return criaTransporteOpenai({
    apiKey: opts.apiKey,
    modelo: opts.modelo,
    baseUrl: opts.baseUrl || undefined,
    compat: provedor === 'custom',
  })
}

/** Lista os modelos disponíveis na API configurada (para OpenAI e compatíveis). */
export async function listaModelos(
  provedor: Provedor,
  opts: { apiKey: string; baseUrl?: string },
): Promise<string[]> {
  if (provedor === 'anthropic') {
    throw new Error('Use a lista de modelos Claude embutida.')
  }
  const { listaModelosOpenai } = await import('./openai')
  return listaModelosOpenai(opts.apiKey, opts.baseUrl || undefined)
}
