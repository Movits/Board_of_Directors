import type { Provedor, Transporte } from '../types'
import { MODELOS_ANTHROPIC, criaTransporteAnthropic } from './anthropic'
import { MODELOS_OPENAI, criaTransporteOpenai } from './openai'

export interface InfoModelo {
  id: string
  rotulo: string
  detalhe: string
}

export interface InfoProvedor {
  id: Provedor
  rotulo: string
  descricao: string
  urlChave: string
  placeholderChave: string
  modelos: InfoModelo[]
  suportaBaseUrl: boolean
}

export const PROVEDORES: InfoProvedor[] = [
  {
    id: 'anthropic',
    rotulo: 'Claude (Anthropic)',
    descricao: 'Modelos Claude — Opus, Sonnet e Haiku.',
    urlChave: 'https://console.anthropic.com/settings/keys',
    placeholderChave: 'sk-ant-…',
    modelos: MODELOS_ANTHROPIC,
    suportaBaseUrl: false,
  },
  {
    id: 'openai',
    rotulo: 'OpenAI (GPT / Codex)',
    descricao: 'Modelos GPT — e qualquer API compatível com OpenAI (OpenRouter, Groq, Gemini…) via Base URL.',
    urlChave: 'https://platform.openai.com/api-keys',
    placeholderChave: 'sk-…',
    modelos: MODELOS_OPENAI,
    suportaBaseUrl: true,
  },
]

export function infoProvedor(id: Provedor): InfoProvedor {
  return PROVEDORES.find((p) => p.id === id) ?? PROVEDORES[0]
}

export function criaTransporte(
  provedor: Provedor,
  opts: { apiKey: string; modelo: string; baseUrl?: string },
): Transporte {
  if (provedor === 'openai') {
    return criaTransporteOpenai(opts.apiKey, opts.modelo, opts.baseUrl || undefined)
  }
  return criaTransporteAnthropic(opts.apiKey, opts.modelo)
}
