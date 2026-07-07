import Anthropic from '@anthropic-ai/sdk'
import type { ModelId, Transporte } from '../types'

// Thinking adaptativo é suportado no Opus 4.8 e no Sonnet 5.
// No Haiku 4.5 omitimos o parâmetro (modelo não aceita o modo adaptativo).
const SUPORTA_ADAPTIVE: Record<ModelId, boolean> = {
  'claude-opus-4-8': true,
  'claude-sonnet-5': true,
  'claude-haiku-4-5': false,
}

export const MODELOS: { id: ModelId; rotulo: string; detalhe: string }[] = [
  { id: 'claude-opus-4-8', rotulo: 'Claude Opus 4.8', detalhe: 'máxima qualidade (~US$1–2 por reunião)' },
  { id: 'claude-sonnet-5', rotulo: 'Claude Sonnet 5', detalhe: 'equilíbrio (~US$0,30–0,60 por reunião)' },
  { id: 'claude-haiku-4-5', rotulo: 'Claude Haiku 4.5', detalhe: 'rápido e barato (~US$0,10 por reunião)' },
]

function extraiTexto(mensagem: Anthropic.Message): string {
  if (mensagem.stop_reason === 'refusal') {
    throw new Error('A API recusou esta solicitação por política de segurança.')
  }
  const texto = mensagem.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  if (!texto) {
    throw new Error(
      mensagem.stop_reason === 'max_tokens'
        ? 'Resposta truncada por limite de tokens.'
        : 'A API retornou uma resposta vazia.',
    )
  }
  return texto
}

export function criaTransporteApi(apiKey: string, modelo: ModelId): Transporte {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    maxRetries: 3,
  })
  const thinking = SUPORTA_ADAPTIVE[modelo] ? ({ type: 'adaptive' } as const) : undefined

  return {
    async estruturada({ system, user, schema, signal }) {
      const stream = client.messages.stream(
        {
          model: modelo,
          max_tokens: 12000,
          system,
          ...(thinking ? { thinking } : {}),
          output_config: { format: { type: 'json_schema', schema: schema as Record<string, unknown> } },
          messages: [{ role: 'user', content: user }],
        },
        { signal },
      )
      const mensagem = await stream.finalMessage()
      return extraiTexto(mensagem)
    },

    async streamada({ system, user, onDelta, signal }) {
      const stream = client.messages.stream(
        {
          model: modelo,
          max_tokens: 16000,
          system,
          ...(thinking ? { thinking } : {}),
          messages: [{ role: 'user', content: user }],
        },
        { signal },
      )
      stream.on('text', (delta) => onDelta(delta))
      const mensagem = await stream.finalMessage()
      return extraiTexto(mensagem)
    },
  }
}

/** Traduz erros da API para mensagens amigáveis em pt-BR. */
export function mensagemDeErro(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return 'Chave de API inválida. Confira a chave em Configurações.'
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return 'Sua chave de API não tem permissão para este modelo.'
  }
  if (err instanceof Anthropic.NotFoundError) {
    return 'Modelo não encontrado para esta chave de API.'
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Limite de requisições atingido. Aguarde um instante e tente de novo.'
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return 'Falha de conexão com a API. Verifique sua internet.'
  }
  if (err instanceof Anthropic.APIError) {
    return `Erro da API (${err.status ?? '?'}): ${err.message}`
  }
  return err instanceof Error ? err.message : String(err)
}
